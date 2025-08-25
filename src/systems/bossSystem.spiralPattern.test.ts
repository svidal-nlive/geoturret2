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
  o.register(createBossSystem(summary, state, { triggerWave: 0, seed }));
  o.init();
  return { o, summary, state };
}

describe('spiral-barrage boss pattern', () => {
  it('activates and completes within expected frame window', () => {
  const { o, summary } = build('spiral-seed-test');
  o.advance(8); // seconds (should cover warmup+active duration (~5s))
    expect(summary.bossPattern).toBe('spiral-barrage');
    expect(summary.bossStartedFrame).toBeDefined();
    expect(summary.bossEndedFrame).toBeDefined();
  const dur = (summary.bossEndedFrame! - summary.bossStartedFrame!);
  expect(dur).toBeGreaterThanOrEqual(280 - 20); // near expected total (allow some jitter)
  expect(dur).toBeLessThanOrEqual(320);
  });
  it('deterministic enemy spawn count across identical seed', () => {
    const a = build('boss-spiral-determinism');
    a.o.advance(20);
    const enemyCountA = a.state.enemies.length;
    const b = build('boss-spiral-determinism');
    b.o.advance(20);
    expect(b.state.enemies.length).toBe(enemyCountA);
  });
});
