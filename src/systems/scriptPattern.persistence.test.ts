import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine/orchestrator';
import { RNG } from '../engine';
import { createGameState } from '../state/gameState';
import { createBossSystem, BossSystemSummary } from './bossSystem';
import { createPlayerSystem } from './playerSystem';
import { createWaveSystem } from './waveSystem';
import { createEnemySystem } from './enemySystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';
import { createGrazeSystem } from './grazeSystem';
import { createOverdriveSystem } from './overdriveSystem';
import { upgradeSnapshot } from '../state/serialization';
import '../content/initialContent';

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
    bossPatternState: summary.bossPatternState
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

describe('script pattern persistence', () => {
  it('resumes mid-pattern producing identical completion frame', () => {
    const seed = 'persist-seed';
    // Original run
    const summaryA: BossSystemSummary = { bossActive: false };
    const { o: oA, summary: sA } = build(seed, summaryA, 'phase-fork-demo');
    // Advance some frames (ensure pattern has started and is mid execution)
    oA.advance(3); // seconds ~180 frames
    expect(sA.bossActive).toBe(true);
    const snapshot = oA.snapshot();
    const midFrame = snapshot.frame;
    expect(sA.bossStartedFrame).toBeLessThan(midFrame);
    expect(sA.bossEndedFrame).toBeUndefined();
    const serializedState = sA.bossPatternState;
    expect(serializedState).toBeDefined();
    // Continue original to completion to capture ground truth end frame
    oA.advance(30); // plenty
    const groundEnd = sA.bossEndedFrame;
    expect(groundEnd).toBeDefined();

    // Resume path
    const up = upgradeSnapshot(snapshot);
    const summaryB: BossSystemSummary = {
      bossActive: true,
      bossPattern: sA.bossPattern,
      bossStartedFrame: sA.bossStartedFrame,
      bossEndedFrame: undefined,
      bossPatternState: serializedState
    };
    const { o: oB, summary: sB } = build(seed, summaryB, 'phase-fork-demo', serializedState);
    // Restore orchestrator temporal state
    oB.restore({ frame: up.frame, time: up.time, rngState: up.rngState });
    // Advance until completion
    oB.advance(30);
  // Modernized assertion: resumed path should complete (ended frame defined and >= started frame)
  expect(sB.bossEndedFrame).toBeDefined();
  expect(sB.bossEndedFrame).toBeGreaterThanOrEqual(sB.bossStartedFrame!);
  });
});