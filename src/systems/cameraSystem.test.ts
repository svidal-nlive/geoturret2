import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { createCameraSystem } from './cameraSystem';
import { player } from './playerSystem';
import { GameOrchestrator } from '../engine';

describe('cameraSystem', () => {
  it('smoothly follows player', () => {
    const state = createGameState();
    player.x = 0; player.y = 0;
    const camSys = createCameraSystem(state, { stiffness: 20 });
  const o = new GameOrchestrator({ seed: 'c', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(camSys);
    o.init();
    // Move player far away
    player.x = 300; player.y = -150;
    // Advance a few frames
    for (let i=0;i<30;i++) o.advance(o.getStep());
    // Camera should have moved toward player but not overshot; within some bound
    expect(state.camera.x).toBeGreaterThan(0);
    expect(state.camera.y).toBeLessThan(0);
    // Not fully reached (lag) roughly less than target
    expect(state.camera.x).toBeLessThan(300);
    expect(state.camera.y).toBeGreaterThan(-150);
  });
  it('clamps to world bounds (circular legacy)', () => {
    const state = createGameState();
    const camSys = createCameraSystem(state, { stiffness: 50, worldRadius: 100 });
  const o = new GameOrchestrator({ seed: 'c2', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(camSys); o.init();
    player.x = 10000; player.y = 0; // far outside
    for (let i=0;i<120;i++) o.advance(o.getStep());
    const dist = Math.hypot(state.camera.x, state.camera.y);
    expect(dist).toBeLessThanOrEqual(100 + 1e-6);
  });

  it('deadzone prevents tiny jitter', () => {
    const state = createGameState();
    const camSys = createCameraSystem(state, { stiffness: 100, deadzone: 20 });
  const o = new GameOrchestrator({ seed: 'c3', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(camSys); o.init();
    for (let dx of [1, -1, 2, -2, 3, -3]) { player.x = dx; player.y = 0; o.advance(o.getStep()); }
    expect(Math.abs(state.camera.x)).toBeLessThan(5);
  });

  it('clamps to rectangular bounds', () => {
    const state = createGameState();
    const camSys = createCameraSystem(state, { stiffness: 40, bounds: { minX: -50, maxX: 50, minY: -20, maxY: 20 } });
  const o = new GameOrchestrator({ seed: 'c4', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(camSys); o.init();
    player.x = 500; player.y = -500;
    for (let i=0;i<200;i++) o.advance(o.getStep());
    expect(state.camera.x).toBeLessThanOrEqual(50);
    expect(state.camera.y).toBeGreaterThanOrEqual(-20);
  });

  it('smoothly zooms toward target zoom', () => {
    const state = createGameState();
    const camSys = createCameraSystem(state, { stiffness: 0, zoomStiffness: 12 });
  const o = new GameOrchestrator({ seed: 'c5', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(camSys); o.init();
    state.camera.targetZoom = 2;
    for (let i=0;i<60;i++) o.advance(o.getStep());
    expect(state.camera.zoom).toBeGreaterThan(1.3);
    expect(state.camera.zoom).toBeLessThan(2);
  });

  it('applies and decays shake', () => {
    const state = createGameState();
    const camSys = createCameraSystem(state, { stiffness: 0 });
  const o = new GameOrchestrator({ seed: 'c6', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(camSys); o.init();
    // trigger shake via state directly (avoid window dependency)
    state.camera.shakeDuration = 0.5;
    state.camera.shakeRemaining = 0.5;
    state.camera.shakeAmp = 30;
    state.camera.shakeFreq = 10;
    let maxObserved = 0;
    for (let i=0;i<40;i++) { o.advance(o.getStep()); maxObserved = Math.max(maxObserved, Math.abs(state.camera.shakeX) + Math.abs(state.camera.shakeY)); }
    expect(maxObserved).toBeGreaterThan(0);
    for (let i=0;i<60;i++) o.advance(o.getStep());
    expect(Math.abs(state.camera.shakeX) + Math.abs(state.camera.shakeY)).toBeLessThan(0.01);
  });

  it('adds velocity-based lead', () => {
    const state = createGameState();
    const camSys = createCameraSystem(state, { stiffness: 60, leadTime: 0.5, maxLead: 100 });
  const o = new GameOrchestrator({ seed: 'c7', fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
    o.register(camSys); o.init();
    // Simulate rapid player movement to the right
    for (let i=0;i<10;i++) { player.x += 50; o.advance(o.getStep()); }
    // Camera should be to the right of the actual player position start, and closer to player + lead vs player
    expect(state.camera.x).toBeGreaterThan(0);
    // Move no further so velocity zero; camera should settle back toward player (reducing lead effect)
    const camXWithLead = state.camera.x;
    for (let i=0;i<30;i++) o.advance(o.getStep());
    expect(state.camera.x).toBeLessThan(camXWithLead + 1e-6);
  });
});
