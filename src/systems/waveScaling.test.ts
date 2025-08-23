import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';
import { createWaveSystem } from './waveSystem';

/**
 * Verifies multi-advance scaling formula for waves:
 * target_{n+1} = ceil(min(100, target_n * 1.25))
 * starting from initial 10 (see `createGameState`).
 */
describe('wave scaling progression', () => {
  it('applies ceil(target * 1.25) each advance until cap', () => {
    const state = createGameState();
  const o = new GameOrchestrator({ seed: 'wave-scale-seed', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(createWaveSystem(state));
    o.init();
    const expected: number[] = [10];
    // Pre-compute first 8 targets (after each advance) using same formula.
    for (let i = 0; i < 7; i++) {
      const next = Math.min(100, Math.ceil(expected[expected.length - 1] * 1.25));
      expected.push(next);
    }
    const seen: number[] = [state.waveTarget];
    // Advance waves by manually satisfying kill threshold each tick.
    for (let adv = 0; adv < expected.length - 1; adv++) {
      state.waveKills = state.waveTarget; // meet threshold
      o.advance(o.getStep());
      seen.push(state.waveTarget);
    }
    expect(seen).toEqual(expected);
  });

  it('deterministic across different seeds (seed-independent)', () => {
    const run = (seed: string) => {
      const state = createGameState();
  const o = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
      o.register(createWaveSystem(state));
      o.init();
      const seq: number[] = [state.waveTarget];
      for (let i=0;i<5;i++) { state.waveKills = state.waveTarget; o.advance(o.getStep()); seq.push(state.waveTarget); }
      return seq;
    };
    const a = run('seed-a');
    const b = run('seed-b');
    expect(a).toEqual(b);
  });
});
