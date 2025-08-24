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
import { spawnSync } from 'node:child_process';

const BUNDLE = 'dist/size-check.js';
const BASELINE_FILE = 'size-baseline.json';
const ABS_LIMIT_KB = 5; // absolute cushion
const PCT_LIMIT = 0.05; // 5%

function ensureBundle() {
  if (!fs.existsSync(BUNDLE)) {
    const res = spawnSync('npm', ['run','size:build'], { stdio: 'inherit' });
    if (res.status !== 0) process.exit(res.status||1);
  }
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

function main() {
  ensureBundle();
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