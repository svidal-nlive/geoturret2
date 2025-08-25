import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { spawnEmber } from '../content/effects/particle';
import { RNG } from '../engine/rng';

// Validate ember spawns deterministic with provided RNG.

describe('particle RNG determinism', () => {
  it('produces identical sequences with same seed', () => {
    const s1 = createGameState();
    const s2 = createGameState();
    const r1 = new RNG(42);
    const r2 = new RNG(42);
    for (let i=0;i<10;i++) { spawnEmber(s1, 0,0, r1); spawnEmber(s2,0,0,r2); }
    const coords1 = s1.particles.map(p=>[p.vx.toFixed(4), p.vy.toFixed(4)]).join('|');
    const coords2 = s2.particles.map(p=>[p.vx.toFixed(4), p.vy.toFixed(4)]).join('|');
    expect(coords1).toBe(coords2);
  });
});
