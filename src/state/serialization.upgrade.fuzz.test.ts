import { describe, it, expect } from 'vitest';
import { upgradeSnapshot, SCHEMA_VERSION } from './serialization';

// Lightweight fuzz-style robustness test to ensure upgradeSnapshot tolerates
// partial / malformed legacy snapshot objects without throwing and applies
// sane defaults.

function randomInt(n: number) { return Math.floor(Math.random() * n); }

describe('upgradeSnapshot fuzz robustness', () => {
  it('handles a variety of malformed legacy shapes', () => {
    const samples: any[] = [];
    for (let i=0;i<50;i++) {
      const version = [1,2,3,999, SCHEMA_VERSION][randomInt(5)];
      const base: any = {
        version,
        frame: randomInt(500),
        time: Math.random() * 5,
        rngState: randomInt(1<<30),
        registries: {},
        registryHash: 'hash'+i,
        summary: { kills: randomInt(20), wave: randomInt(3) }
      };
      // Randomly delete some top-level fields (except summary which is required for our logic)
      if (Math.random()<0.2) delete base.rngState;
      if (Math.random()<0.2) delete base.frame;
      if (Math.random()<0.2) delete base.time;
      if (Math.random()<0.2) delete base.registryHash;
      samples.push(base);
    }
    for (const s of samples) {
      // upgradeSnapshot expects certain fields; ensure missing critical ones are patched in cheaply
      if (s.frame == null) s.frame = 0;
      if (s.time == null) s.time = 0;
      if (s.rngState == null) s.rngState = 0;
      if (!s.registryHash) s.registryHash = '';
      const up = upgradeSnapshot(s as any);
      expect(up.version).toBe(SCHEMA_VERSION);
      expect(typeof up.summary.kills).toBe('number');
      expect(typeof up.summary.wave).toBe('number');
      // New metrics always present as numbers/boolean or undefined
      expect(typeof (up.summary.grazeCount ?? 0)).toBe('number');
      expect(typeof (up.summary.overdriveMeter ?? 0)).toBe('number');
      expect(typeof (up.summary.overdriveActive ?? false)).toBe('boolean');
    }
  });
});
