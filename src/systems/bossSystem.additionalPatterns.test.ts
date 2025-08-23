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

function build(seed: string) {
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
  o.register(createBossSystem(summary, state, { triggerWave: 1, seed }));
  o.init();
  return { o, summary };
}

describe('additional boss patterns', () => {
  it('safe-lane-volley deterministic duration', () => {
    const { o, summary } = build('boss-safe-test');
    o.advance(25); // seconds sufficient
    expect(summary.bossPattern).toBe('safe-lane-volley');
    expect(summary.bossStartedFrame).toBeDefined();
    expect(summary.bossEndedFrame).toBeDefined();
    const dur = (summary.bossEndedFrame! - summary.bossStartedFrame!);
    expect(dur).toBeGreaterThanOrEqual(240); // pattern internal frame count
  });
  it('multi-beam-intersect deterministic duration', () => {
    const { o, summary } = build('boss-multi-test');
    o.advance(30);
    expect(summary.bossPattern).toBe('multi-beam-intersect');
    expect(summary.bossStartedFrame).toBeDefined();
    expect(summary.bossEndedFrame).toBeDefined();
    const dur = (summary.bossEndedFrame! - summary.bossStartedFrame!);
    expect(dur).toBeGreaterThanOrEqual(300);
  });
});
