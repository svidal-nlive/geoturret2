import { describe, it, expect } from 'vitest';
import { Pool } from './pool';
import { RNG } from './rng';

describe('Pool', () => {
  it('acquires and releases objects', () => {
    let counter = 0;
    const pool = new Pool<number>({ initial: 2, create: () => counter++ });
    const a = pool.acquire();
    const b = pool.acquire();
    const stats1 = pool.stats();
    expect(stats1.size).toBe(2);
    expect(stats1.inUse).toBe(2);
    pool.release(a!);
    const c = pool.acquire();
    // c should be recycled instance (value matches original a)
    expect(c).toBe(a);
  });

  it('expands until max then returns undefined (deterministic ids)', () => {
    const rng = new RNG(1234);
    const pool = new Pool<{ id: number}>({ initial: 1, max: 3, create: () => ({ id: rng.next() }) });
    const objs = [pool.acquire(), pool.acquire(), pool.acquire()];
    expect(pool.stats().size).toBe(3);
    const denied = pool.acquire();
    expect(denied).toBeUndefined();
    // release one and acquire again -> should succeed
    pool.release(objs[0]!);
    const reused = pool.acquire();
    expect(reused).toBe(objs[0]);
  });
});
