#!/usr/bin/env node
/**
 * Compares current boss perf attribution metrics against committed baseline thresholds.
 * Fails CI if thresholds exceeded. Optionally updates baseline when improvements occur (serializePct decreases).
 */
import fs from 'fs';
import { spawnSync } from 'child_process';

function runAttrib(extraEnv={}) {
  const env = { ...process.env, ...extraEnv };
  const r = spawnSync('npx', ['--yes','tsx','scripts/boss-perf-attrib.ts'], {encoding:'utf8', env});
  if (r.status !== 0) {
    console.error('[boss-perf-check] attrib script failed', r.stderr || r.stdout);
    process.exit(1);
  }
  try { return JSON.parse(r.stdout.trim()); } catch(e){
    console.error('[boss-perf-check] failed to parse JSON', r.stdout);
    process.exit(1);
  }
}

const baselinePath = 'artifacts/boss-perf-baseline.json';
if (!fs.existsSync(baselinePath)) {
  console.error('[boss-perf-check] Missing baseline at', baselinePath);
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath,'utf8'));
const thresholds = baseline.thresholds || { serializePctMax: 35, avgUpdateMsMax: 0.01 };

function stddev(samples, field) {
  if (!samples.length) return 0;
  const vals = samples.map(s=>s[field]);
  const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
  const variance = vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length;
  return Math.sqrt(variance);
}

// Use pinned matrix from baseline if present; otherwise fall back to env/default heuristic.
const pinnedPatterns = baseline.matrix?.patterns;
const pinnedSeeds = baseline.matrix?.seeds;
const patternList = (process.env.BOSS_PERF_PATTERNS ? process.env.BOSS_PERF_PATTERNS.split(',') : (pinnedPatterns || `${baseline.pattern},spiral-barrage`.split(','))).filter(Boolean);
const seedList = (process.env.BOSS_PERF_SEEDS ? process.env.BOSS_PERF_SEEDS.split(',') : (pinnedSeeds || `${baseline.seed},alt-seed`.split(','))).filter(Boolean);

// Statistical retry configuration
const retrySamples = baseline.rotation?.retrySamples || 1;
const aggregateMode = baseline.rotation?.aggregation || 'median';

function aggregate(samples, field) {
  const vals = samples.map(s => s[field]).sort((a,b)=>a-b);
  if (aggregateMode === 'median') {
    const mid = Math.floor(vals.length/2);
    return vals.length % 2 ? vals[mid] : (vals[mid-1]+vals[mid])/2;
  } else if (aggregateMode === 'mean') {
    return vals.reduce((a,b)=>a+b,0)/vals.length;
  }
  return vals[vals.length-1]; // fallback highest
}

const results = [];
let worstSerializePct = -Infinity;
let worstAvgUpdateMs = -Infinity;
let fail = false;
for (const pat of patternList) {
  for (const seed of seedList) {
    const samples = [];
    for (let i=0;i<retrySamples;i++) samples.push(runAttrib({ PATTERN: pat, SEED: seed }));
    // Build aggregated result object
  const agg = { pattern: pat, seed, samples, serializePct: aggregate(samples,'serializePct'), avgUpdateMs: aggregate(samples,'avgUpdateMs'), updateMs: aggregate(samples,'updateMs'), serializeMs: aggregate(samples,'serializeMs'), frames: samples[0].frames };
  agg.serializePctStdDev = +stddev(samples,'serializePct').toFixed(4);
  agg.avgUpdateMsStdDev = +stddev(samples,'avgUpdateMs').toFixed(6);
    // If scriptMetrics present, aggregate simple numeric fields by median/mean as well.
    const scriptSamples = samples.map(s=>s.scriptMetrics).filter(Boolean);
    if (scriptSamples.length === samples.length) {
      const numericKeys = Object.keys(scriptSamples[0]).filter(k => typeof scriptSamples[0][k] === 'number');
      const scriptAgg = {};
      for (const k of numericKeys) {
        scriptAgg[k] = aggregate(scriptSamples, k);
        const sd = stddev(scriptSamples, k);
        scriptAgg[`${k}StdDev`] = +sd.toFixed(typeof scriptSamples[0][k] === 'number' && scriptSamples[0][k] < 1 ? 6 : 3);
      }
      agg.scriptMetrics = scriptAgg;
    }
    results.push(agg);
    if (agg.serializePct > thresholds.serializePctMax) {
      console.error(`[boss-perf] serializePct ${agg.serializePct} > max ${thresholds.serializePctMax} (pattern=${pat} seed=${seed})`);
      fail = true;
    }
    if (agg.avgUpdateMs > thresholds.avgUpdateMsMax) {
      console.error(`[boss-perf] avgUpdateMs ${agg.avgUpdateMs} > max ${thresholds.avgUpdateMsMax} (pattern=${pat} seed=${seed})`);
      fail = true;
    }
    if (thresholds.serializePctStdDevMax != null && agg.serializePctStdDev > thresholds.serializePctStdDevMax) {
      console.error(`[boss-perf] serializePct stddev ${agg.serializePctStdDev} > max ${thresholds.serializePctStdDevMax} (pattern=${pat} seed=${seed})`);
      fail = true;
    }
    if (thresholds.avgUpdateMsStdDevMax != null && agg.avgUpdateMsStdDev > thresholds.avgUpdateMsStdDevMax) {
      console.error(`[boss-perf] avgUpdateMs stddev ${agg.avgUpdateMsStdDev} > max ${thresholds.avgUpdateMsStdDevMax} (pattern=${pat} seed=${seed})`);
      fail = true;
    }
    if (agg.serializePct > worstSerializePct) worstSerializePct = agg.serializePct;
    if (agg.avgUpdateMs > worstAvgUpdateMs) worstAvgUpdateMs = agg.avgUpdateMs;
  }
}

// Improvement auto-update only considers the baseline pattern+seed pair and only if both metrics improved.
const baselineRes = results.find(r => r.pattern === baseline.pattern && r.seed === baseline.seed);
const allowRotation = process.env[baseline.rotation?.autoUpdateRequiresEnv || 'PERF_ALLOW_ROTATION'] === '1';
if (!fail && allowRotation && baselineRes && baselineRes.serializePct < baseline.serializePct && baselineRes.avgUpdateMs <= thresholds.avgUpdateMsMax) {
  const updated = { ...baselineRes, thresholds, matrix: baseline.matrix, rotation: baseline.rotation };
  // Flatten aggregated fields for baseline (keep representative metrics, drop samples to keep file lean)
  delete updated.samples;
  fs.writeFileSync(baselinePath, JSON.stringify(updated,null,2)+'\n');
  console.log('[boss-perf] Improvement detected for baseline pattern. Baseline updated (rotation env gate satisfied).');
} else if (!allowRotation) {
  console.log('[boss-perf] Auto-rotation skipped (env gate not set).');
}

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/boss-perf-matrix.json', JSON.stringify({ thresholds, results }, null, 2));

if (fail) {
  console.error('[boss-perf] FAIL');
  process.exit(1);
}
console.log('[boss-perf] OK across patterns');
