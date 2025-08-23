/* Headless deterministic simulation harness CLI. */
import { runSimulation } from './simCore';

const result = runSimulation({
  seed: process.env.SIM_SEED || 'sim-seed',
  targetWave: parseInt(process.env.SIM_TARGET_WAVE || '15', 10),
  maxSeconds: parseFloat(process.env.SIM_SECONDS || '30'),
  accelPerFrame: parseInt(process.env.SIM_ACCEL_KILLS_PER_FRAME || '5', 10),
  initialWaveTarget: process.env.SIM_INITIAL_WAVE_TARGET ? parseInt(process.env.SIM_INITIAL_WAVE_TARGET, 10) : undefined
});
console.log(JSON.stringify(result, null, 2));
if (result.reachedWave < result.targetWave) { console.error(`Did not reach target wave ${result.targetWave}; reached ${result.reachedWave}`); process.exitCode = 1; }