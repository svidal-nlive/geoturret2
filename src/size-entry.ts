// Lightweight entry used only for size regression guard to approximate core engine cost
// Excludes optional HUD, audio, boss content, extended systems to keep baseline meaningful.
import { GameOrchestrator } from './engine';
import './content/initialContent';
import { createGameState } from './state/gameState';
import { createPlayerSystem } from './systems/playerSystem';
import { createInputSystem } from './systems/inputSystem';
import { createEnemySystem } from './systems/enemySystem';
import { createBulletSystem } from './systems/bulletSystem';
import { createCollisionSystem } from './systems/collisionSystem';
import { createRenderSystem } from './systems/renderSystem';

const state = createGameState();
const orchestrator = new GameOrchestrator({ seed: 'size-seed', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
// Register only essential systems for minimal gameplay loop footprint.
orchestrator.register(createInputSystem());
orchestrator.register(createPlayerSystem(state));
orchestrator.register(createEnemySystem(state));
orchestrator.register(createBulletSystem(state));
orchestrator.register(createCollisionSystem(state));
orchestrator.register(createRenderSystem(state));
// Initialize and perform a couple of fixed steps to ensure tree-shaking can't drop code paths.
orchestrator.init();
for (let i=0;i<3;i++) orchestrator.advance(1/60);
// Expose orchestrator for any debug hooking (optional)
(window as any).orchestrator = orchestrator;
