import { describe, it, expect } from 'vitest';
import { createInputSystem } from './inputSystem';
import { GameOrchestrator } from '../engine/orchestrator';
import { player } from './playerSystem';

function mockWindow(): any {
  const handlers: Record<string, Function[]> = {};
  const win: any = {
    addEventListener: (t:string, fn:Function) => { (handlers[t] ||= []).push(fn); },
    removeEventListener: (t:string, fn:Function) => { handlers[t] = (handlers[t]||[]).filter(f=>f!==fn); },
    dispatch: (t:string, e:any) => { (handlers[t]||[]).forEach(fn=>fn(e)); }
  };
  (global as any).window = win;
  return win;
}

describe('input system movement', () => {
  it('normalizes diagonal movement and updates player position', () => {
    const win = mockWindow();
    player.x = 0; player.y = 0;
    const sys = createInputSystem(100); // speed 100
    const o = new GameOrchestrator({ seed:'input-seed', fixedStep:1/60 });
    o.register(sys); o.init();
    // Simulate W+D (up+right) for one frame
    win.dispatch('keydown', { key:'w' });
    win.dispatch('keydown', { key:'d' });
    o.advance(o.getStep());
  const dist = Math.hypot(player.x, player.y);
  // Distance should equal speed * dt
  expect(dist).toBeCloseTo(100 * (1/60), 4);
  // Both axes moved with equal magnitude; x positive (right), y negative (up)
  expect(Math.abs(player.x)).toBeCloseTo(Math.abs(player.y), 4);
  expect(player.x).toBeGreaterThan(0);
  expect(player.y).toBeLessThan(0);
  });
});
