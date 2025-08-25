import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { spawnParticle } from '../content/effects/particle';

describe('Particle pool reuse', () => {
  it('reuses particle objects after expiry', () => {
    const state = createGameState();
    for (let i=0;i<20;i++) spawnParticle(state, { x: 0, y: 0, vx: 1, vy: 0, ttl: 0.01 });
    const created = state.particlePool.stats().created;
    // Expire all
    state.particles.forEach(p => { p.ttl = -0.1; p.alive = true; });
    // Simulate particle system cleanup logic
    while (state.particles.length) { const p = state.particles.pop()!; p.alive = false; state.particlePool.release(p); }
    for (let i=0;i<20;i++) spawnParticle(state, { x: 1, y: 1, vx: 0, vy: 1, ttl: 0.5 });
    expect(state.particlePool.stats().created).toBe(created);
  });
});
