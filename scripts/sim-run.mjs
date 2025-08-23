// Headless deterministic simulation harness.
// Advances waves rapidly (optional accelerator) until target wave or time reached.
import { GameOrchestrator } from '../src/engine/orchestrator.js';
import { createGameState } from '../src/state/gameState.js';
import { createWaveSystem } from '../src/systems/waveSystem.js';
import { RNG } from '../src/engine/rng.js';
import '../src/content/initialContent.js';

const seed = process.env.SIM_SEED || 'sim-seed';
const targetWave = parseInt(process.env.SIM_TARGET_WAVE || '15', 10);
const maxSeconds = parseFloat(process.env.SIM_SECONDS || '30'); // simulated seconds (fixed step based)
const accelPerFrame = parseInt(process.env.SIM_ACCEL_KILLS_PER_FRAME || '5', 10); // accelerate progression

const state = createGameState();
// Optionally allow overriding initial wave target for quicker progression
if (process.env.SIM_INITIAL_WAVE_TARGET) {
  state.waveTarget = parseInt(process.env.SIM_INITIAL_WAVE_TARGET, 10) || state.waveTarget;
}

const rng = new RNG(seed);
const orchestrator = new GameOrchestrator({ seed: rng, fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave }) });

// Accelerator system (test-only); increments kills and waveKills artificially.
const accelerator = {
  id: 'waveAccelerator', order: -95,
  update: () => {
    if (state.wave < targetWave) {
      state.waveKills += accelPerFrame;
      state.kills += accelPerFrame;
    }
  }
};

orchestrator.register(accelerator);
orchestrator.register(createWaveSystem(state));
orchestrator.init();

let t = 0; const step = orchestrator.getStep();
while (t < maxSeconds && state.wave < targetWave) {
  orchestrator.advance(step);
  t += step;
}
const snap = orchestrator.snapshot();

function hash(val) { // simple numeric hash of rng state + kills + wave
  let h = 2166136261 >>> 0;
  function mix(n){ h ^= n >>> 0; h = Math.imul(h,16777619)>>>0; }
  mix(snap.rngState);
  mix(state.kills);
  mix(state.wave);
  return ('00000000'+h.toString(16)).slice(-8);
}

console.log(JSON.stringify({ seed, targetWave, reachedWave: state.wave, kills: state.kills, frame: snap.frame, time: snap.time, rngState: snap.rngState, hash: hash() }, null, 2));
if (state.wave < targetWave) {
  console.error(`Did not reach target wave ${targetWave}; reached wave ${state.wave}`);
  process.exitCode = 1;
}