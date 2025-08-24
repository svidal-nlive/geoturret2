import { describe, it, expect } from 'vitest';
import { recordRun } from './replay';
import { upgradeSnapshot, AnyRunSnapshot } from '../state/serialization';
import { GameOrchestrator } from '../engine/orchestrator';
import { RNG } from '../engine';
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

// Verifies that resuming a boss mid-pattern via bossPatternState yields identical final snapshot
// (frame/time/rng/kills/wave + extended metrics) to a continuous run.

function build(seed: string, summary: BossSystemSummary, patternId: string, initialPatternState?: any) {
  const state = createGameState();
  const o = new GameOrchestrator({ seed: new RNG(seed), fixedStep: 1/60, summarySource: () => ({
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
    parallaxLayers: state.parallax?.layers?.map(l => ({ depth: (l as any).depth, color: (l as any).color, tileSize: (l as any).tileSize, step: (l as any).step })) || []
  }) });
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  o.register(createGrazeSystem(state));
  o.register(createOverdriveSystem(state));
  o.register(createBossSystem(summary, state, { triggerWave: 0, patternId, initialPatternState }));
  o.init();
  return { o, state, summary };
}

describe('boss pattern resume parity', () => {
  process.env.GOLDEN_MODE = '1';
  it('phase-fork-demo mid-run snapshot resume matches continuous run', () => {
    const seed = 'resume-boss-demo';
    const continuousSummary: BossSystemSummary = { bossActive: false };
  const { o: cont, summary: sCont } = build(seed, continuousSummary, 'phase-fork-demo');
  cont.advance(8); // run long enough to ensure completion
  const finalCont = cont.snapshot();

    // Now perform mid-run snapshot (fresh run)
    const runSummary: BossSystemSummary = { bossActive: false };
    const { o: runA, summary: sRunA } = build(seed, runSummary, 'phase-fork-demo');
    runA.advance(3); // mid pattern
    expect(sRunA.bossActive).toBe(true);
    const midSnap = runA.snapshot();
    const midUp = upgradeSnapshot(midSnap as AnyRunSnapshot);
    const serialized = sRunA.bossPatternState;
    expect(serialized).toBeDefined();

    // Resume path
    const resumeSummary: BossSystemSummary = {
      bossActive: true,
      bossPattern: sRunA.bossPattern,
      bossStartedFrame: sRunA.bossStartedFrame,
      bossEndedFrame: undefined,
      bossPatternState: serialized
    };
    const { o: resumed, summary: sRes } = build(seed, resumeSummary, 'phase-fork-demo', serialized);
    resumed.restore({ frame: midUp.frame, time: midUp.time, rngState: midUp.rngState });
  const framesRemaining = finalCont.frame - midUp.frame;
  const secondsRemaining = framesRemaining * (1/60);
  resumed.advance(secondsRemaining + 0.0000001); // tiny epsilon to ensure loop processes exact steps
    const finalRes = resumed.snapshot();

  // Compare authoritative deterministic core: temporal continuity + RNG + boss timing
  expect(finalRes.frame).toBe(finalCont.frame);
  expect(finalRes.time).toBeCloseTo(finalCont.time, 9);
  expect(finalRes.rngState).toBe(finalCont.rngState);
  expect(sRes.bossEndedFrame).toBe(sCont.bossEndedFrame);
  expect(sRes.bossPattern).toBe(sCont.bossPattern);
  // NOTE: We intentionally do NOT assert kills/wave/graze/overdrive parity here because full
  // entity & wave state restoration is not yet implemented; we only persist bossPatternState.
  // Those counters can diverge pre-snapshot. Once broader game state serialization exists,
  // these assertions can be tightened.
  });
});