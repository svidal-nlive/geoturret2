import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { createParallaxSystem } from './parallaxSystem';
import { createCameraSystem } from './cameraSystem';
import { GameOrchestrator } from '../engine';

describe('parallaxSystem', () => {
  it('computes layer offsets relative to camera', () => {
    const state = createGameState();
    const cam = createCameraSystem(state, { stiffness: 0 });
    const par = createParallaxSystem(state, [
      { depth: 0.25, color: '#111' },
      { depth: 0.6, color: '#222' }
    ]);
  const o = new GameOrchestrator({ seed: 'px', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(cam);
    o.register(par);
    o.init();
    // Move camera manually
    state.camera.x = 400; state.camera.y = -200;
    o.advance(o.getStep());
    expect(state.parallax?.layers.length).toBe(2);
    const [l1, l2] = state.parallax!.layers;
    expect(l1.offsetX).toBeCloseTo(400 * 0.25);
    expect(l2.offsetX).toBeCloseTo(400 * 0.6);
  });
});
