import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { createWaveSystem } from './waveSystem';
import { GameOrchestrator } from '../engine/orchestrator';
import { createEnemySystem } from './enemySystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';
import { createPlayerSystem } from './playerSystem';
import { eventBus } from '../engine/eventBus';

describe('wave system', () => {
  it('advances wave after accumulating target kills', () => {
    const state = createGameState();
  const o = new GameOrchestrator({ seed: 'wave-seed', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(createPlayerSystem(state));
    o.register(createWaveSystem(state));
    // Inject kills manually to avoid depending on spawn & collision randomness
    state.waveKills = state.waveTarget; // meet threshold
    o.init();
    o.advance(0); // run one tick path (no time) -> wave system update invoked via advance loop (accumulator 0 so tick not called). Force tick by advancing fixed step.
    o.advance(o.getStep());
    expect(state.wave).toBe(1);
    expect(state.waveKills).toBe(0);
    expect(state.waveTarget).toBeGreaterThanOrEqual(10); // scaled
  });

  it('emits waveStart event', () => {
    const state = createGameState();
  const o = new GameOrchestrator({ seed: 'wave-evt', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    const waves: number[] = [];
    const off = eventBus.on('waveStart', w => waves.push(w.wave));
    o.register(createPlayerSystem(state));
    o.register(createWaveSystem(state));
    o.init();
    state.waveKills = state.waveTarget;
    o.advance(o.getStep());
    expect(waves).toEqual([1]);
    off();
  });

  it('integrates with combat systems producing progression deterministically', () => {
    const run = () => {
      const state = createGameState();
  const o = new GameOrchestrator({ seed: 'wave-full', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
      o.register(createPlayerSystem(state));
      o.register(createWaveSystem(state));
      o.register(createEnemySystem(state));
      o.register(createBulletSystem(state));
      o.register(createCollisionSystem(state));
      o.init();
      o.advance(8); // simulate 8s
      return { wave: state.wave, kills: state.kills };
    };
    const a = run();
    const b = run();
    expect(a.wave).toBe(b.wave);
    expect(a.kills).toBe(b.kills);
  });
});
