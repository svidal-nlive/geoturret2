#!/usr/bin/env node
/**
 * Size Regression Guard
 * 1. Builds minimal prod bundle (delegates to npm run size:build if dist/size-check.js missing)
 * 2. Computes gzip size (KB)
 * 3. Reads baseline from size-baseline.json (created if absent) or existing size-badge.svg (fallback parse)
 * 4. Fails (exit 1) if growth > allowed threshold (default 5% or absolute 5KB, whichever smaller) unless SIZE_ALLOW_REGRESSION override provided
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { build } from 'esbuild';

const BUNDLE = 'dist/size-check.js';
function selectEntry() {
  const candidates = [process.env.SIZE_ENTRY, 'src/size-entry.ts', 'src/sizeEntry.ts', 'src/main.ts'].filter(Boolean);
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return 'src/main.ts';
}
const ENTRY = selectEntry();
const BASELINE_FILE = 'size-baseline.json';
const ABS_LIMIT_KB = 5; // absolute cushion
const PCT_LIMIT = 0.05; // 5%

async function ensureBundle() {
  // Always rebuild to capture current tree (fast, <100ms) and produce metafile for diagnostics
  const start = Date.now();
  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    minify: true,
    format: 'esm',
    sourcemap: true,
    outfile: BUNDLE,
    metafile: true,
    define: { 'process.env.NODE_ENV': '"production"' }
  });
  const dur = Date.now() - start;
  try { fs.writeFileSync('dist/size-meta.json', JSON.stringify(result.metafile, null, 2)); } catch {}
  return { metafile: result.metafile, ms: dur };
}

function currentGzipKb() {
  const buf = fs.readFileSync(BUNDLE);
  const gz = zlib.gzipSync(buf);
  return +(gz.length/1024).toFixed(2);
}

function loadBaseline() {
  if (fs.existsSync(BASELINE_FILE)) {
    try { return JSON.parse(fs.readFileSync(BASELINE_FILE,'utf8')).gzipKb; } catch {}
  }
  // Fallback attempt: parse from size-badge.svg
  if (fs.existsSync('size-badge.svg')) {
    const svg = fs.readFileSync('size-badge.svg','utf8');
    const m = svg.match(/size ([0-9]+\.[0-9]+) KB/);
    if (m) return +m[1];
  }
  return null;
}

function saveBaseline(kb) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ gzipKb: kb, updated: new Date().toISOString() }, null, 2));
  console.log('[size-regression] wrote baseline', kb+'KB');
}

async function main() {
  console.log('[size-regression] entry', ENTRY);
  const buildInfo = await ensureBundle();
  const cur = currentGzipKb();
  const baseline = loadBaseline();
  if (baseline == null) {
    console.log('[size-regression] no baseline found; creating with current', cur+'KB');
    saveBaseline(cur);
    return;
  }
  const diff = +(cur - baseline).toFixed(2);
  const pct = baseline ? +(diff / baseline).toFixed(4) : 0;
  const allowOverride = !!process.env.SIZE_ALLOW_REGRESSION;
  const absFail = diff > ABS_LIMIT_KB;
  const pctFail = pct > PCT_LIMIT;
  const fail = (absFail || pctFail) && !allowOverride;
  console.log(`[size-regression] baseline=${baseline}KB current=${cur}KB diff=${diff}KB pct=${(pct*100).toFixed(2)}%`);
  if (fail) {
    console.error('[size-regression] Size regression exceeded limits (abs>'+ABS_LIMIT_KB+'KB || pct>'+(PCT_LIMIT*100)+'%)');
    console.error('Set SIZE_ALLOW_REGRESSION=1 to bypass (will update baseline).');
    // Emit top contributors for quick triage using metafile if available
    try {
      const meta = buildInfo.metafile;
      if (meta && meta.inputs) {
        const entries = Object.entries(meta.inputs).map(([k,v]) => [k, v.bytes]).sort((a,b)=>b[1]-a[1]).slice(0,12);
        const total = entries.reduce((s,[,b])=>s+b,0);
        console.error('[size-regression] Top contributors (bytes):');
        for (const [file, bytes] of entries) console.error('  -', file, bytes);
        console.error('[size-regression] Top subset total bytes =', total);
        // Heuristic: highlight obvious UI / optional modules
        const hints = entries.filter(([f]) => /audio|hud|theme|overdrive|fairness|economy|survivability/i.test(f));
        if (hints.length) console.error('[size-regression] Hint: Consider conditional loading or feature flags for', hints.map(h=>h[0]).slice(0,5));
      }
    } catch {}
    process.exit(1);
  }
  if (allowOverride && diff > 0) {
    console.log('[size-regression] Override set; updating baseline to new larger size');
    saveBaseline(cur);
  } else if (diff < 0) {
    console.log('[size-regression] Size decreased; updating baseline');
    saveBaseline(cur);
  } else {
    console.log('[size-regression] Within limits; baseline unchanged');
  }
}

main();