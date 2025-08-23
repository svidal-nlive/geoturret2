import { describe, it, expect } from 'vitest';
import { createGameState, Enemy } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';
import { createEnemySystem } from './enemySystem';
import { createWaveSystem } from './waveSystem';
import { Pool } from '../engine/pool';

/**
 * Spawn budget / pool capacity safeguard test.
 * Uses a very small enemy pool (max 2). Enemy system should never exceed pool cap
 * even after many spawn intervals elapse. Acts as an early stand-in for a more
 * explicit future spawn budget mechanic from the roadmap.
 */
describe('enemy spawn budget via pool cap', () => {
  function run(seed: string) {
    const state = createGameState();
    // Replace enemy pool with constrained pool (initial 1, max 2)
    state.enemies.length = 0;
    state.enemyPool = new Pool<Enemy>({
      initial: 1,
      max: 2,
      create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, alive: false }),
      reset: (e: Enemy) => { e.alive = false; }
    });
  const o = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(createWaveSystem(state));
    o.register(createEnemySystem(state));
    o.init();
    // Advance long enough for > 10 spawn attempts (interval 0.75s). 10s ~ 13 attempts.
    o.advance(10);
    return { enemyCount: state.enemies.length, ids: state.enemies.map(e => e.id), poolStats: state.enemyPool.stats() };
  }

  it('caps active enemies at pool size', () => {
    const r = run('spawn-budget');
    expect(r.enemyCount).toBeLessThanOrEqual(2);
    expect(r.poolStats.size).toBeLessThanOrEqual(2);
    expect(r.poolStats.inUse).toBe(r.enemyCount);
  });

  it('deterministic under identical seed', () => {
    const a = run('spawn-budget-deterministic');
    const b = run('spawn-budget-deterministic');
    expect(b.enemyCount).toBe(a.enemyCount);
    expect(b.ids).toEqual(a.ids);
  });
});
