#!/usr/bin/env node
/**
 * Helper wrapper to (re)generate performance baseline with diff summary.
 *
 * Features:
 *  - Archives previous perf-baseline.json to perf-baseline.archive/<timestamp>.json
 *  - Runs perf-baseline script with provided args (passes through unknown flags)
 *  - Computes per-system threshold deltas (avg, spike) and memory threshold changes
 *  - Warns if thresholds tighten dramatically ( >50% reduction ) unless --force
 *  - Prints suggested commit message snippet
 *
 * Usage examples:
 *   npm run perf:regen -- --frames 2400 --seeds a,b,c,d,e
 *   node scripts/perf-regenerate.mjs --frames 3000 --seeds a,b,c --force
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs() {
  const out = { force: false, passthrough: [] };
  const args = process.argv.slice(2);
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--force') out.force = true; else out.passthrough.push(a);
  }
  return out;
}

function archiveExisting(file) {
  if (!fs.existsSync(file)) return null;
  const dir = path.resolve('perf-baseline.archive');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const ts = new Date().toISOString().replace(/[:T]/g,'-').replace(/\..+/, '');
  const target = path.join(dir, `perf-baseline.${ts}.json`);
  fs.copyFileSync(file, target);
  return target;
}

function loadJson(file) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return null; } }

function summarizeDiff(prev, next) {
  if (!prev) return { fresh: true, systems: [], memory: null };
  const systems = [];
  const prevThr = prev.thresholds || {};
  const nextThr = next.thresholds || {};
  const all = new Set([...Object.keys(prevThr), ...Object.keys(nextThr)].filter(k=>k!=='memory'));
  for (const id of [...all].sort()) {
    const p = prevThr[id];
    const n = nextThr[id];
    if (!p || !n) { systems.push({ id, added: !!n, removed: !!p }); continue; }
    systems.push({ id, avg: { prev: p.avg, next: n.avg, delta: n.avg - p.avg, ratio: p.avg? (n.avg/p.avg): null }, spike: { prev: p.spike, next: n.spike, delta: n.spike - p.spike, ratio: p.spike? (n.spike/p.spike): null } });
  }
  const mem = { prev: prevThr.memory, next: nextThr.memory };
  return { fresh: false, systems, memory: mem };
}

function formatNumber(n) { return typeof n === 'number' && isFinite(n) ? n.toFixed(4) : String(n); }

function printReport(diff) {
  if (diff.fresh) { console.log('[perf-regenerate] Created fresh baseline'); return; }
  console.log('[perf-regenerate] Threshold changes:');
  for (const s of diff.systems) {
    if (s.added) { console.log(`  [+] ${s.id} (new system)`); continue; }
    if (s.removed) { console.log(`  [-] ${s.id} (removed system)`); continue; }
    const avgDeltaPct = s.avg.prev? ((s.avg.next - s.avg.prev)/s.avg.prev*100).toFixed(1)+'%':'n/a';
    const spikeDeltaPct = s.spike.prev? ((s.spike.next - s.spike.prev)/s.spike.prev*100).toFixed(1)+'%':'n/a';
    if (s.avg.prev !== s.avg.next || s.spike.prev !== s.spike.next) {
      console.log(`  [~] ${s.id} avg ${formatNumber(s.avg.prev)} -> ${formatNumber(s.avg.next)} (${avgDeltaPct}), spike ${formatNumber(s.spike.prev)} -> ${formatNumber(s.spike.next)} (${spikeDeltaPct})`);
    }
  }
  if (diff.memory?.prev || diff.memory?.next) {
    const p = diff.memory.prev || {}; const n = diff.memory.next || {};
    if (p.delta !== n.delta || p.growthP95 !== n.growthP95 || p.growthP99 !== n.growthP99) {
      console.log(`  [mem] delta ${p.delta||'n/a'} -> ${n.delta||'n/a'}, growthP95 ${p.growthP95||'n/a'} -> ${n.growthP95||'n/a'}, growthP99 ${p.growthP99||'n/a'} -> ${n.growthP99||'n/a'}`);
    }
  }
}

function detectAggressiveTightening(diff, force) {
  if (diff.fresh) return [];
  const issues = [];
  for (const s of diff.systems) {
    if (s.added || s.removed) continue;
    if (s.avg.prev && s.avg.next < s.avg.prev * 0.5) issues.push(`${s.id} avg shrank >50% (${s.avg.prev.toFixed(4)} -> ${s.avg.next.toFixed(4)})`);
    if (s.spike.prev && s.spike.next < s.spike.prev * 0.5) issues.push(`${s.id} spike shrank >50% (${s.spike.prev.toFixed(4)} -> ${s.spike.next.toFixed(4)})`);
  }
  if (issues.length && !force) {
    console.warn('[perf-regenerate] WARN potential over-tightening (use --force to accept):');
    for (const i of issues) console.warn('   -', i);
  }
  return issues;
}

async function run() {
  const args = parseArgs();
  const baselineFile = path.resolve('perf-baseline.json');
  const prev = loadJson(baselineFile);
  const archived = archiveExisting(baselineFile);
  if (archived) console.log('[perf-regenerate] Archived previous baseline ->', archived);
  const cmd = process.execPath; // node
  const baselineArgs = ['scripts/perf-baseline.mjs', ...args.passthrough];
  console.log('[perf-regenerate] Running:', cmd, baselineArgs.join(' '));
  const res = spawnSync(cmd, baselineArgs, { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error('[perf-regenerate] baseline script failed');
    process.exit(res.status || 1);
  }
  const next = loadJson(baselineFile);
  if (!next) { console.error('[perf-regenerate] failed to load new baseline'); process.exit(1); }
  const diff = summarizeDiff(prev, next);
  printReport(diff);
  const issues = detectAggressiveTightening(diff, args.force);
  if (issues.length && !args.force) {
    console.error('\nRefusing to proceed without --force; review changes then re-run with --force if intentional.');
    process.exit(2);
  }
  console.log('\nSuggested commit message line:');
  console.log('  chore(perf): regenerate baseline (' + new Date().toISOString().split('T')[0] + ')');
}

run().catch(e=>{ console.error(e); process.exit(1); });
