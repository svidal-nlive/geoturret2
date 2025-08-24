import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine/orchestrator';
import { RNG } from '../engine/rng';
import { createGameState } from '../state/gameState';
import { createPlayerSystem } from '../systems/playerSystem';
import { createWaveSystem } from '../systems/waveSystem';
import { createEnemySystem } from '../systems/enemySystem';
import { createBulletSystem } from '../systems/bulletSystem';
import { createCollisionSystem } from '../systems/collisionSystem';
import { createGrazeSystem } from '../systems/grazeSystem';
import { createOverdriveSystem } from '../systems/overdriveSystem';
import { createBossSystem, BossSystemSummary } from '../systems/bossSystem';
import '../content/initialContent';

// RNG draw budget test: ensures each boss pattern's own execution (between bossStart & bossEnd)
// uses only the expected number of RNG draws (delta), ignoring other system usage.

// Budgets are conservative upper bounds: start phase draws + per-spawn randomness.
const PATTERN_BUDGETS: Record<string,{ max:number }> = {
  'safe-lane-volley': { max: 1 + 7* ( (240-60)/30 ) }, // 1 start + each volley spawn RNG (approx upper bound)
  'multi-beam-intersect': { max: 1 + 6 }, // 1 start + 6 orbit spawns
  'future-converge': { max: 3 }, // exactly 3
  'laser-cross': { max: 1 },
  'spiral-barrage': { max: 0 },
};

function runPattern(patternId: string) {
  process.env.GOLDEN_MODE='1';
  process.env.RNG_DRAW_COUNT_MODE='1';
  RNG.enableCounting = true;
  const summary: BossSystemSummary = { bossActive:false };
  const state = createGameState();
  const rng = new RNG(patternId+'-seed');
  const o = new GameOrchestrator({ seed: rng, fixedStep:1/60, summarySource: () => ({
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
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  o.register(createGrazeSystem(state));
  o.register(createOverdriveSystem(state));
  o.register(createBossSystem(summary, state, { triggerWave:0, patternId }));
  o.init();
  o.advance(8);
  return summary.bossPatternRngDraws ?? 0;
}

describe('rng draw budget', () => {
  for (const id of Object.keys(PATTERN_BUDGETS)) {
    it(`${id} within budget`, () => {
  const draws = runPattern(id);
  const { max } = PATTERN_BUDGETS[id];
  expect(draws).toBeLessThanOrEqual(max);
    });
  }
});
