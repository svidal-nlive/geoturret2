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

// RNG shim removed: all randomness now routed through orchestrator-provided RNG.

// Seed via URL (?seed=foo) default static.
const url = new URL(window.location.href);
const seed = url.searchParams.get('seed') || 'dev-seed';
const autoPause = url.searchParams.get('autopause') === '1';

const gameState = createGameState();
const orchestrator = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({
  kills: gameState.kills,
  wave: gameState.wave,
  grazeCount: gameState.grazeCount,
  overdriveMeter: gameState.overdriveMeter,
  overdriveActive: gameState.overdriveActive,
  parallaxLayers: gameState.parallax?.layers?.map(l => {
    const ext = l as any; // extended metadata added by parallax system
    return { depth: ext.depth, color: ext.color, tileSize: ext.tileSize, step: ext.step };
  }) || []
}) });
orchestrator.register(createInputSystem());
orchestrator.register(createCameraSystem(gameState));
orchestrator.register(createPlayerSystem(gameState));
orchestrator.register(createWaveSystem(gameState));
orchestrator.register(createEnemySystem(gameState));
orchestrator.register(createBulletSystem(gameState));
orchestrator.register(createCollisionSystem(gameState));
orchestrator.register(createRenderSystem(gameState));
// Ensure parallax registered before render (order 80 vs 100)
orchestrator.register(createParallaxSystem(gameState));

// Debug overlay (frame/time + optional profiling)
const overlay = document.getElementById('overlay')!;
let profiler = false;
let paused = false;
let stepOnce = false;
window.addEventListener('keydown', e => {
  if (e.key === 'p') { profiler = !profiler; orchestrator.enableProfiler(profiler); }
  if (e.key === 's') { console.log('Snapshot', orchestrator.snapshot()); }
  if (e.key === ' ') { paused = !paused; }
  if (e.key === '.') { stepOnce = true; }
});

orchestrator.init();

let last = performance.now();
function loop(now: number) {
  const elapsed = (now - last) / 1000;
  last = now;
  if (!paused) orchestrator.advance(elapsed);
  else if (stepOnce) { orchestrator.advance(orchestrator.getStep()); stepOnce = false; }
  const metrics = orchestrator.getMetrics();
  overlay.textContent = `seed:${seed}\nframe:${metrics.frame}\ntime:${metrics.time.toFixed(2)}s\n(kills:${gameState.kills} wave:${gameState.wave})${paused ? ' [PAUSED]' : ''}\nE pool: inUse=${gameState.enemyPool.stats().inUse} free=${gameState.enemyPool.stats().free}\nB pool: inUse=${gameState.bulletPool.stats().inUse} free=${gameState.bulletPool.stats().free}` + (profiler && metrics.profiling ? '\n' + Object.entries(metrics.profiling).map(([k,v])=>`${k}:${v.toFixed(3)}ms`).join('\n') : '');
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('[Geoturret2] Dev harness started with seed', seed, autoPause ? '(paused)' : '');
