import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';
import { RNG } from '../engine/rng';
import { createBossSystem, BossSystemSummary } from './bossSystem';
import { createPlayerSystem } from './playerSystem';
import { createWaveSystem } from './waveSystem';
import { createEnemySystem } from './enemySystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';
import { createGrazeSystem } from './grazeSystem';
import { createOverdriveSystem } from './overdriveSystem';
import '../content/initialContent';

describe('boss abort API', () => {
  it('aborts active boss pattern early and records end frame', () => {
    const state = createGameState();
    const summary: BossSystemSummary = { bossActive: false };
    const orch = new GameOrchestrator({ fixedStep: 1/60, seed: new RNG('abort-seed'), summarySource: () => ({
      kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive,
      bossActive: summary.bossActive, bossPattern: summary.bossPattern, bossStartedFrame: summary.bossStartedFrame, bossEndedFrame: summary.bossEndedFrame, bossPatternState: summary.bossPatternState
    }) });
    orch.register(createPlayerSystem(state));
    orch.register(createWaveSystem(state));
    orch.register(createEnemySystem(state));
    orch.register(createBulletSystem(state));
    orch.register(createCollisionSystem(state));
    orch.register(createGrazeSystem(state));
    orch.register(createOverdriveSystem(state));
    orch.register(createBossSystem(summary, state, { triggerWave: 0, patternId: 'phase-fork-demo' }));
    orch.init();
    orch.advance(1); // advance some time; boss should be active
    expect(summary.bossActive).toBe(true);
    const started = summary.bossStartedFrame!;
    summary.bossAbortRequested = true;
    orch.advance(0.1); // next frame processes abort
    expect(summary.bossActive).toBe(false);
    expect(summary.bossEndedFrame).toBeGreaterThanOrEqual(started);
  });
});
