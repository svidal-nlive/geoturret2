import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine/orchestrator';
import { createGameState } from '../state/gameState';
import { createWaveSystem } from '../systems/waveSystem';
import '../content/initialContent';

function run(seed: string, targetWave = 15) {
  const state = createGameState();
  const o = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
  // Accelerator system to speed progression while preserving determinism.
  o.register({ id: 'waveAccelerator', order: -95, update: () => { if (state.wave < targetWave) { state.waveKills += 5; state.kills += 5; } } });
  o.register(createWaveSystem(state));
  o.init();
  const maxSeconds = 30; let t = 0; const step = o.getStep();
  while (t < maxSeconds && state.wave < targetWave) { o.advance(step); t += step; }
  return { snap: o.snapshot(), state };
}

describe('long simulation determinism (accelerated to wave 15)', () => {
  it('same seed reaches identical wave & kills and rng state', () => {
    const a = run('sim-seed-1');
    const b = run('sim-seed-1');
    expect(a.state.wave).toBeGreaterThanOrEqual(10); // sanity progressed
    expect(a.state.wave).toBe(b.state.wave);
    expect(a.state.kills).toBe(b.state.kills);
    expect(a.snap.rngState).toBe(b.snap.rngState);
  });
  it('different seed diverges in rng state (may differ in kills/wave)', () => {
    const a = run('sim-seed-2');
    const b = run('sim-seed-3');
    expect(a.snap.rngState).not.toBe(b.snap.rngState);
  });
});
