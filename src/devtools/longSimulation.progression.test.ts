import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine/orchestrator';
import { createGameState } from '../state/gameState';
import { createWaveSystem } from '../systems/waveSystem';
import { eventBus } from '../engine/eventBus';
import '../content/initialContent';

/**
 * Headless progression parity test (P1-9):
 * For a fixed seed with deterministic accelerated kills, assert the sequence
 * of wave transitions (frame + new waveTarget) up to wave 15 remains stable.
 * This guards unintentional wave scaling / pacing shifts beyond simple final-state checks.
 */

describe('long simulation progression parity (waves 1-15)', () => {
  it('captures stable wave transition signature', () => {
    const state = createGameState();
    const seed = 'progression-seed-1';
    const accelPerFrame = 5; // keep in sync with simCore harness for parity
  const o = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: 0, overdriveMeter: 0, overdriveActive: false }) });
    o.register({ id: 'waveAccelerator', order: -95, update: () => { if (state.wave < 15) { state.waveKills += accelPerFrame; state.kills += accelPerFrame; } } });
    o.register(createWaveSystem(state));
    const transitions: { wave: number; frame: number; target: number }[] = [];
    const off = eventBus.on('waveStart', (e: any) => { if (e.wave <= 15) transitions.push({ wave: e.wave, frame: o.snapshot().frame, target: e.target }); });
    o.init();
    const step = o.getStep();
    let t = 0; const maxSeconds = 30;
    while (t < maxSeconds && state.wave < 15) { o.advance(step); t += step; }
    off();
    expect(state.wave).toBeGreaterThanOrEqual(15);

    // Expected deterministic signature (update if intentional pacing change):
    const expected = [
      // wave, frame, target (captured 2025-08-24; update intentionally only)
      { wave: 1, frame: 1,   target: 13 },
      { wave: 2, frame: 4,   target: 17 },
      { wave: 3, frame: 8,   target: 22 },
      { wave: 4, frame: 13,  target: 28 },
      { wave: 5, frame: 19,  target: 35 },
      { wave: 6, frame: 26,  target: 44 },
      { wave: 7, frame: 35,  target: 55 },
      { wave: 8, frame: 46,  target: 69 },
      { wave: 9, frame: 60,  target: 87 },
      { wave: 10, frame: 78, target: 100 },
      { wave: 11, frame: 98, target: 100 },
      { wave: 12, frame: 118,target: 100 },
      { wave: 13, frame: 138,target: 100 },
      { wave: 14, frame: 158,target: 100 },
      { wave: 15, frame: 178,target: 100 }
    ];

    // Compare lengths first
    expect(transitions.length).toBe(expected.length);
    // Strict field-by-field comparison
    for (let i=0;i<expected.length;i++) {
      const a = transitions[i];
      const b = expected[i];
      expect(a.wave).toBe(b.wave);
      expect(a.frame).toBe(b.frame);
      expect(a.target).toBe(b.target);
    }
  });
});
