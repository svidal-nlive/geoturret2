import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { spawnPatternProjectile } from '../content/patterns/util/patternProjectile';
import { createPatternProjectileSystem } from './patternProjectileSystem';

describe('boss hitbox damage tuning', () => {
  it('reduces boss health when pattern projectile intersects hitbox', () => {
    const state = createGameState();
    state.bossHealth = 500; state.bossMaxHealth = 500; state.bossHitbox.x = 0; state.bossHitbox.y = 0; state.bossHitbox.radius = 25;
    // Spawn a projectile aimed at center with velocity to trigger damage
    spawnPatternProjectile(state, { x: -10, y: 0, vx: 60, vy: 0, ttl: 1 });
    const sys = createPatternProjectileSystem(state);
    const initial = state.bossHealth;
    for (let f=0; f<10; f++) sys.update(1/60, { frame: f } as any);
    expect(state.bossHealth).toBeLessThan(initial);
  });
});
