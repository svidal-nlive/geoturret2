#!/usr/bin/env node
// Generate a markdown summary table of current registry entries with versions.
import fs from 'fs';
import path from 'path';

let Registries;
try {
  await import('../dist-baseline/content/initialContent.js');
  ({ Registries } = await import('../dist-baseline/content/registries.js'));
} catch(e) {
  // Fallback to source (slower, ensures script can be used pre-build in CI freshness checks)
  await import('../src/content/initialContent.ts');
  ({ Registries } = await import('../src/content/registries.ts'));
}

function pad(str, len){ return str + ' '.repeat(Math.max(0, len - str.length)); }

const snap = Registries.snapshot();
const blocks = [];
// Attempt to find getters; if absent (older dist build), definitions cannot be introspected for version -> default 1.
const collect = (label, ids, getterName) => {
  const getter = Registries[getterName];
  const rows = ids.map(id => {
    let def = undefined;
    try { if (typeof getter === 'function') def = getter(id); } catch(_) {}
    const v = def?.version ?? 1; const name = def?.displayName || id; return { id, name, v };
  });
  blocks.push({ label, rows });
};
collect('Enemies', snap.enemies, 'getEnemy');
collect('Powerups', snap.powerups, 'getPowerup');
collect('Upgrades', snap.upgrades, 'getUpgrade');
collect('Wave Mods', snap.waveMods, 'getWaveMod');
collect('Boss Patterns', snap.bossPatterns, 'getBossPattern');

let md = '# Registry Summary\nGenerated: ' + new Date().toISOString() + '\n';
for (const b of blocks) {
  md += '\n## ' + b.label + '\n';
  md += '| ID | Name | Version |\n|---|---|---|\n';
  for (const r of b.rows.sort((a,b)=>a.id.localeCompare(b.id))) md += `| ${r.id} | ${r.name} | ${r.v} |\n`;
}
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/registry-summary.md', md);
console.log('[registry-summary] wrote artifacts/registry-summary.md');
