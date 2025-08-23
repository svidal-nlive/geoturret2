import { System, OrchestratorContext } from '../engine';
import { GameState } from '../state/gameState';
import { player } from './playerSystem';

// Single definitive render system (previous duplicate implementations merged).
export function createRenderSystem(state: GameState): System {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  function init() {
    canvas = document.getElementById('game') as HTMLCanvasElement | null;
    if (!canvas) return; ctx = canvas.getContext('2d');
  }
  function clear() {
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  function translateOrigin() {
    if (!canvas || !ctx) return;
    ctx.save();
    const baseX = canvas.width/(2*devicePixelRatio);
    const baseY = canvas.height/(2*devicePixelRatio);
    ctx.translate(baseX, baseY);
    // Camera zoom
    const z = state.camera.zoom || 1;
    ctx.scale(z, z);
    // Apply camera offset + shake
    ctx.translate(-state.camera.x + (state.camera.shakeX||0)/z, -state.camera.y + (state.camera.shakeY||0)/z);
  }
  function restore() { if (ctx) ctx.restore(); }
  return {
    id: 'render', order: 100,
    init: () => { if (typeof window !== 'undefined') init(); },
    update: () => {
      if (!canvas || !ctx) return;
      clear();
      translateOrigin();
      // Parallax background: use cached layers from parallax system (fallback to static if absent)
      const renderLayers = state.parallax?.layers?.length ? state.parallax!.layers : [
        { depth: 0.2, offsetX: state.camera.x * 0.2, offsetY: state.camera.y * 0.2 },
        { depth: 0.5, offsetX: state.camera.x * 0.5, offsetY: state.camera.y * 0.5 },
      ];
      for (const l of renderLayers) {
        const parX = (l as any).offsetX;
        const parY = (l as any).offsetY;
        const color = (l as any).color || (l.depth < 0.3 ? '#113' : '#225');
        ctx.fillStyle = color;
        const size = (l as any).tileSize || (l.depth < 0.3 ? 1800 : 1200);
        const step = (l as any).step || (l.depth < 0.3 ? 140 : 90);
        const startX = Math.floor((parX - size/2)/step)*step;
        const startY = Math.floor((parY - size/2)/step)*step;
        for (let x = startX; x < parX + size/2; x += step) {
          for (let y = startY; y < parY + size/2; y += step) {
            const sx = x - parX;
            const sy = y - parY;
            ctx.fillRect(sx, sy, 2,2);
          }
        }
      }
      // Player
      ctx.strokeStyle = '#0af';
      ctx.beginPath(); ctx.arc(player.x, player.y, 10, 0, Math.PI*2); ctx.stroke();
      // Bullets
      ctx.fillStyle = '#ff0';
      for (const b of state.bullets) if (b.alive) ctx.fillRect(b.x-2, b.y-2, 4,4);
      // Enemies
      ctx.fillStyle = '#f44';
      for (const e of state.enemies) if (e.alive) { ctx.beginPath(); ctx.arc(e.x, e.y, 8, 0, Math.PI*2); ctx.fill(); }
      restore();
    }
  };
}
