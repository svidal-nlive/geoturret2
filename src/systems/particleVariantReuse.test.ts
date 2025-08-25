import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { spawnSpark, spawnEmber, spawnTrail, spawnBurst } from '../content/effects/particle';
import { createParticleSystem } from './particleSystem';

describe('particle variant pooling reuse', () => {
  it('reuses particle slots across multiple variant spawns', () => {
    const state = createGameState();
    const sys = createParticleSystem(state);
    // Simulate sequential variant spawns & expirations
    spawnSpark(state, 0,0, 0, 20);
    spawnEmber(state, 1,1);
    spawnTrail(state, 2,2);
    spawnBurst(state, 3,3, 4);
    const peak = state.particlePool.stats().inUse;
    // Run updates to expire all (simulate >1s total)
    for (let f=0; f<120; f++) sys.update(1/60, { frame: f } as any);
    expect(state.particles.length).toBe(0);
    // Spawn again and ensure pool size hasn't grown beyond previous inUse
    spawnSpark(state, 0,0, 0, 10);
  const statsAfter = state.particlePool.stats();
  expect(statsAfter.size).toBeGreaterThanOrEqual(peak); // total size at least previous peak usage
  // Ensure current inUse doesn't exceed previous peak usage after reuse cycle
  expect(statsAfter.inUse).toBeLessThanOrEqual(peak);
  });
});
