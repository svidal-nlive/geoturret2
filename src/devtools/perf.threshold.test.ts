import { describe, it, expect } from 'vitest';
import { createPooledHarness } from '../testUtils/poolHarness';

describe('Performance thresholds (indicative)', () => {
  it('ensures system avg frame cost under threshold and minimal memory growth', () => {
    const h = createPooledHarness('bullet', 'perf-threshold-seed', 16, { profiler: true });
    h.spawnUntil(10);
    const agg = h.profile(20, { memory: true });
    const MAX_AVG_MS = 2; // generous upper bound for tiny demo systems
    for (const [id, rec] of Object.entries(agg.perSystem)) {
      expect(rec.avgMs).toBeLessThan(MAX_AVG_MS);
      expect(rec.minMs).toBeLessThanOrEqual(rec.maxMs);
    }
    if (agg.memory) {
      // Allow slight positive drift but catch runaway allocation; demo should allocate near-zero after warming.
      expect(agg.memory.deltaBytes).toBeLessThan(200_000); // < ~200KB growth over 20 frames
    }
  });
});
