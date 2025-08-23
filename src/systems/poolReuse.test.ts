import { describe, it, expect } from 'vitest';
import { createPooledHarness } from '../testUtils/poolHarness';

describe('Pooling reuse deterministic', () => {
  it('reuses bullet objects after release with identical seed', () => {
    const h = createPooledHarness('bullet', 'pool-reuse-seed', 2);
    h.spawnUntil(2);
    const firstRefs = [...h.getEntities()];
    h.reclaimAll();
    expect(h.getEntities().length).toBe(0);
    const createdAfterFirst = h.getPool().stats().created;
    const released = new Set(firstRefs);
    h.spawnUntil(2);
    const secondRefs = [...h.getEntities()];
    expect(secondRefs.length).toBe(2);
    for (const b of secondRefs) expect(released.has(b)).toBe(true);
    expect(h.getPool().stats().created).toBe(createdAfterFirst);
  });
});
