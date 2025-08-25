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
  const out = { frames: 600, seeds: ['a','b','c'], kind: 'bullet', baseline: 'perf-baseline.json', warmup: 0, inspectPools: false, inspectEvery: 100, robustSpike: false, spikeTrim: 1 };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--frames') out.frames = Number(args[++i]||out.frames);
    else if (a === '--seeds') out.seeds = (args[++i]||'').split(',').filter(Boolean);
    else if (a === '--kind') out.kind = args[++i]||out.kind;
    else if (a === '--baseline') out.baseline = args[++i]||out.baseline;
    else if (a === '--warmup') out.warmup = Number(args[++i]||out.warmup);
  else if (a === '--inspect-pools') out.inspectPools = true;
  else if (a === '--inspect-every') out.inspectEvery = Number(args[++i]||out.inspectEvery);
  else if (a === '--robust-spike') out.robustSpike = true;
  else if (a === '--spike-trim') out.spikeTrim = Number(args[++i]||out.spikeTrim);
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
  if (!samples.length) return { avg:0, max:0, p95:0, top:[] };
  const avg = samples.reduce((a,b)=>a+b,0)/samples.length;
  let max = 0, second = 0; for (const v of samples) { if (v>max) { second = max; max=v; } else if (v>second && v<max) second=v; }
  const sorted = [...samples].sort((a,b)=>a-b);
  const p95 = sorted[Math.min(sorted.length-1, Math.floor(0.95*(sorted.length-1)))];
  // capture top few values for reporting / trimming decisions
  const top = sorted.slice(-5).reverse();
  return { avg, max, p95, second, top };
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
  const aggregated = {}; // system -> { values: number[], meta: { seed:string, frame:number }[] }
  // Per-seed memory deltas (enforced) instead of one cumulative delta which compounded growth across seeds.
  const perSeedMem = [];
  const poolSnapshots = [];
  for (const seed of args.seeds) {
    // 1. Memory measurement pass (no profiler, no sample arrays) to mirror baseline's low-overhead aggregation.
    const memStart = process.memoryUsage?.().heapUsed ?? 0;
    const memHarness = createPooledHarness(args.kind, `mem-${seed}`, 32, { profiler: false });
    memHarness.spawnUntil(12);
    for (let f=0; f<args.frames; f++) memHarness.orchestrator.advance(memHarness.step);
    if (global.gc) { try { global.gc(); } catch {} }
    const memEnd = process.memoryUsage?.().heapUsed ?? memStart;
    perSeedMem.push(memEnd - memStart);
    // 2. Profiling pass (separate harness) collects timing samples (excluded from memory delta).
    if (global.gc) { try { global.gc(); } catch {} }
    const h = createPooledHarness(args.kind, `check-${seed}`, 32, { profiler: true });
    h.spawnUntil(12);
    for (let f=0; f<args.frames; f++) {
      h.orchestrator.advance(h.step);
      const prof = h.orchestrator.getMetrics().profiling;
      if (prof) {
        for (const [id, ms] of Object.entries(prof)) {
          const rec = (aggregated[id] ||= { values: [], meta: [] });
          if (f >= args.warmup) {
            rec.values.push(ms);
            rec.meta.push({ seed, frame: f });
          }
        }
      }
      if (args.inspectPools && f % args.inspectEvery === 0) {
        const bs = h.state.bulletPool.stats();
        const es = h.state.enemyPool.stats();
        poolSnapshots.push({ seed, frame: f, bulletPool: bs, enemyPool: es, bullets: h.state.bullets.length, enemies: h.state.enemies.length });
      }
    }
    if (global.gc) { try { global.gc(); } catch {} }
  }
  const report = { systems: {}, violations: [], memory: {} };
  for (const [id, record] of Object.entries(aggregated)) {
    const samples = record.values;
    const stats = computeStats(samples);
    const base = baseline.thresholds[id];
    if (base) {
      const avgLimit = base.avg * margin;
      const spikeLimit = base.spike * margin;
      const avgOk = stats.avg <= avgLimit;
      // Robust spike handling: optionally trim top N samples before evaluating.
      let spikeValue = stats.max;
      let trimmed = [];
      if (args.robustSpike && samples.length > args.spikeTrim) {
        // Instead of sorting entire array again, reuse stats.top if spikeTrim small; fallback to sort for generality.
        const sortedDesc = [...samples].sort((a,b)=>b-a);
        trimmed = sortedDesc.slice(0, args.spikeTrim);
        spikeValue = sortedDesc[args.spikeTrim];
      }
      const spikeOk = spikeValue <= spikeLimit;
      report.systems[id] = { avg: stats.avg, max: stats.max, p95: stats.p95, top: stats.top, trimmedTop: trimmed, spikeUsed: spikeValue, avgLimit, spikeLimit, avgOk, spikeOk, warmupSkipped: args.warmup, robustSpike: args.robustSpike, spikeTrim: args.robustSpike ? args.spikeTrim : 0 };
      if (!avgOk) report.violations.push({ id, type:'avg', value:stats.avg, limit:avgLimit });
      if (!spikeOk) report.violations.push({ id, type:'spike', value:spikeValue, limit:spikeLimit, rawMax: stats.max, trimmedTop: trimmed });
    } else {
      report.systems[id] = { ...stats, note: 'no-baseline' };
    }
  }
  for (const baselineId of Object.keys(baseline.thresholds)) {
    if (!report.systems[baselineId]) report.systems[baselineId] = { missingInRun: true };
  }
  // Memory enforcement (per-seed). Baseline delta threshold represents a max acceptable growth per seed run.
  if (baseline.thresholds.memory?.delta) {
    const limit = baseline.thresholds.memory.delta * margin;
    // Flag any seed exceeding limit
    const memViolations = perSeedMem.filter(d => d > limit);
    const maxDelta = perSeedMem.length ? Math.max(...perSeedMem) : 0;
    report.memory = { perSeedDeltas: perSeedMem, perSeedLimit: limit, maxPerSeedDelta: maxDelta, ok: memViolations.length === 0 };
    if (memViolations.length) {
      report.violations.push({ id:'memory', type:'delta', value: maxDelta, limit });
    }
    // Growth distribution thresholds (reuse quick secondary pass only if needed)
    const g95 = baseline.thresholds.memory.growthP95;
    const g99 = baseline.thresholds.memory.growthP99;
    if (g95 || g99) {
      const perSeedGrowth = [];
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
  if (args.inspectPools) report.poolSnapshots = poolSnapshots;
  const json = JSON.stringify(report,null,2);
  console.log(json);
  if (process.env.PERF_SHOW_SAMPLES) {
    for (const [id, record] of Object.entries(aggregated)) {
      console.log(`[samples:${id}]`, record.values.slice(0,50).map(v=>v.toFixed(4)).join(','), record.values.length>50?'...':'');
    }
  }
  if (process.env.PERF_SHOW_SPIKES) {
    const topK = Number(process.env.PERF_SHOW_SPIKES) || 5;
    const minSpike = Number(process.env.PERF_SPIKE_MIN || '0');
    for (const [id, record] of Object.entries(aggregated)) {
      const spikes = record.values.map((v,i)=>({ v, i })).filter(p=>p.v >= minSpike).sort((a,b)=>b.v-a.v).slice(0, topK);
      if (spikes.length) {
        console.log(`[spikes:${id}] top ${spikes.length}`);
        for (const { v, i } of spikes) {
          const meta = record.meta[i];
          if (meta) console.log(`  value=${v.toFixed(6)} seed=${meta.seed} frame=${meta.frame}`);
        }
      }
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
