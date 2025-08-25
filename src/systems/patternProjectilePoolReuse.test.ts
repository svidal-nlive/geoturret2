import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { spawnPatternProjectile } from '../content/patterns/util/patternProjectile';

// Basic reuse test for pattern projectile pool ensuring no growth after warm reuse scenario.

describe('Pattern projectile pool reuse', () => {
  it('recycles projectiles deterministically', () => {
    const state = createGameState();
    // Acquire some projectiles
    for (let i=0;i<10;i++) spawnPatternProjectile(state, { x: 0, y: 0, vx: 10, vy: 0, ttl: 0.01 });
    const created = state.patternProjectilePool.stats().created;
    // Simulate integration & expiry
    // Simple manual expire: mark ttl zero and run system-like cleanup
    state.patternProjectiles.forEach(p => { p.ttl = -0.1; p.alive = true; });
    // Manually invoke release (simulate system pass)
    while (state.patternProjectiles.length) {
      const p = state.patternProjectiles.pop()!; p.alive = false; state.patternProjectilePool.release(p);
    }
    // Spawn again; should not increase created count (pool reuse)
    for (let i=0;i<10;i++) spawnPatternProjectile(state, { x: 0, y: 0, vx: 5, vy: 0, ttl: 0.5 });
    expect(state.patternProjectilePool.stats().created).toBe(created);
  });
});
