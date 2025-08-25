#!/usr/bin/env tsx
/**
 * Boss Pattern Performance Attribution (TypeScript)
 * Runs a short deterministic boss pattern simulation with PERF_BOSS_ATTRIB=1 to collect
 * cumulative update vs serialization time and outputs per-frame averages.
 */
import { GameOrchestrator } from '../src/engine/orchestrator';
import { RNG } from '../src/engine/rng';
import { createGameState } from '../src/state/gameState';
import { createPlayerSystem } from '../src/systems/playerSystem';
import { createWaveSystem } from '../src/systems/waveSystem';
import { createEnemySystem } from '../src/systems/enemySystem';
import { createBulletSystem } from '../src/systems/bulletSystem';
import { createCollisionSystem } from '../src/systems/collisionSystem';
import { createGrazeSystem } from '../src/systems/grazeSystem';
import { createOverdriveSystem } from '../src/systems/overdriveSystem';
import { createBossSystem } from '../src/systems/bossSystem';
import '../src/content/initialContent';

const seed = process.env.SEED || 'attrib-phase';
const pattern = process.env.PATTERN || 'phase-fork-demo';
process.env.GOLDEN_MODE = '1';
process.env.PERF_BOSS_ATTRIB = '1';

const state = createGameState();
const summary: any = { bossActive: false };
const orchestrator = new GameOrchestrator({
  seed: new RNG(seed),
  fixedStep: 1 / 60,
  summarySource: () => ({
    kills: state.kills,
    wave: state.wave,
    grazeCount: state.grazeCount,
    overdriveMeter: state.overdriveMeter,
    overdriveActive: state.overdriveActive,
    bossActive: summary.bossActive,
    bossPattern: summary.bossPattern,
    bossStartedFrame: summary.bossStartedFrame,
    bossEndedFrame: summary.bossEndedFrame,
    bossPatternState: summary.bossPatternState,
  }),
});

// Register systems (order matters if dependencies exist)
[
  createPlayerSystem(state),
  createWaveSystem(state),
  createEnemySystem(state),
  createBulletSystem(state),
  createCollisionSystem(state),
  createGrazeSystem(state),
  createOverdriveSystem(state),
  createBossSystem(summary, state, { triggerWave: 0, patternId: pattern }),
].forEach((s) => orchestrator.register(s));

orchestrator.init();
// Run enough time; pattern durations vary; 15s ample for demo patterns
orchestrator.advance(15);

const frames: number = summary.bossPatternFrames || 0;
if (frames === 0) {
  console.error('[boss-perf] Pattern did not run');
  process.exit(1);
}
const upd: number = summary.bossPatternUpdateMs || 0;
const ser: number = summary.bossPatternSerializeMs || 0;
const avgUpd = upd / frames;
const avgSer = ser / frames;
const pctSer = ser / (upd + ser) * 100;

const result = {
  pattern,
  seed,
  frames,
  updateMs: +upd.toFixed(3),
  serializeMs: +ser.toFixed(3),
  avgUpdateMs: +avgUpd.toFixed(4),
  avgSerializeMs: +avgSer.toFixed(4),
  serializePct: +pctSer.toFixed(2),
};

// Include script metrics captured in summary (if any)
if (summary.bossPatternScriptMetrics) {
  (result as any).scriptMetrics = summary.bossPatternScriptMetrics;
}

console.log(JSON.stringify(result, null, 2));
