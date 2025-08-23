#!/usr/bin/env node
/**
 * Performance threshold enforcement script.
 * Compares current run metrics against thresholds in perf-baseline.json.
 *
 * Usage: npm run perf:check -- [--frames 600] [--seeds a,b,c] [--kind bullet] [--baseline perf-baseline.json]
 * Env:
 *   PERF_MARGIN   (multiplier applied to thresholds, default 1.0)
 *   PERF_SHOW_SAMPLES (truthy to include limited sample dump)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { frames: 600, seeds: ['a','b','c'], kind: 'bullet', baseline: 'perf-baseline.json' };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--frames') out.frames = Number(args[++i]||out.frames);
    else if (a === '--seeds') out.seeds = (args[++i]||'').split(',').filter(Boolean);
    else if (a === '--kind') out.kind = args[++i]||out.kind;
    else if (a === '--baseline') out.baseline = args[++i]||out.baseline;
  }
  return out;
}

async function ensureBuild() {
  const outDir = path.resolve('dist-baseline');
  function patchDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) patchDir(p); else if (p.endsWith('.js')) {
        const txt = fs.readFileSync(p, 'utf8');
        let updated = txt.replace(/from\s+(['"])(\.\.?\/[^'";]+)\1/g, (m, q, spec) => spec.endsWith('.js')?m:`from ${q}${spec}.js${q}`);
        updated = updated.replace(/import\s+(['"])(\.\.?\/[^'";]+)\1/g, (m, q, spec) => spec.endsWith('.js')?m:`import ${q}${spec}.js${q}`);
        if (updated !== txt) fs.writeFileSync(p, updated);
      }
    }
  }
  if (!fs.existsSync(outDir)) {
    console.error('[perf-check] Building minimal sources to dist-baseline ...');
    execSync('npx tsc -p tsconfig.baseline.json', { stdio: 'inherit' });
    patchDir(outDir);
  } else patchDir(outDir);
  const harnessMod = await import(path.join(outDir, 'testUtils/poolHarness.js'));
  return harnessMod.createPooledHarness;
}

function computeStats(samples) {
  if (!samples.length) return { avg:0, max:0, p95:0 };
  const avg = samples.reduce((a,b)=>a+b,0)/samples.length;
  let max = 0; for (const v of samples) if (v>max) max=v;
  const sorted = [...samples].sort((a,b)=>a-b);
  const p95 = sorted[Math.min(sorted.length-1, Math.floor(0.95*(sorted.length-1)))];
  return { avg, max, p95 };
}

function loadBaseline(file) {
  if (!fs.existsSync(file)) throw new Error(`Baseline file not found: ${file}. Run perf:baseline first.`);
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

async function run() {
  const args = parseArgs();
  const baseline = loadBaseline(args.baseline);
  const margin = Number(process.env.PERF_MARGIN || '1');
  const createPooledHarness = await ensureBuild();
  const aggregated = {}; // system -> samples array
  const mem = { start: process.memoryUsage?.().heapUsed ?? 0, end: 0 };
  for (const seed of args.seeds) {
    const h = createPooledHarness(args.kind, `check-${seed}`, 32, { profiler: true });
    h.spawnUntil(12);
    for (let f=0; f<args.frames; f++) {
      h.orchestrator.advance(h.step);
      const prof = h.orchestrator.getMetrics().profiling;
      if (prof) {
        for (const [id, ms] of Object.entries(prof)) (aggregated[id] ||= []).push(ms);
      }
    }
    if (global.gc) { try { global.gc(); } catch {} }
  }
  mem.end = process.memoryUsage?.().heapUsed ?? mem.start;
  const report = { systems: {}, violations: [], memory: {} };
  for (const [id, samples] of Object.entries(aggregated)) {
    const stats = computeStats(samples);
    const base = baseline.thresholds[id];
    if (base) {
      const avgLimit = base.avg * margin;
      const spikeLimit = base.spike * margin;
      const avgOk = stats.avg <= avgLimit;
      const spikeOk = stats.max <= spikeLimit;
      report.systems[id] = { ...stats, avgLimit, spikeLimit, avgOk, spikeOk };
      if (!avgOk) report.violations.push({ id, type:'avg', value:stats.avg, limit:avgLimit });
      if (!spikeOk) report.violations.push({ id, type:'spike', value:stats.max, limit:spikeLimit });
    } else {
      report.systems[id] = { ...stats, note: 'no-baseline' };
    }
  }
  for (const baselineId of Object.keys(baseline.thresholds)) {
    if (!report.systems[baselineId]) report.systems[baselineId] = { missingInRun: true };
  }
  // Memory enforcement (optional if baseline has memory threshold)
  if (baseline.thresholds.memory?.delta) {
    const delta = mem.end - mem.start;
    const limit = baseline.thresholds.memory.delta * margin;
    report.memory = { startBytes: mem.start, endBytes: mem.end, deltaBytes: delta, limitBytes: limit, ok: delta <= limit };
    if (delta > limit) report.violations.push({ id:'memory', type:'delta', value: delta, limit });
    // Per-seed growth checks (rerun seeds quickly for growth measurement if thresholds exist)
    const g95 = baseline.thresholds.memory.growthP95;
    const g99 = baseline.thresholds.memory.growthP99;
    if (g95 || g99) {
      const perSeedGrowth = [];
      // Re-profile minimal frames per seed for memory growth snapshot (reuse existing run would require per-seed tracking, so do a light pass)
      for (const seed of args.seeds) {
        const h = createPooledHarness(args.kind, `memgrowth-${seed}`, 32, { profiler: false });
        const start = process.memoryUsage?.().heapUsed ?? 0;
        h.spawnUntil(12);
        for (let f=0; f<Math.min(200, args.frames); f++) h.orchestrator.advance(h.step);
        if (global.gc) { try { global.gc(); } catch {} }
        const end = process.memoryUsage?.().heapUsed ?? start;
        perSeedGrowth.push(end - start);
      }
      report.memory.perSeedGrowth = perSeedGrowth;
      if (g95) {
        for (const g of perSeedGrowth) if (g > g95 * margin) { report.violations.push({ id:'memory', type:'growthP95', value:g, limit:g95*margin }); break; }
      }
      if (g99) {
        for (const g of perSeedGrowth) if (g > g99 * margin) { report.violations.push({ id:'memory', type:'growthP99', value:g, limit:g99*margin }); break; }
      }
    }
  }
  const json = JSON.stringify(report,null,2);
  console.log(json);
  if (process.env.PERF_SHOW_SAMPLES) {
    for (const [id, samples] of Object.entries(aggregated)) {
      console.log(`[samples:${id}]`, samples.slice(0,50).map(v=>v.toFixed(4)).join(','), samples.length>50?'...':'');
    }
  }
  if (report.violations.length) {
    console.error('[perf-check] FAIL Violations:', report.violations.map(v=>`${v.id}:${v.type} ${v.value.toFixed(4)}>${v.limit.toFixed(4)}`).join(', '));
    process.exit(1);
  } else {
    console.error('[perf-check] PASS');
  }
}

run().catch(e=>{ console.error(e); process.exit(1); });
