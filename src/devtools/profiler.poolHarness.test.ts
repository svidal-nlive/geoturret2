import { describe, it, expect } from 'vitest';
import { createPooledHarness } from '../testUtils/poolHarness';

describe('Profiling via pool harness', () => {
  it('collects per-system timings and aggregates averages', () => {
    const h = createPooledHarness('bullet', 'prof-harness-seed', 4, { profiler: true });
    // Ensure some entities exist to give work.
    h.spawnUntil(3);
    const result = h.profile(10); // 10 frames
    expect(result.frames).toBe(10);
    // Expect core systems we registered to appear.
    const systems = Object.keys(result.perSystem);
    expect(systems.length).toBeGreaterThan(0);
    // Must contain bullets system since we spawned bullets.
    expect(systems.includes('bullets')).toBe(true);
    // Average ms should be non-negative numbers.
    for (const rec of Object.values(result.perSystem)) {
      expect(rec.totalMs).toBeGreaterThanOrEqual(0);
      expect(rec.frames).toBeGreaterThan(0);
      expect(rec.avgMs).toBeCloseTo(rec.totalMs / rec.frames, 10);
    }
  });
});
