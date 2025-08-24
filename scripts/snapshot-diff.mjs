#!/usr/bin/env node
// snapshot-diff: Compare two snapshot JSON files (or runRecording files containing .final) and report field differences.
// Usage: node scripts/snapshot-diff.mjs --a path/to/a.json --b path/to/b.json
import fs from 'fs';
import path from 'path';

function arg(name, def){ const i=process.argv.indexOf(`--${name}`); return i!==-1? process.argv[i+1]:def; }
const aPath = path.resolve(arg('a',''));
const bPath = path.resolve(arg('b',''));
if(!aPath||!bPath||!fs.existsSync(aPath)||!fs.existsSync(bPath)){
  console.error('[snapshot-diff] provide --a and --b existing JSON files');
  process.exit(2);
}
function loadSnap(p){
  const data = JSON.parse(fs.readFileSync(p,'utf-8'));
  if(data && data.final && data.final.summary) return data.final; // runRecording wrapper
  return data; // assume raw snapshot
}
const a = loadSnap(aPath);
const b = loadSnap(bPath);

function flatten(prefix, obj, out){
  if(obj===null || typeof obj!=='object'){ out[prefix]=obj; return; }
  if(Array.isArray(obj)){ out[prefix]=`[len:${obj.length}]`; obj.forEach((v,i)=>flatten(`${prefix}.${i}`,v,out)); return; }
  for(const k of Object.keys(obj)) flatten(prefix? `${prefix}.${k}`:k, obj[k], out);
}
const af={}, bf={};
flatten('', a, af); flatten('', b, bf);
const keys = new Set([...Object.keys(af),...Object.keys(bf)]);
const diffs=[];
for(const k of [...keys].sort()){
  if(af[k] !== bf[k]) diffs.push(`${k}: ${af[k]} != ${bf[k]}`);
}
if(!diffs.length){ console.log('[snapshot-diff] OK (no differences)'); process.exit(0); }
console.log('[snapshot-diff] field differences:');
diffs.forEach(d=>console.log('-', d));
process.exit(1);
