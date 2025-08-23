import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine';
import { createGameState } from '../state/gameState';
import { createEnemySystem } from './enemySystem';
import { createPlayerSystem, player } from './playerSystem';
import { createGrazeSystem } from './grazeSystem';

describe('graze system', () => {
  it('counts a graze when enemy passes near player', () => {
    const state = createGameState();
    const o = new GameOrchestrator({ seed: 'graze-seed', fixedStep: 1/60 });
    o.register(createPlayerSystem(state));
    o.register(createEnemySystem(state));
    o.register(createGrazeSystem(state));
    o.init();
    // simulate until at least one graze
    for (let i=0;i<600 && state.grazeCount===0;i++) o.advance(o.getStep());
    expect(state.grazeCount).toBeGreaterThan(0);
  });

  it('is deterministic for same seed', () => {
    const run = () => {
      const s = createGameState();
      const o = new GameOrchestrator({ seed: 'graze-seed', fixedStep: 1/60 });
      o.register(createPlayerSystem(s));
      o.register(createEnemySystem(s));
      o.register(createGrazeSystem(s));
      o.init();
      o.advance(5);
      return { grazes: s.grazeCount };
    };
    const a = run();
    const b = run();
    expect(a.grazes).toBe(b.grazes);
  });
});
