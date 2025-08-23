import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine';
import { createGameState } from '../state/gameState';
import { createPlayerSystem } from './playerSystem';
import { createEnemySystem } from './enemySystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';
import { createRenderSystem } from './renderSystem';
import { createWaveSystem } from './waveSystem';
import { createInputSystem } from './inputSystem';

describe('render system order', () => {
  it('registers after core simulation systems', () => {
    const state = createGameState();
  const o = new GameOrchestrator({ seed: 't', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(createInputSystem());
    o.register(createPlayerSystem(state));
    o.register(createWaveSystem(state));
    o.register(createEnemySystem(state));
    o.register(createBulletSystem(state));
    o.register(createCollisionSystem(state));
    o.register(createRenderSystem(state));
    // Access private for test via cast (order already applied after each register)
    const systems: any[] = (o as any).systems;
    const renderIndex = systems.findIndex(s => s.id === 'render');
    const collisionIndex = systems.findIndex(s => s.id === 'collision');
    expect(renderIndex).toBeGreaterThan(collisionIndex);
  });
});
