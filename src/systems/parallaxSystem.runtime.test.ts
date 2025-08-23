import { describe, it, expect, beforeEach } from 'vitest';
import { createParallaxSystem, ParallaxLayerConfig } from './parallaxSystem';
import { createGameState } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';

function mockWindow(url = 'http://localhost/?'): any {
  const store: Record<string,string> = {};
  const win: any = {
    location: { href: url },
  localStorage: { getItem: (k:string)=>store[k]||null, setItem:(k:string,v:string)=>{store[k]=v;}, removeItem:(k:string)=>{delete store[k];} },
    history: { replaceState: (_:any, __:any, href:string)=>{ win.location.href = href; } },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (global as any).window = win;
  (global as any).history = win.history; // expose global history for code path
  return win;
}

describe('parallax system runtime APIs', () => {
  beforeEach(() => { delete (global as any).window; });

  it('exposes layer manipulation APIs and persists to URL/localStorage', () => {
    const win = mockWindow();
    const state = createGameState();
    const sys = createParallaxSystem(state, [ { depth: 0.3, color:'#111', tileSize:1000, step:80 } ]);
    const o = new GameOrchestrator({ seed:'para-run', fixedStep:1/60 });
    o.register(sys);
    o.init();
    // First update populates cache
    o.advance(o.getStep());
    expect(state.parallax!.layers[0].depth).toBeCloseTo(0.3);
    // Add layer
    const added = (win as any).parallaxAddLayer({ depth: 0.6, color:'#222', tileSize: 500, step:40 } as ParallaxLayerConfig);
    expect(added).toBe(true);
    // Update existing layer
    const updated = (win as any).parallaxUpdateLayer(0, { depth: 0.4 });
    expect(updated).toBe(true);
    // Remove second layer
    const removed = (win as any).parallaxRemoveLayer(1);
    expect(removed).toBe(true);
    const list = (win as any).parallaxListLayers();
    expect(list.length).toBe(1);
    expect(list[0].depth).toBeCloseTo(0.4);
    // Serialize & persist
    const ser = (win as any).parallaxSerializeLayers();
    expect(typeof ser).toBe('string');
    (win as any).parallaxPersist();
    expect(win.location.href.includes('parallaxJ=')).toBe(true);
    expect(win.localStorage.getItem('parallaxLayers')).toBeTruthy();
  });

  it('restores from URL encoded param', () => {
    const encoded = encodeURIComponent(JSON.stringify([{ depth:0.7, color:'#abc' }]));
    mockWindow(`http://localhost/?parallaxJ=${encoded}`);
    const state = createGameState();
    const sys = createParallaxSystem(state);
    const o = new GameOrchestrator({ seed:'para-restore', fixedStep:1/60 });
    o.register(sys); o.init(); o.advance(o.getStep());
    expect(state.parallax!.layers[0].depth).toBeCloseTo(0.7);
  });
});
