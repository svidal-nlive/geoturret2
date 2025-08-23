#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { patchEsmImports } from './esm-import-patch.mjs';

// Build dist-baseline (minimal sources) then patch relative imports to include .js extensions for Node ESM resolution.
spawnSync('npx', ['tsc', '-p', 'tsconfig.baseline.json'], { stdio: 'inherit' });

patchEsmImports(path.resolve('dist-baseline'));

const { recordRun } = await import('../dist-baseline/devtools/replay.js');

function getArg(name, def) {
  const idx = process.argv.indexOf(`--${name}`);
  return (idx !== -1 && idx + 1 < process.argv.length) ? process.argv[idx + 1] : def;
}
const casesArg = getArg('cases', 'g1:6,g2:10');
const out = getArg('out', 'golden/runRecordings.actual.json');
const fixedStep = parseFloat(getArg('step', (1/60).toString()));

const cases = casesArg.split(',').filter(Boolean).map(p => { const [seed, dur] = p.split(':'); return { seed, duration: parseFloat(dur || '6') }; });
const recordings = cases.map(c => recordRun({ seed: c.seed, duration: c.duration, fixedStep, withParallax: c.seed.includes('parallax') }));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ version: 1, recordings }, null, 2));
console.log('[golden-record] wrote', out, 'with', recordings.length, 'recordings');
