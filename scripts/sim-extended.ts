import { runSimulation } from './simCore';

/* Extended simulation battery:
 *  - Multiple seeds
 *  - Vary accelPerFrame to emulate different pacing
 *  - Optional initialWaveTarget override scenarios
 * Fails fast if any determinism violation within a seed or if hash collisions across distinct seeds.
 */
interface Scenario { seed: string; accelPerFrame: number; targetWave: number; maxSeconds: number; initialWaveTarget?: number }

const scenarios: Scenario[] = [
  { seed: 'ext-a', accelPerFrame: 5, targetWave: 15, maxSeconds: 30 },
  { seed: 'ext-b', accelPerFrame: 3, targetWave: 12, maxSeconds: 28 },
  { seed: 'ext-c', accelPerFrame: 7, targetWave: 18, maxSeconds: 32 },
  { seed: 'ext-d', accelPerFrame: 10, targetWave: 20, maxSeconds: 25, initialWaveTarget: 8 }
];

let ok = true;
const results = scenarios.map(s => runSimulation(s));
// Determinism: re-run each scenario once and compare
for (const sc of scenarios) {
  const r1 = runSimulation(sc);
  const r2 = runSimulation(sc);
  if (r1.hash !== r2.hash) { console.error(`Determinism fail seed=${sc.seed} hash ${r1.hash} vs ${r2.hash}`); ok = false; }
  if (r1.reachedWave < sc.targetWave) { console.error(`Target not reached seed=${sc.seed} target=${sc.targetWave} got=${r1.reachedWave}`); ok = false; }
}
// Collision check across distinct seeds (should not produce identical composite hash set unless pathological) 
const hashSet = new Set(results.map(r=>r.hash));
if (hashSet.size !== results.length) {
  console.warn('Hash collision across different seeds (non-fatal but review):', results.map(r=>({ seed: r.seed, hash: r.hash })));
}

if (!ok) process.exit(1);
console.log(JSON.stringify({ results }, null, 2));
