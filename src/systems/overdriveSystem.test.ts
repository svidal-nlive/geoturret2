import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine';
import { createGameState } from '../state/gameState';
import { createEnemySystem } from './enemySystem';
import { createPlayerSystem } from './playerSystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';
import { createGrazeSystem } from './grazeSystem';
import { createOverdriveSystem } from './overdriveSystem';

describe('overdrive system', () => {
  it('fills meter from kills and activates', () => {
    const state = createGameState();
    const o = new GameOrchestrator({ seed: 'overdrive-seed', fixedStep: 1/60 });
    o.register(createPlayerSystem(state));
    o.register(createEnemySystem(state));
    o.register(createBulletSystem(state));
    o.register(createCollisionSystem(state));
    o.register(createGrazeSystem(state));
    o.register(createOverdriveSystem(state, { killGain: 0.2, grazeGain: 0.2, duration: 1 }));
    o.init();
    // Run until overdrive starts
    for (let i=0;i<600 && !state.overdriveActive;i++) o.advance(o.getStep());
    expect(state.overdriveActive).toBe(true);
    expect(state.overdriveTimeRemaining).toBeGreaterThan(0);
  });

  it('ends after duration deterministically', () => {
    const run = () => {
      const state = createGameState();
      const o = new GameOrchestrator({ seed: 'overdrive-seed', fixedStep: 1/60 });
      o.register(createPlayerSystem(state));
      o.register(createEnemySystem(state));
      o.register(createBulletSystem(state));
      o.register(createCollisionSystem(state));
      o.register(createGrazeSystem(state));
      o.register(createOverdriveSystem(state, { killGain: 0.2, grazeGain: 0.2, duration: 1 }));
      o.init();
      // run until after expected end (> duration plus time to fill)
      o.advance(3);
      return { active: state.overdriveActive, meter: state.overdriveMeter };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(a.active).toBe(false);
  });
});
