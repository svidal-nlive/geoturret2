#!/usr/bin/env node
// Compare versionMap between current golden and an actual run or a previous golden archive.
// Usage: node scripts/versionmap-diff.mjs --base golden/runRecordings.json --compare golden/runRecordings.actual.json
import fs from 'fs';
import path from 'path';

function arg(name, def){ const i=process.argv.indexOf(`--${name}`); return i!==-1?process.argv[i+1]:def; }
const basePath = path.resolve(arg('base','golden/runRecordings.json'));
const comparePath = path.resolve(arg('compare','golden/runRecordings.actual.json'));
if(!fs.existsSync(basePath)) { console.error('[versionmap-diff] base missing', basePath); process.exit(2); }
if(!fs.existsSync(comparePath)) { console.error('[versionmap-diff] compare missing', comparePath); process.exit(2); }
const base = JSON.parse(fs.readFileSync(basePath,'utf8'));
const cmp = JSON.parse(fs.readFileSync(comparePath,'utf8'));
const allow = process.env.ALLOW_VERSIONMAP_DRIFT === '1';

function collectVM(recordings){
  const vm = {};
  for (const r of recordings) {
    const m = r.final.versionMap || {};
    for (const [k,v] of Object.entries(m)) {
      if (vm[k] == null) vm[k] = new Set();
      vm[k].add(v);
    }
  }
  // flatten: if a key has multiple versions across recordings that's already drift
  const flat = {};
  for (const k of Object.keys(vm)) flat[k] = [...vm[k]].sort();
  return flat;
}

const baseVM = collectVM(base.recordings);
const cmpVM = collectVM(cmp.recordings);

const allKeys = new Set([...Object.keys(baseVM), ...Object.keys(cmpVM)]);
const changes = [];
for (const k of allKeys) {
  const b = baseVM[k];
  const c = cmpVM[k];
  if (!b) changes.push(`ADDED ${k} -> ${c.join(',')}`);
  else if (!c) changes.push(`REMOVED ${k} (was ${b.join(',')})`);
  else if (b.join(',') !== c.join(',')) changes.push(`CHANGED ${k}: ${b.join(',')} -> ${c.join(',')}`);
}
if (!changes.length) {
  console.log('[versionmap-diff] No versionMap changes');
  process.exit(0);
} else {
  console.log('[versionmap-diff] Changes:');
  changes.forEach(c=>console.log(' -',c));
  // Write machine-readable diff for artifact consumers
  const out = { timestamp: new Date().toISOString(), base: path.basename(basePath), compare: path.basename(comparePath), changes };
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/versionmap-diff.json', JSON.stringify(out, null, 2));
  if (allow) {
    console.log('[versionmap-diff] Drift allowed via ALLOW_VERSIONMAP_DRIFT=1');
    process.exit(0);
  } else {
    process.exit(1);
  }
}
