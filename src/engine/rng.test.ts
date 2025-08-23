import { describe, it, expect } from 'vitest';
import { RNG } from './rng';

describe('RNG', () => {
  it('produces deterministic sequence for numeric seed', () => {
    const a = new RNG(1234);
    const b = new RNG(1234);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('int() stays within bounds inclusive', () => {
    const r = new RNG(42);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('choice() returns element from array', () => {
    const r = new RNG('choice-seed');
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(r.choice(arr));
    }
  });
});
