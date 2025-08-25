import { System, OrchestratorContext } from '../engine';
import { GameState } from '../state/gameState';

export interface ParallaxLayerConfig { depth: number; density?: number; color?: string; tileSize?: number; step?: number; }

/**
 * Dedicated parallax system. Computes per-layer offsets from camera and caches
 * lightweight data in state.parallax.layers for render consumption. Pure data; no DOM.
 */
export function createParallaxSystem(state: GameState, layers?: ParallaxLayerConfig[]): System {
  let layerDefs: ParallaxLayerConfig[] = layers?.length ? layers : [
    { depth: 0.2, density: 0.5, color: '#113', tileSize: 1800, step: 140 },
    { depth: 0.5, density: 0.8, color: '#225', tileSize: 1200, step: 90 },
  ];
  if (typeof window !== 'undefined') {
    const validate = (d: any): d is ParallaxLayerConfig => {
      return d && typeof d.depth === 'number' && isFinite(d.depth) && d.depth > 0 && d.depth <= 2;
    };
    const sanitize = (d: any): ParallaxLayerConfig => ({
      depth: Math.max(0.01, Math.min(2, +d.depth)),
      density: typeof d.density === 'number' ? Math.max(0, Math.min(5, d.density)) : undefined,
      color: typeof d.color === 'string' ? d.color : undefined,
      tileSize: typeof d.tileSize === 'number' && d.tileSize > 0 ? Math.min(8192, d.tileSize) : undefined,
      step: typeof d.step === 'number' && d.step > 0 ? Math.min(1024, d.step) : undefined
    });
    const persist = () => {
      try {
        const encoded = encodeURIComponent(JSON.stringify(layerDefs));
        // Update URL param without adding history entry
        if (typeof history !== 'undefined') {
          const url = new URL(window.location.href);
            url.searchParams.set('parallaxJ', encoded);
            history.replaceState(null, '', url.toString());
        }
        // LocalStorage backup
        window.localStorage.setItem('parallaxLayers', JSON.stringify(layerDefs));
      } catch {}
    };
    (window as any).parallaxSetLayers = (defs: ParallaxLayerConfig[]) => {
      if (Array.isArray(defs) && defs.every(validate)) { layerDefs = defs.map(sanitize); persist(); }
    };
    (window as any).parallaxAddLayer = (def: ParallaxLayerConfig) => {
      if (validate(def)) { layerDefs.push(sanitize(def)); persist(); return true; } return false;
    };
    (window as any).parallaxRemoveLayer = (index: number) => {
      if (typeof index === 'number' && index >=0 && index < layerDefs.length) { layerDefs.splice(index,1); persist(); return true; } return false;
    };
    (window as any).parallaxUpdateLayer = (index: number, patch: Partial<ParallaxLayerConfig>) => {
      if (index < 0 || index >= layerDefs.length) return false;
      const merged = { ...layerDefs[index], ...patch };
      if (validate(merged)) { layerDefs[index] = sanitize(merged); persist(); return true; }
      return false;
    };
    (window as any).parallaxListLayers = () => layerDefs.map(l => ({ ...l }));
    (window as any).parallaxSerializeLayers = () => encodeURIComponent(JSON.stringify(layerDefs));
    (window as any).parallaxPersist = persist;
    // URL param (?parallaxJ=<url-encoded JSON array>) persistence
    try {
      const url = new URL(window.location.href);
      const raw = url.searchParams.get('parallaxJ');
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (Array.isArray(parsed) && parsed.every(validate)) {
          layerDefs = parsed.map(sanitize);
          // Optionally write back canonical form (skip to avoid history pollution)
        }
      } else {
        // Fallback to localStorage
        const stored = window.localStorage.getItem('parallaxLayers');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.every(validate)) layerDefs = parsed.map(sanitize);
        }
      }
    } catch (e) {
      console.warn('[parallax] failed to parse parallaxJ param', e);
    }
  }
  // Ensure state.parallax exists
  if (!state.parallax) state.parallax = { layers: [] };
  let frozen = false; // freeze positions but keep layers
  let disabled = false; // hide all layers
  if (typeof window !== 'undefined') {
    (window as any).parallaxSetFrozen = (v: boolean) => { frozen = !!v; };
    (window as any).parallaxSetDisabled = (v: boolean) => { disabled = !!v; };
    (window as any).parallaxGetState = () => ({ frozen, disabled });
  }
  return {
    id: 'parallax', order: 80, // before render (100)
    update: (_dt: number, _ctx: OrchestratorContext) => {
      if (disabled || state.motionReduction) {
        // When disabled or motionReduction active, keep last static snapshot (no scrolling)
        if (state.parallax!.layers.length === 0) {
          state.parallax!.layers = layerDefs.map(ld => ({ depth: ld.depth, offsetX: 0, offsetY: 0, color: ld.color, tileSize: ld.tileSize, step: ld.step }));
        }
        return;
      }
      if (frozen) return; // do not update offsets
      state.parallax!.layers = layerDefs.map(ld => ({ depth: ld.depth, offsetX: state.camera.x * ld.depth, offsetY: state.camera.y * ld.depth, color: ld.color, tileSize: ld.tileSize, step: ld.step }));
    }
  };
}
