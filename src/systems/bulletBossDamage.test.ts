import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';
import { RNG } from '../engine/rng';
import { createBulletSystem } from './bulletSystem';
import { createBossSystem } from './bossSystem';

// Validate player bullets damage boss and log entries.

describe('bullet->boss damage', () => {
  it('applies damage and logs', () => {
    const state = createGameState();
    state.bossHealth = 200; state.bossMaxHealth = 200; state.bossHitbox.x = 0; state.bossHitbox.y = 0; state.bossHitbox.radius = 30;
    const orch = new GameOrchestrator({ fixedStep: 1/60, seed: new RNG(1234), summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    orch.register(createBulletSystem(state));
    orch.register(createBossSystem({ bossActive: true, bossPattern: 'scripted-demo' }, state, { patternId: 'scripted-demo', triggerWave: 0 }));
    orch.init();
    // Spawn one bullet manually centered on boss.
    const bullet = state.bulletPool.acquire();
    if (!bullet) throw new Error('pool');
    bullet.id = 1; bullet.x = 0; bullet.y = 0; bullet.vx = 0; bullet.vy = 0; bullet.alive = true;
    state.bullets.push(bullet);
    orch.advance(1/60);
    expect(state.bossHealth).toBe(188); // -12
    expect(state.bossDamageLog.length).toBe(1);
    expect(state.bossDamageLog[0].amount).toBe(12);
    expect(state.bossDamageLog[0].source).toBe('playerBullet');
  });
});
