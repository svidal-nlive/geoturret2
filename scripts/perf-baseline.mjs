#!/usr/bin/env node
/**
 * Performance baseline collection script (Phase 1 scaffold).
 * Gathers per-system timing stats over a fixed frame budget for multiple seeds
 * using the pooled harness profiling API, then derives preliminary thresholds.
 *
 * Usage: node scripts/perf-baseline.mjs [--frames 2000] [--seeds a,b,c,d,e] [--kind bullet|enemy] [--hist-bins 256] [--hist-cap 2]
 * Histogram notes: timings are bucketed into fixed bins from 0..cap seconds (default cap=2s). Samples above cap are clamped into the last bin.
 * Outputs JSON to stdout and writes to ./perf-baseline.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { patchEsmImports } from './esm-import-patch.mjs';

async function ensureBuild() {
  const outDir = path.resolve('dist-baseline');
  if (!fs.existsSync(outDir)) {
    console.error('[perf-baseline] Building minimal sources to dist-baseline ...');
    execSync('npx tsc -p tsconfig.baseline.json', { stdio: 'inherit' });
  }
  patchEsmImports(outDir);
  const harnessMod = await import(path.join(outDir, 'testUtils/poolHarness.js'));
  return harnessMod.createPooledHarness;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { frames: 2000, seeds: ['a','b','c','d','e'], kind: 'bullet', histBins: 256, histCap: 2, robustSpike: false, spikeTrim: 1 };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--frames') out.frames = Number(args[++i]||out.frames);
    else if (a === '--seeds') out.seeds = (args[++i]||'').split(',').filter(Boolean);
    else if (a === '--kind') out.kind = args[++i]||out.kind;
    else if (a === '--hist-bins') out.histBins = Number(args[++i]||out.histBins);
    else if (a === '--hist-cap') out.histCap = Number(args[++i]||out.histCap);
    else if (a === '--robust-spike') out.robustSpike = true;
    else if (a === '--spike-trim') out.spikeTrim = Number(args[++i]||out.spikeTrim);
  }
  return out;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length-1, Math.floor(p * (sorted.length-1)));
  return sorted[idx];
}

function makePercentileFromHist(hist) {
  const { counts, binWidth, total } = hist;
  if (!total) return p=>0;
  const cumulative = new Array(counts.length);
  let run = 0;
  for (let i=0;i<counts.length;i++) { run += counts[i]; cumulative[i]=run; }
  return function(p) {
    if (total === 1) return hist.minObserved;
    const target = p * (total-1);
    // binary search cumulative
    let lo=0, hi=counts.length-1, idx=counts.length-1;
    while (lo<=hi) {
      const mid = (lo+hi)>>1;
      if (cumulative[mid]-1 >= target) { idx=mid; hi=mid-1; } else lo=mid+1;
    }
    const prevCum = idx === 0 ? 0 : cumulative[idx-1];
    const countInBin = counts[idx];
    const within = countInBin ? (target - prevCum) / countInBin : 0;
    // Use left edge + within * binWidth
    return idx * binWidth + within * binWidth;
  };
}

function deriveThreshold(sys, robustOpts) {
  // sys has streaming stats: count, sum, sumSquares, minObserved, maxObserved, hist
  const { count, sum, sumSquares, minObserved: min, maxObserved: rawMax, hist, topSamples } = sys;
  if (!count) return { avg:0,min:0,max:0,p90:0,p95:0,p99:0,std:0,avgThreshold:0,spikeThreshold:0 };
  const avg = sum / count;
  const variance = (sumSquares / count) - avg*avg;
  const std = variance > 0 ? Math.sqrt(variance) : 0;
  const pct = makePercentileFromHist(hist);
  const p90 = pct(0.90);
  const p95 = pct(0.95);
  const p99 = pct(0.99);
  // Determine trimmed max if robust mode enabled
  let max = rawMax;
  let trimmed = [];
  if (robustOpts?.robustSpike && topSamples && topSamples.length > robustOpts.spikeTrim) {
    // topSamples kept descending; skip first spikeTrim entries
    trimmed = topSamples.slice(0, robustOpts.spikeTrim);
    max = topSamples[robustOpts.spikeTrim];
  }
  const avgThreshold = +(Math.max(p95*1.25, avg + 3*std)).toFixed(4);
  const tailRatio = p99 > 0 ? max / p99 : 1;
  let maxMult = 1.5;
  if (tailRatio > 10) maxMult = 2;
  if (tailRatio > 20) maxMult = 3;
  if (tailRatio > 40) maxMult = 5;
  if (tailRatio > 60) maxMult = 7;
  if (tailRatio > 80) maxMult = 9;
  if (tailRatio > 120) maxMult = 12;
  const spikeThreshold = +(Math.max(p99*1.1, p95*1.5, max*maxMult)).toFixed(4);
  return { avg, min, max, rawMax, trimmedTop: trimmed, p90, p95, p99, std, avgThreshold, spikeThreshold };
}

// Dynamic histogram helper: supports on-the-fly cap expansion with approximate re-binning.
function createDynamicHist(binCount, initialCap) {
  return {
    counts: new Array(binCount).fill(0),
    binWidth: initialCap / binCount,
    cap: initialCap,
    total: 0,
    expand(newCap) {
      const oldCounts = this.counts;
      const oldBinWidth = this.binWidth;
      const oldCap = this.cap;
      this.cap = newCap;
      this.binWidth = this.cap / oldCounts.length;
      this.counts = new Array(oldCounts.length).fill(0);
      for (let i=0;i<oldCounts.length;i++) {
        if (!oldCounts[i]) continue;
        // map old bin center to new bin index
        const center = (i + 0.5) * oldBinWidth;
        let ni = Math.floor(center / this.binWidth);
        if (ni >= this.counts.length) ni = this.counts.length - 1;
        this.counts[ni] += oldCounts[i];
      }
    },
    addSample(v) {
      if (v > this.cap) {
        // expand so sample is within ~90% of range
        const targetCap = v * 1.25;
        this.expand(targetCap);
      }
      let bin = Math.floor(v / this.binWidth);
      if (bin >= this.counts.length) bin = this.counts.length - 1;
      this.counts[bin]++;
      this.total++;
    }
  };
}

async function run() {
  const opts = parseArgs();
  const aggregate = { meta: { frames: opts.frames, seeds: opts.seeds, kind: opts.kind, timestamp: new Date().toISOString(), histBins: opts.histBins, histCap: opts.histCap }, systems: {}, memory: { perSeed: [] } };
  const createPooledHarness = await ensureBuild();
  for (const seed of opts.seeds) {
    const memStart = process.memoryUsage?.().heapUsed ?? 0;
    const h = createPooledHarness(opts.kind, `baseline-${seed}`, 32, { profiler: true });
    h.spawnUntil(12); // small workload
    // Streaming histogram collection
    for (let f=0; f<opts.frames; f++) {
      h.orchestrator.advance(h.step); // advance one frame
      const prof = h.orchestrator.getMetrics().profiling;
      if (prof) {
        for (const [id, ms] of Object.entries(prof)) {
          let sys = aggregate.systems[id];
          if (!sys) {
            sys = aggregate.systems[id] = {
              count: 0,
              sum: 0,
              sumSquares: 0,
              minObserved: Number.POSITIVE_INFINITY,
              maxObserved: 0,
              hist: createDynamicHist(opts.histBins, opts.histCap)
            };
          }
          const v = ms;
            sys.count++;
            sys.sum += v;
            sys.sumSquares += v*v;
            if (v < sys.minObserved) sys.minObserved = v;
            if (v > sys.maxObserved) sys.maxObserved = v;
            // Maintain top samples (descending) up to spikeTrim+5 for robustness.
            if (!sys.topSamples) sys.topSamples = [];
            const cap =  (globalThis.__robustSpikeConfig?.spikeTrim || 1) + 5;
            // Insert while keeping desc order
            const arr = sys.topSamples;
            if (arr.length === 0 || v >= arr[arr.length-1] || arr.length < cap) {
              // simple insertion sort
              let inserted = false;
              for (let j=0;j<arr.length;j++) {
                if (v > arr[j]) { arr.splice(j,0,v); inserted = true; break; }
              }
              if (!inserted) arr.push(v);
              if (arr.length > cap) arr.length = cap;
            }
            sys.hist.addSample(v);
        }
      }
    }
  if (global.gc) { try { global.gc(); } catch {} }
  const memEnd = process.memoryUsage?.().heapUsed ?? memStart;
  aggregate.memory.perSeed.push({ seed, startBytes: memStart, endBytes: memEnd, deltaBytes: memEnd - memStart });
  }
  // Derive thresholds
  const output = { meta: aggregate.meta, systems: {}, thresholds: {} };
  // Provide robust config globally for streaming top sample capture
  globalThis.__robustSpikeConfig = { robustSpike: opts.robustSpike, spikeTrim: opts.spikeTrim };
  for (const [id, data] of Object.entries(aggregate.systems)) {
    const stats = deriveThreshold(data, { robustSpike: opts.robustSpike, spikeTrim: opts.spikeTrim });
    output.systems[id] = { ...stats, hist: { bins: data.hist.counts, binWidth: data.hist.binWidth, cap: opts.histCap }, robustSpike: opts.robustSpike, spikeTrim: opts.spikeTrim };
    output.thresholds[id] = { avg: stats.avgThreshold, spike: stats.spikeThreshold };
  }
  // Memory thresholds
  if (aggregate.memory.perSeed.length) {
    const deltas = aggregate.memory.perSeed.map(r => r.deltaBytes);
    const maxDelta = Math.max(...deltas);
    const avgDelta = deltas.reduce((a,b)=>a+b,0)/deltas.length;
    const thresholdDelta = Math.max(maxDelta * 1.5, maxDelta + 50_000); // cushion
    // Build a histogram of positive deltas (growth). Negative deltas (GC release) are bucketed into bin 0 separately.
    const positive = deltas.filter(d=>d>0);
    const posMax = positive.length ? Math.max(...positive) : 0;
    const bins = 32;
    const cap = posMax ? posMax * 1.1 + 1024 : 1024; // small buffer / min cap 1KB
    const binWidth = Math.ceil(cap / bins);
    const counts = new Array(bins).fill(0);
    for (const d of deltas) {
      if (d <= 0) { counts[0]++; continue; }
      let idx = Math.floor(d / binWidth);
      if (idx >= bins) idx = bins-1;
      counts[idx]++;
    }
    // Percentiles for growth distribution (ignore negative for percentile target)
    function percentileFromCounts(p) {
      if (!positive.length) return 0;
      const target = p * (positive.length - 1);
      // Build cumulative over positive-only counts (skip bin0 negative bucket)
      let run = 0; let value = 0; let passed = 0;
      for (let i=0;i<counts.length;i++) {
        const c = counts[i];
        // Skip negatives (bin 0 entries that came from <=0 deltas)
        const isNegBin = i===0;
        const effective = isNegBin ? positive.length===deltas.length?c: c - (deltas.length - positive.length) : c; // subtract negatives in bin0
        const add = Math.max(0, isNegBin ? effective : c);
        if (add>0) {
          if (run + add - 1 >= target) {
            const within = (target - run) / add;
            value = i * binWidth + within * binWidth;
            break;
          }
          run += add;
        }
      }
      return value;
    }
    const memP90 = percentileFromCounts(0.90);
    const memP95 = percentileFromCounts(0.95);
    const memP99 = percentileFromCounts(0.99);
    // Derive per-seed growth thresholds if we have enough positive samples
    let growthP95Thr, growthP99Thr;
    if (positive.length >= 2) {
      growthP95Thr = Math.ceil(memP95 * 1.5 + 2048); // 50% headroom + 2KB
      growthP99Thr = Math.ceil(memP99 * 1.2 + 4096); // 20% over extreme + 4KB
    }
    output.memory = { perSeed: aggregate.memory.perSeed, avgDeltaBytes: avgDelta, maxDeltaBytes: maxDelta, thresholdDeltaBytes: thresholdDelta, histogram: { bins: counts, binWidth, cap, positiveCount: positive.length, p90: memP90, p95: memP95, p99: memP99 } };
    output.thresholds.memory = { delta: thresholdDelta };
    if (growthP95Thr) output.thresholds.memory.growthP95 = growthP95Thr;
    if (growthP99Thr) output.thresholds.memory.growthP99 = growthP99Thr;
  }
  const file = path.resolve(process.cwd(), 'perf-baseline.json');
  fs.writeFileSync(file, JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
  console.error(`[perf-baseline] Wrote ${file}`);
}

run().catch(e=>{ console.error(e); process.exit(1); });
