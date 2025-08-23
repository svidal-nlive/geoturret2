import fs from 'node:fs';
import { runSimulation } from './simCore';

interface Baseline { version: number; seed: string; targetWave: number; accelPerFrame: number; maxSeconds: number; hash: string; frame: number; kills: number; rngState: number; }

const baselinePath = new URL('./sim-baseline.json', import.meta.url);
const data: Baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

const result = runSimulation({ seed: data.seed, targetWave: data.targetWave, accelPerFrame: data.accelPerFrame, maxSeconds: data.maxSeconds, initialWaveTarget: undefined });

let ok = true;
if (result.hash !== data.hash) { console.error(`Baseline hash mismatch: expected ${data.hash} got ${result.hash}`); ok = false; }
if (result.frame !== data.frame) { console.error(`Baseline frame mismatch: expected ${data.frame} got ${result.frame}`); ok = false; }
if (result.kills !== data.kills) { console.error(`Baseline kills mismatch: expected ${data.kills} got ${result.kills}`); ok = false; }
if (result.rngState !== data.rngState) { console.error(`Baseline rngState mismatch: expected ${data.rngState} got ${result.rngState}`); ok = false; }
if (!ok) process.exit(1); else console.log(`Baseline OK hash=${data.hash}`);