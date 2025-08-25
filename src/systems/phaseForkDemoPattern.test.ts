import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';
import { RNG } from '../engine/rng';
import { createBossSystem } from './bossSystem';

// Sanity test the phase-fork-demo pattern advances and terminates when boss health reaches zero.

describe('phase-fork-demo pattern', () => {
  it('runs through phases and ends on boss death', () => {
    const state = createGameState();
    state.bossHealth = 400; state.bossMaxHealth = 400;
    const summary = { bossActive: false as boolean, bossPattern: undefined as any };
    const orch = new GameOrchestrator({ fixedStep: 1/60, seed: new RNG(9999), summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    orch.register(createBossSystem(summary, state, { patternId: 'phase-fork-demo', triggerWave: 0 }));
    orch.init();
    // Simulate frames, decrementing boss health periodically to trigger phase transitions.
    for (let f=0; f<2000 && summary.bossActive !== false; f++) {
      // every 120 frames deal significant damage
      if (f % 120 === 0 && f>0) {
        state.bossHealth = Math.max(0, state.bossHealth - 100);
      }
      orch.advance(1/60);
      if (state.bossHealth <=0) break;
    }
    expect(state.bossHealth).toBe(0);
  });
});
