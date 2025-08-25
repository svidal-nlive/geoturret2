import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { createRenderSystem } from './renderSystem';
import { GameOrchestrator } from '../engine';
import { listPalettes, getPalette } from '../content/theme/palettes';

// Minimal offscreen canvas polyfill for tests
class OffscreenCanvasCtx {
  fillStyle: any; strokeStyle: any; globalAlpha = 1; canvas: any; _draws: { fillRect: any[] } = { fillRect: [] };
  constructor(public width: number, public height: number) { this.canvas = { width, height }; }
  save() {}
  restore() {}
  translate() {}
  scale() {}
  beginPath() {}
  arc() {}
  fill() {}
  stroke() {}
  fillRect(x:number,y:number,w:number,h:number){ this._draws.fillRect.push([this.fillStyle,x,y,w,h]); }
  getContext() { return this; }
}

describe('theme cycling render colors', () => {
  it('changes background color with theme switch', () => {
    const state = createGameState();
    const o = new GameOrchestrator({ seed: 'theme-test', fixedStep: 1/60 });
    const render = createRenderSystem(state);
    // Inject fake canvas
    const canvas: any = new OffscreenCanvasCtx(400,300);
    (global as any).document = { getElementById: (id: string) => id === 'game' ? canvas : null };
  render.init?.({} as any);
    // First theme
    state.theme = 'default';
    render.update?.(0, {} as any);
    const palDefault = getPalette('default');
    const firstBg = canvas._draws.fillRect[0][0];
    expect(firstBg).toBe(palDefault.bg);
    // Switch theme
    const ids = listPalettes();
    const next = ids.includes('highContrast') ? 'highContrast' : ids.find(i=> i !== 'default')!;
    state.theme = next as any;
    canvas._draws.fillRect = [];
    render.update?.(0, {} as any);
    const palNext = getPalette(next);
    const secondBg = canvas._draws.fillRect[0][0];
    expect(secondBg).toBe(palNext.bg);
    if (palNext.bg !== palDefault.bg) {
      expect(secondBg).not.toBe(firstBg);
    }
  });
});
