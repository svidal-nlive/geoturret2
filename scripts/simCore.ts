import { GameOrchestrator } from '../src/engine/orchestrator';
import { createGameState } from '../src/state/gameState';
import { createWaveSystem } from '../src/systems/waveSystem';
import { RNG } from '../src/engine/rng';
import '../src/content/initialContent';

export interface SimulationOptions {
  seed: string;
  targetWave: number;
  maxSeconds: number;
  accelPerFrame: number;
  initialWaveTarget?: number;
}

export interface SimulationResult {
  seed: string;
  targetWave: number;
  reachedWave: number;
  kills: number;
  frame: number;
  time: number;
  rngState: number;
  hash: string;
}

export function runSimulation(opts: SimulationOptions): SimulationResult {
  const state = createGameState();
  if (opts.initialWaveTarget) state.waveTarget = opts.initialWaveTarget;
  const rng = new RNG(opts.seed);
  const orchestrator = new GameOrchestrator({ seed: rng, fixedStep: 1/60, summarySource: () => ({
    kills: state.kills,
    wave: state.wave,
    grazeCount: (state as any).grazeCount ?? 0,
    overdriveMeter: (state as any).overdriveMeter ?? 0,
    overdriveActive: (state as any).overdriveActive ?? false
  }) });
  orchestrator.register({ id: 'waveAccelerator', order: -95, update: () => { if (state.wave < opts.targetWave) { state.waveKills += opts.accelPerFrame; state.kills += opts.accelPerFrame; } } });
  orchestrator.register(createWaveSystem(state));
  orchestrator.init();
  let t = 0; const step = orchestrator.getStep();
  while (t < opts.maxSeconds && state.wave < opts.targetWave) { orchestrator.advance(step); t += step; }
  const snap = orchestrator.snapshot();
  let h = 2166136261 >>> 0;
  const mix = (n: number) => { h ^= (n >>> 0); h = Math.imul(h, 16777619) >>> 0; };
  mix(snap.rngState); mix(state.kills); mix(state.wave);
  // Include extended metrics if present (graze & overdrive) to tighten future determinism guard.
  // Values may be zero in this accelerated harness which omits those systems, but any future
  // non-zero introduction will deliberately shift the baseline prompting an intentional update.
  const g = (snap.summary as any).grazeCount || 0;
  const odm = (snap.summary as any).overdriveMeter || 0; // 0..1 float
  const oda = (snap.summary as any).overdriveActive ? 1 : 0;
  mix(g);
  mix(Math.floor(odm * 1000)); // quantize to 1e-3 to avoid excessive baseline churn
  mix(oda);
  const hash = ('00000000' + h.toString(16)).slice(-8);
  return { seed: opts.seed, targetWave: opts.targetWave, reachedWave: state.wave, kills: state.kills, frame: snap.frame, time: snap.time, rngState: snap.rngState, hash };
}
