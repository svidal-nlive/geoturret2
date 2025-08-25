import { System } from '../engine';
import type { GameState } from '../state/gameState';
// Minimal render system: background clear + player + basic enemies + bullets only.
// Omits parallax layers, particles, boss telegraphs, pattern projectiles, fairness aids.
// Used exclusively by size-entry to keep size baseline focused on core loop primitives.
export function createCoreRenderSystem(state: GameState): System {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  function init() {
    canvas = document.getElementById('game') as HTMLCanvasElement | null;
    if (!canvas) return; ctx = canvas.getContext('2d');
  }
  return {
    id: 'render-core', order: 100,
    init: () => { if (typeof document !== 'undefined') init(); },
    update: () => {
      if (!canvas || !ctx) return;
      const pal: any = (state as any).theme && (globalThis as any).theme?.getPalette ? (globalThis as any).theme.getPalette() : { bg: '#000', playerStroke: '#fff', enemy: '#f44', bullet: '#4af' };
      ctx.fillStyle = pal.bg || '#000';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      // Player
      ctx.strokeStyle = pal.playerStroke || '#fff';
      ctx.beginPath(); ctx.arc((state as any).player?.x || 0, (state as any).player?.y || 0, 10, 0, Math.PI*2); ctx.stroke();
      // Bullets
      ctx.fillStyle = pal.bullet || '#4af';
      for (const b of state.bullets) if (b.alive) ctx.fillRect(b.x-2, b.y-2, 4,4);
      // Enemies
      ctx.fillStyle = pal.enemy || '#f44';
      for (const e of state.enemies) if (e.alive) { ctx.beginPath(); ctx.arc(e.x, e.y, 8, 0, Math.PI*2); ctx.fill(); }
    }
  };
}
