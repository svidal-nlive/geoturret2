import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine';
import { createGameState } from '../state/gameState';
import { createPlayerSystem } from './playerSystem';
import { createEnemySystem } from './enemySystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';

describe('Demo game deterministic counts', () => {
  it('reaches consistent kill count after 5s with seed', () => {
    const run = () => {
      const state = createGameState();
      const o = new GameOrchestrator({ seed: 'demo-seed', fixedStep: 1/60 });
      o.register(createPlayerSystem(state));
      o.register(createEnemySystem(state));
      o.register(createBulletSystem(state));
      o.register(createCollisionSystem(state));
      o.init();
      o.advance(5); // 5 seconds simulated
      return state.kills;
    };
    const a = run();
    const b = run();
    expect(a).toBeGreaterThan(0);
    expect(a).toBe(b);
  });
});
