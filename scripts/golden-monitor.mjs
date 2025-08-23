#!/usr/bin/env node
// golden-monitor: convenience script to record current actuals (without modifying committed goldens),
// diff them, and print a concise categorized metric delta summary to stdout for pre-rotation review.
// Usage: node scripts/golden-monitor.mjs [--cases g1:6,...] [--step 0.0166667]
// Exits 0 always (informational) unless recording fails.
import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';

function arg(name, def) { const i = process.argv.indexOf(`--${name}`); return i !== -1 ? process.argv[i+1] : def; }
const casesArg = arg('cases', 'g1:6,g2:10,g3-parallax:6,g4-grazeOD:8,g5-boss:14,g6-boss-safe:22,g7-boss-multi:26,g8-boss-future:16,g9-boss-spiral:20');
const step = arg('step', (1/60).toString());

// 1. Record actuals (reuses existing script)
const record = spawnSync('node', ['scripts/golden-record.mjs', '--cases', casesArg, '--step', step], { stdio: 'inherit', env: { ...process.env, GOLDEN_REQUIRE_EXTENDED: '1', GOLDEN_MODE: '1' } });
if (record.status !== 0) { console.error('[golden-monitor] recording failed'); process.exit(record.status || 1); }

// 2. Run diff capturing output
const diff = spawnSync('node', ['scripts/golden-diff.mjs'], { encoding: 'utf-8' });
process.stdout.write(diff.stdout);
process.stderr.write(diff.stderr || '');

// 3. Parse diff output for problems and build categorized summary
const lines = (diff.stdout || '').split('\n').filter(l => l.includes('[golden-diff] case#'));
if (!lines.length) {
  console.log('[golden-monitor] NO_DRIFT');
  process.exit(0);
}

const perMetric = {};
function add(metric, detail) { (perMetric[metric] ||= []).push(detail); }

for (const l of lines) {
  // Example: [golden-diff] case#4 seed=g5-boss diffs -> f:123!=122, k:10!=9
  const afterArrow = l.split('->')[1];
  if (!afterArrow) continue;
  const diffs = afterArrow.split(',').map(s => s.trim());
  const seedMatch = l.match(/seed=([^ ]+)/); const seed = seedMatch ? seedMatch[1] : 'unknown';
  for (const d of diffs) {
    const metric = d.split(':')[0];
    add(metric, `${seed}(${d})`);
  }
}

// 4. Print categorized summary
console.log('\n[golden-monitor] DRIFT_DETECTED Categorized metric deltas:');
for (const m of Object.keys(perMetric).sort()) {
  console.log(`- ${m}: ${perMetric[m].join('; ')}`);
}

// 5. Write markdown artifact
try {
  const outPath = path.resolve('artifacts/golden-monitor-summary.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const md = ['# Golden Monitor Summary','', 'Cases with differences:', ''].concat(lines.map(l=>`- ${l.replace('[golden-diff] ','')}`),'','## By Metric','', ...Object.keys(perMetric).sort().map(m=>`- **${m}**: ${perMetric[m].join(', ')}`)).join('\n');
  fs.writeFileSync(outPath, md);
  console.log('[golden-monitor] Wrote', outPath);
} catch (e) { /* ignore */ }
