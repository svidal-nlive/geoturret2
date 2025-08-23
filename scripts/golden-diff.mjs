#!/usr/bin/env node
// Compare freshly generated recordings (runRecordings.actual.json) with committed golden (runRecordings.json)
// Usage: node scripts/golden-diff.mjs [--actual golden/runRecordings.actual.json] [--golden golden/runRecordings.json]
// Exits non-zero if differences found. Designed to be fast, concise, and not require TS compilation.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function arg(name, def) { const i = process.argv.indexOf(`--${name}`); return i !== -1 ? process.argv[i+1] : def; }
const actualPath = path.resolve(arg('actual', 'golden/runRecordings.actual.json'));
const goldenPath = path.resolve(arg('golden', 'golden/runRecordings.json'));

if (!fs.existsSync(actualPath)) { console.error('[golden-diff] actual file missing', actualPath); process.exit(2); }
if (!fs.existsSync(goldenPath)) { console.error('[golden-diff] golden file missing', goldenPath); process.exit(2); }

const actual = JSON.parse(fs.readFileSync(actualPath, 'utf-8'));
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));

// Enforce full expected case list to catch accidental omissions (can skip via GOLDEN_SKIP_CASE_CHECK=1)
const expectedSeeds = ['g1','g2','g3-parallax','g4-grazeOD','g5-boss','g6-boss-safe','g7-boss-multi','g8-boss-future'];
if (!process.env.GOLDEN_SKIP_CASE_CHECK) {
  const goldenSeeds = golden.recordings.map(r=>r.seed);
  if (goldenSeeds.join(',') !== expectedSeeds.join(',')) {
    console.error('[golden-diff] expected seed list mismatch:', goldenSeeds, 'vs expected', expectedSeeds);
    process.exit(3);
  }
}

function summarizeSnapshot(s) {
  return {
    v: s.version,
    f: s.frame,
    t: Number(s.time.toFixed(9)),
    r: s.rngState,
    h: s.registryHash,
    k: s.summary.kills,
    w: s.summary.wave,
    g: s.summary.grazeCount ?? 0,
    om: s.summary.overdriveMeter ?? 0,
    oa: !!s.summary.overdriveActive,
    p: (s.summary.parallaxLayers || []).map(l => ({ d: l.depth, c: l.color, ts: l.tileSize, s: l.step }))
  };
}

let diffs = 0;
if (actual.recordings.length !== golden.recordings.length) {
  console.log(`[golden-diff] recording count mismatch actual=${actual.recordings.length} golden=${golden.recordings.length}`);
  diffs++;
}
const len = Math.min(actual.recordings.length, golden.recordings.length);
for (let i=0;i<len;i++) {
  const a = actual.recordings[i];
  const g = golden.recordings[i];
  const header = `case#${i} seed=${a.seed}`;
  const problems = [];
  const fields = ['seed','duration','kills','wave'];
  for (const f of fields) { if (a[f] !== g[f]) problems.push(`${f}:${a[f]}!=${g[f]}`); }
  const as = summarizeSnapshot(a.final); const gs = summarizeSnapshot(g.final);
  const cmp = Object.keys(as);
  for (const f of cmp) { const av = as[f]; const gv = gs[f];
    if (Array.isArray(av) && Array.isArray(gv)) {
      if (av.length !== gv.length) { problems.push(`parallax.len:${av.length}!=${gv.length}`); }
      else {
        for (let j=0;j<av.length;j++) {
          const ap = av[j], gp = gv[j];
          if (ap.d !== gp.d) problems.push(`p[${j}].d:${ap.d}!=${gp.d}`);
          if (ap.c && ap.c !== gp.c) problems.push(`p[${j}].c:${ap.c}!=${gp.c}`);
          if (ap.ts && ap.ts !== gp.ts) problems.push(`p[${j}].ts:${ap.ts}!=${gp.ts}`);
          if (ap.s && ap.s !== gp.s) problems.push(`p[${j}].s:${ap.s}!=${gp.s}`);
        }
      }
    } else if (av !== gv) {
      problems.push(`${f}:${av}!=${gv}`);
    }
  }
  if (problems.length) {
    diffs++;
    console.log(`[golden-diff] ${header} diffs -> ${problems.join(', ')}`);
  }
}
if (!diffs) console.log('[golden-diff] OK (no differences)');
else { console.log(`[golden-diff] total differing cases: ${diffs}`); process.exit(1); }
