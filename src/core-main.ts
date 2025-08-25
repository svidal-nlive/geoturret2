// Core-first entry focusing on simulation + rendering; optional systems loaded asynchronously.
import { GameOrchestrator } from './engine';
import './content/initialContent';
import { createGameState } from './state/gameState';
import { createPlayerSystem } from './systems/playerSystem';
import { createInputSystem } from './systems/inputSystem';
import { createEnemySystem } from './systems/enemySystem';
import { createBulletSystem } from './systems/bulletSystem';
import { createCollisionSystem } from './systems/collisionSystem';
import { createRenderSystem } from './systems/renderSystem';
import { createCameraSystem } from './systems/cameraSystem';
import { createWaveSystem } from './systems/waveSystem';
import { createParallaxSystem } from './systems/parallaxSystem';
import { createFairnessSystem } from './systems/fairnessSystem';
import { createGrazeSystem } from './systems/grazeSystem';
import { createOverdriveSystem } from './systems/overdriveSystem';
import { createEconomySystem } from './systems/economySystem';
import { createSurvivabilitySystem } from './systems/survivabilitySystem';
import { loadOptionals } from './optional/loader';

const url = new URL(window.location.href);
const seed = url.searchParams.get('seed') || 'core-seed';
const state = createGameState();
const orchestrator = new GameOrchestrator({ seed, fixedStep: 1/60 });
orchestrator.register(createInputSystem());
orchestrator.register(createCameraSystem(state));
orchestrator.register(createPlayerSystem(state));
orchestrator.register(createWaveSystem(state));
orchestrator.register(createEnemySystem(state));
orchestrator.register(createBulletSystem(state));
orchestrator.register(createCollisionSystem(state));
orchestrator.register(createRenderSystem(state));
orchestrator.register(createParallaxSystem(state));
orchestrator.register(createFairnessSystem(state));
orchestrator.register(createGrazeSystem(state));
orchestrator.register(createOverdriveSystem(state));
orchestrator.register(createEconomySystem(state));
orchestrator.register(createSurvivabilitySystem(state));
orchestrator.init();

// Kick simulation loop (simple RAF)
function loop() { orchestrator.advance(1/60); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

// Load optional heavy systems after first frame
loadOptionals(orchestrator, state, seed).then(res => {
  if (res.boss) res.boss.register();
  if (res.hud) res.hud();
});

// Expose orchestrator for debugging
(window as any).orchestrator = orchestrator;
