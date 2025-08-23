import { describe, it, expect } from 'vitest';
import { upgradeSnapshot, AnyRunSnapshot } from './serialization';

describe('snapshot upgrade path', () => {
  it('upgrades v1/v2/v3 snapshots to v5 with defaults', () => {
    const base = { frame: 5, time: 0.0833333333, rngState: 12345, registries: { enemies: [] }, registryHash: 'deadbeef' };
    const v1: AnyRunSnapshot = { version: 1, ...base, summary: { kills: 2, wave: 0 } } as any;
    const v2: AnyRunSnapshot = { version: 2, ...base, summary: { kills: 3, wave: 1 } } as any;
    const v3: AnyRunSnapshot = { version: 3, ...base, summary: { kills: 4, wave: 2, parallaxLayers: [{ depth: 0.5, color: '#123', tileSize: 100, step: 10 }] } } as any;

    const u1 = upgradeSnapshot(v1);
    const u2 = upgradeSnapshot(v2);
    const u3 = upgradeSnapshot(v3);

    // Common expectations
    for (const u of [u1, u2, u3]) {
      expect(u.version).toBe(5);
      expect(typeof u.summary.grazeCount).toBe('number');
      expect(u.summary.grazeCount).toBe(0);
      expect(u.summary.overdriveMeter).toBe(0);
      expect(u.summary.overdriveActive).toBe(false);
      // Boss lifecycle fields defaulted (mandatory in v5)
      expect(u.summary.bossActive).toBe(false);
      expect(u.summary.bossPattern === null || typeof u.summary.bossPattern === 'string').toBe(true);
      expect(u.summary.bossStartedFrame).toBeNull();
      expect(u.summary.bossEndedFrame).toBeNull();
    }
    expect(u1.summary.kills).toBe(2);
    expect(u2.summary.kills).toBe(3);
    expect(u3.summary.kills).toBe(4);
    // Parallax layers carried forward for v3
    expect(u3.summary.parallaxLayers?.length).toBe(1);
    expect(u3.summary.parallaxLayers?.[0].depth).toBeCloseTo(0.5, 9);
  });
});
