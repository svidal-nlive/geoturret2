import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';
import { createBulletSystem } from './bulletSystem';
import { Pool } from '../engine/pool';
import { Bullet } from '../state/gameState';

/**
 * Bullet spawn budget test via limited pool cap ensuring fire loop respects pool exhaustion.
 */
describe('bullet spawn budget via pool cap', () => {
  function run(frames: number) {
    const state = createGameState();
    state.bullets.length = 0;
    state.bulletPool = new Pool<Bullet>({
      initial: 2,
      max: 3,
      create: () => ({ id: 0, x:0,y:0,vx:0,vy:0, alive:false }),
      reset: (b: Bullet) => { b.alive = false; }
    });
    const o = new GameOrchestrator({ seed: 'bullet-budget', fixedStep: 1/60, summarySource: () => ({
      kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(createBulletSystem(state));
    o.init();
    o.advance(frames / 60);
    return state.bullets.length;
  }
  it('never exceeds bullet pool max', () => {
    const count = run(600); // 10s
    expect(count).toBeLessThanOrEqual(3);
  });
});
