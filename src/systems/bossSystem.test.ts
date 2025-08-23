import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine/orchestrator';
import { createGameState } from '../state/gameState';
import { createPlayerSystem } from './playerSystem';
import { createWaveSystem } from './waveSystem';
import { createEnemySystem } from './enemySystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';
import { createGrazeSystem } from './grazeSystem';
import { createOverdriveSystem } from './overdriveSystem';
import { createBossSystem, BossSystemSummary } from './bossSystem';
import '../content/initialContent';

function buildOrchestrator(seed: string) {
  const state = createGameState();
  const summary: BossSystemSummary = { bossActive: false };
  const o = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({
    kills: state.kills,
    wave: state.wave,
    grazeCount: state.grazeCount,
    overdriveMeter: state.overdriveMeter,
    overdriveActive: state.overdriveActive,
    bossActive: summary.bossActive,
    bossPattern: summary.bossPattern,
    bossStartedFrame: summary.bossStartedFrame,
    bossEndedFrame: summary.bossEndedFrame
  }) });
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  o.register(createGrazeSystem(state));
  o.register(createOverdriveSystem(state));
  o.register(createBossSystem(summary, state, { triggerWave: 1 }));
  o.init();
  return { o, summary };
}

describe('bossSystem lifecycle', () => {
  it('starts and ends deterministic pattern', () => {
    const { o, summary } = buildOrchestrator('boss-test-seed');
    // Advance until pattern expected to complete (wave1 triggers at ~10 kills; pattern lasts 180 frames ~3s)
  o.advance(20); // seconds (ample for wave trigger + 3s pattern)
  expect(summary.bossPattern).toBe('laser-cross');
  expect(summary.bossStartedFrame).toBeDefined();
  // Pattern should have ended by now
  expect(summary.bossEndedFrame).toBeDefined();
  expect(summary.bossActive).toBe(false);
    // Determinism: rerun with same seed yields same start/end frames
    const { o: o2, summary: s2 } = buildOrchestrator('boss-test-seed');
  o2.advance(20);
    expect(s2.bossStartedFrame).toBe(summary.bossStartedFrame);
    expect(s2.bossEndedFrame).toBe(summary.bossEndedFrame);
  });
});
