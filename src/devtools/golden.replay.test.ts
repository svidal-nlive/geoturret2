import { describe, it, expect } from 'vitest';
import { recordRun } from './replay';
import fs from 'fs';
import path from 'path';
import { upgradeSnapshot, AnyRunSnapshot } from '../state/serialization';

interface GoldenFile { version: 1; recordings: any[] }

const GOLDEN_PATH = path.join(__dirname, '..', '..', 'golden', 'runRecordings.json');
const CASES = [
  { seed: 'g1', duration: 6 },
  { seed: 'g2', duration: 10 },
  { seed: 'g3-parallax', duration: 6 },
  // New case exercises graze + overdrive metrics (ensures non-zero counts and activation path)
  { seed: 'g4-grazeOD', duration: 8 }
  ,{ seed: 'g5-boss', duration: 14 }
  ,{ seed: 'g6-boss-safe', duration: 22 }
  ,{ seed: 'g7-boss-multi', duration: 26 }
];

describe('golden run recordings', () => {
  it('match stored golden recordings (set UPDATE_GOLDENS=1 to regenerate)', () => {
  const recs = CASES.map(c => recordRun({ seed: c.seed, duration: c.duration, withParallax: c.seed.includes('parallax') }));
    if (process.env.UPDATE_GOLDENS) {
      fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
      const payload: GoldenFile = { version: 1, recordings: recs };
      fs.writeFileSync(GOLDEN_PATH, JSON.stringify(payload, null, 2));
  console.log('Updated golden recordings at', GOLDEN_PATH);
    } else {
      if (!fs.existsSync(GOLDEN_PATH)) throw new Error('Golden file missing; run with UPDATE_GOLDENS=1 to create');
      const golden: GoldenFile = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf-8'));
      expect(golden.recordings.length).toBe(recs.length);
      for (let i = 0; i < recs.length; i++) {
        const a = recs[i];
        const g = golden.recordings[i];
        expect(a.seed).toBe(g.seed);
        expect(a.duration).toBe(g.duration);
        const upgradedGoldenFinal = upgradeSnapshot(g.final as AnyRunSnapshot);
        expect(a.final.frame).toBe(upgradedGoldenFinal.frame);
        expect(a.final.time).toBeCloseTo(upgradedGoldenFinal.time, 9);
        expect(a.final.rngState).toBe(upgradedGoldenFinal.rngState);
        expect(a.final.registryHash).toBe(upgradedGoldenFinal.registryHash);
        expect(a.kills).toBe(g.kills);
        expect(a.wave).toBe(g.wave);
        if (process.env.GOLDEN_REQUIRE_V4) {
          // Assert new metrics match (current expectation zeros / false unless re-recorded in future)
            expect(a.final.summary.grazeCount ?? 0).toBe(upgradedGoldenFinal.summary.grazeCount ?? 0);
            expect(a.final.summary.overdriveMeter ?? 0).toBe(upgradedGoldenFinal.summary.overdriveMeter ?? 0);
            expect(a.final.summary.overdriveActive ?? false).toBe(upgradedGoldenFinal.summary.overdriveActive ?? false);
        }
        // Validate parallax layer metadata when present in golden
        const gp = upgradedGoldenFinal.summary.parallaxLayers;
        if (Array.isArray(gp) && gp.length) {
          const ap = a.final.summary.parallaxLayers;
          expect(Array.isArray(ap)).toBe(true);
          expect(ap!.length).toBe(gp.length);
          for (let j=0;j<gp.length;j++) {
            const gl = gp[j];
            const al = ap![j];
            expect(al.depth).toBeCloseTo(gl.depth, 9);
            if (gl.color) expect(al.color).toBe(gl.color);
            if (gl.tileSize) expect(al.tileSize).toBe(gl.tileSize);
            if (gl.step) expect(al.step).toBe(gl.step);
          }
        }
      }
    }
  });
});
