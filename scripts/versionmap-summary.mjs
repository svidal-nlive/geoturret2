#!/usr/bin/env node
// versionmap-summary: Aggregate versionMap entries across golden recordings for drift analytics.
// Usage: node scripts/versionmap-summary.mjs [--golden golden/runRecordings.json]
import fs from 'fs';
import path from 'path';
function arg(name, def){ const i=process.argv.indexOf(`--${name}`); return i!==-1? process.argv[i+1]:def; }
const goldenPath = path.resolve(arg('golden','golden/runRecordings.json'));
if(!fs.existsSync(goldenPath)){ console.error('[versionmap-summary] missing', goldenPath); process.exit(2); }
const golden = JSON.parse(fs.readFileSync(goldenPath,'utf-8'));
const agg = {};
for(const rec of golden.recordings){
  const vm = (rec.final && rec.final.versionMap) || {};
  for(const [k,v] of Object.entries(vm)){
    const entry = agg[k] || (agg[k]={ versions: new Set(), count:0 });
    entry.versions.add(v);
    entry.count++;
  }
}
const rows = Object.keys(agg).sort().map(k=>({ key:k, versions:[...agg[k].versions].sort((a,b)=>a-b), occurrences:agg[k].count }));
console.log('key,versions,occurrences');
for(const r of rows){ console.log(`${r.key},${r.versions.join('|')},${r.occurrences}`); }
