#!/usr/bin/env node
/**
 * Boss Pattern Performance Attribution
 * Runs a short deterministic boss pattern simulation with PERF_BOSS_ATTRIB=1 to collect
 * cumulative update vs serialization time and outputs per-frame averages.
 */
import { GameOrchestrator } from '../src/engine/orchestrator.js';
import { RNG } from '../src/engine/rng.js';
import { createGameState } from '../src/state/gameState.js';
import { createPlayerSystem } from '../src/systems/playerSystem.js';
import { createWaveSystem } from '../src/systems/waveSystem.js';
import { createEnemySystem } from '../src/systems/enemySystem.js';
import { createBulletSystem } from '../src/systems/bulletSystem.js';
import { createCollisionSystem } from '../src/systems/collisionSystem.js';
import { createGrazeSystem } from '../src/systems/grazeSystem.js';
import { createOverdriveSystem } from '../src/systems/overdriveSystem.js';
import { createBossSystem } from '../src/systems/bossSystem.js';
import '../src/content/initialContent.js';

const seed = process.env.SEED || 'attrib-phase';
const pattern = process.env.PATTERN || 'phase-fork-demo';
process.env.GOLDEN_MODE = '1';
process.env.PERF_BOSS_ATTRIB = '1';

const state = createGameState();
const summary = { bossActive:false };
const o = new GameOrchestrator({ seed: new RNG(seed), fixedStep:1/60, summarySource: () => ({
  kills: state.kills,
  wave: state.wave,
  grazeCount: state.grazeCount,
  overdriveMeter: state.overdriveMeter,
  overdriveActive: state.overdriveActive,
  bossActive: summary.bossActive,
  bossPattern: summary.bossPattern,
  bossStartedFrame: summary.bossStartedFrame,
  bossEndedFrame: summary.bossEndedFrame,
  bossPatternState: summary.bossPatternState
}) });

// Register systems
[o.register(createPlayerSystem(state)),
 o.register(createWaveSystem(state)),
 o.register(createEnemySystem(state)),
 o.register(createBulletSystem(state)),
 o.register(createCollisionSystem(state)),
 o.register(createGrazeSystem(state)),
 o.register(createOverdriveSystem(state)),
 o.register(createBossSystem(summary, state, { triggerWave:0, patternId: pattern }))];

o.init();
// Run enough seconds; pattern durations vary; 15s ample for demo patterns
o.advance(15);

const frames = summary.bossPatternFrames || 0;
if (frames === 0) {
  console.error('[boss-perf] Pattern did not run');
  process.exit(1);
}
const upd = summary.bossPatternUpdateMs || 0;
const ser = summary.bossPatternSerializeMs || 0;
const avgUpd = upd / frames;
const avgSer = ser / frames;
const pctSer = ser / (upd + ser) * 100;
console.log(JSON.stringify({ pattern, seed, frames, updateMs: +upd.toFixed(3), serializeMs: +ser.toFixed(3), avgUpdateMs: +avgUpd.toFixed(4), avgSerializeMs: +avgSer.toFixed(4), serializePct: +pctSer.toFixed(2) }, null, 2));
