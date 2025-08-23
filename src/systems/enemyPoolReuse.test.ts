import { describe, it, expect } from 'vitest';
import { createPooledHarness } from '../testUtils/poolHarness';

describe('Enemy pooling reuse deterministic', () => {
  it('reuses enemy objects after release with identical seed', () => {
  const h = createPooledHarness('enemy', 'enemy-pool-reuse-seed', 2);
  h.spawnUntil(2);
  const firstRefs = [...h.getEntities()];
  h.reclaimAll();
  expect(h.getEntities().length).toBe(0);
  const createdAfterFirst = h.getPool().stats().created;
  const released = new Set(firstRefs);
  h.spawnUntil(2);
  const secondRefs = [...h.getEntities()];
  expect(secondRefs.length).toBe(2);
  for (const e of secondRefs) expect(released.has(e)).toBe(true);
  expect(h.getPool().stats().created).toBe(createdAfterFirst);
  });
});
