import { runSimulation } from './simCore';

// Seeds
const seedA = process.env.SIM_SEED_A || 'ci-seed';
const seedB = process.env.SIM_SEED_B || 'ci-seed-b';
const targetWave = parseInt(process.env.SIM_TARGET_WAVE || '15', 10);
const accelPerFrame = parseInt(process.env.SIM_ACCEL_KILLS_PER_FRAME || '5', 10);
const maxSeconds = parseFloat(process.env.SIM_SECONDS || '30');

const r1 = runSimulation({ seed: seedA, targetWave, accelPerFrame, maxSeconds, initialWaveTarget: undefined });
const r2 = runSimulation({ seed: seedA, targetWave, accelPerFrame, maxSeconds, initialWaveTarget: undefined });
const rDiff = runSimulation({ seed: seedB, targetWave, accelPerFrame, maxSeconds, initialWaveTarget: undefined });

let ok = true;
if (r1.hash !== r2.hash) { console.error(`Determinism failure: same seed hash mismatch ${r1.hash} vs ${r2.hash}`); ok = false; }
if (r1.hash === rDiff.hash) { console.error(`Seed differentiation failure: different seed produced same hash ${r1.hash}`); ok = false; }
if (r1.reachedWave < targetWave || r2.reachedWave < targetWave || rDiff.reachedWave < targetWave) {
  console.error(`Target wave not reached: wanted ${targetWave} got r1=${r1.reachedWave} r2=${r2.reachedWave} rDiff=${rDiff.reachedWave}`);
  ok = false;
}
console.log(JSON.stringify({ r1, r2, rDiff }, null, 2));
if (!ok) process.exit(1);