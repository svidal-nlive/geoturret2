import { System, OrchestratorContext } from '../engine';
import { GameState } from '../state/gameState';
import { getPalette } from '../content/theme/palettes';
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
    const pal = getPalette(state.theme);
    ctx.fillStyle = pal.bg;
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
      const pal = getPalette(state.theme);
      // Parallax background: use cached layers from parallax system (fallback to static if absent)
      const renderLayers = state.parallax?.layers?.length ? state.parallax!.layers : [
        { depth: 0.2, offsetX: state.camera.x * 0.2, offsetY: state.camera.y * 0.2 },
        { depth: 0.5, offsetX: state.camera.x * 0.5, offsetY: state.camera.y * 0.5 },
      ];
      for (const l of renderLayers) {
        const parX = (l as any).offsetX;
        const parY = (l as any).offsetY;
        const color = (l as any).color || (l.depth < 0.3 ? pal.parallaxLow : pal.parallaxMid);
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
    ctx.strokeStyle = pal.playerStroke;
      ctx.beginPath(); ctx.arc(player.x, player.y, 10, 0, Math.PI*2); ctx.stroke();
      // Bullets
    ctx.fillStyle = pal.bullet;
      for (const b of state.bullets) if (b.alive) ctx.fillRect(b.x-2, b.y-2, 4,4);
  // Pattern projectiles (distinct color)
  ctx.fillStyle = pal.patternProjectile;
  for (const pp of (state as any).patternProjectiles || []) if (pp.alive) ctx.fillRect(pp.x-2, pp.y-2, 4,4);
  // Particles (fading size optional future: alpha) 
  for (const p of (state as any).particles || []) if (p.alive) {
  // Override particle colors with palette variants when variant recognized.
  if (p.variant === 'spark') ctx.fillStyle = pal.particleSpark; else if (p.variant === 'ember') ctx.fillStyle = pal.particleEmber; else if (p.variant === 'trail') ctx.fillStyle = pal.particleTrail; else ctx.fillStyle = pal.particleGeneric;
        if (p.variant === 'spark') {
          ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } else if (p.variant === 'ember') {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2); ctx.fill();
        } else if (p.variant === 'trail') {
          ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size*1.5, p.size/2);
        } else if (p.variant === 'burst') {
          ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } else {
          ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
      }
      // Enemies
      ctx.fillStyle = pal.enemy;
      for (const e of state.enemies) if (e.alive) { ctx.beginPath(); ctx.arc(e.x, e.y, 8, 0, Math.PI*2); ctx.fill(); }
      // Boss (simple circle + health bar if active or hp > 0)
      if (state.bossMaxHealth > 0 && state.bossHealth > 0) {
        ctx.strokeStyle = pal.bossStroke;
        ctx.beginPath(); ctx.arc(state.bossHitbox.x, state.bossHitbox.y, state.bossHitbox.radius, 0, Math.PI*2); ctx.stroke();
        // Health bar above
        const pct = state.bossHealth / state.bossMaxHealth;
        ctx.fillStyle = pal.bossHpBack; ctx.fillRect(state.bossHitbox.x - 40, state.bossHitbox.y - state.bossHitbox.radius - 14, 80, 6);
        ctx.fillStyle = pal.bossHpFront; ctx.fillRect(state.bossHitbox.x - 40, state.bossHitbox.y - state.bossHitbox.radius - 14, 80*pct, 6);
      }
      // Fairness aid: safe-lane telegraph & active lane visualization.
      if (state.currentBossPatternId === 'safe-lane-volley') {
        const patternState: any = (state as any).__bossPatternState;
        if (patternState && typeof patternState.safeLane === 'number') {
          const telegraph = !!patternState.telegraph;
          const safeLane = patternState.safeLane as 0 | 1; // 0=top
          const topY = -200, laneH = 200; // match pattern geometry constants
          const fairnessAdj = state.fairness.adjustmentFactor || 1;
          ctx.save();
          // Telegraph: show BOTH lanes tinted (safe vs hazard) with stronger alpha, then reduce once volley active.
          const intensity = (state.safeLaneHighlightIntensity == null ? 1 : state.safeLaneHighlightIntensity);
          // Amplify alpha during telegraph when fairnessAdj >1 (player struggling) up to +50%
          const alphaBoost = telegraph ? (1 + Math.min(0.5, (fairnessAdj - 1) * 0.5)) : 1;
            // Add a subtle breathing pulse while telegraphing scaled by adj
          if (telegraph) {
            const pulse = 0.9 + Math.sin(performance.now()/300) * 0.1 * Math.min(1, fairnessAdj-1);
            ctx.globalAlpha = (telegraph ? 0.35 : 0.15) * intensity * alphaBoost * pulse;
          } else {
            ctx.globalAlpha = (telegraph ? 0.35 : 0.15) * intensity * alphaBoost;
          }
          // Top lane
          ctx.fillStyle = safeLane === 0 ? pal.safeLaneSafe : pal.safeLaneHazard;
          const widthScale = telegraph ? (1 + Math.min(0.15, (fairnessAdj - 1) * 0.15)) : 1; // widen a bit when struggling
          const teleWidth = 1600 * widthScale;
          ctx.fillRect(-teleWidth/2, topY, teleWidth, laneH);
          // Bottom lane
          ctx.fillStyle = safeLane === 1 ? pal.safeLaneSafe : pal.safeLaneHazard;
          ctx.fillRect(-teleWidth/2, topY + laneH, teleWidth, laneH);
          ctx.restore();
        }
      }
      // Arc preview pattern telegraph (pre-laser) uses patternState.arc spec
      if (state.currentBossPatternId === 'pre-laser-arc-preview') {
        const ps: any = (state as any).__bossPatternState;
        if (ps && ps.arc) {
          const fairnessAdj = state.fairness.adjustmentFactor || 1;
          ctx.save();
          const { angle, span, radius } = ps.arc; // radians
          const sweep = span * (1 + Math.min(0.5, (fairnessAdj - 1) * 0.4)); // widen arc if struggling
          ctx.strokeStyle = pal.safeLaneSafe;
          ctx.lineWidth = 18 * (1 + Math.min(0.4, (fairnessAdj - 1) * 0.3));
          ctx.globalAlpha = 0.28 * (1 + Math.min(0.5, (fairnessAdj - 1) * 0.4));
          ctx.beginPath();
          ctx.arc(0, 0, radius, angle - sweep/2, angle + sweep/2);
          ctx.stroke();
          // Fill subtle wedge
          ctx.globalAlpha *= 0.4;
          ctx.fillStyle = pal.safeLaneSafe;
          ctx.beginPath();
          ctx.moveTo(0,0);
          ctx.arc(0,0,radius, angle - sweep/2, angle + sweep/2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      // Laser arc sweep pattern rendering
      if (state.currentBossPatternId === 'laser-arc-sweep') {
        const ps: any = (state as any).__bossPatternState;
        if (ps && ps.arc) {
          const { angle, span, radius } = ps.arc;
          const firing = !!ps.firing;
          const telegraph = !!ps.telegraph;
          const cxLocal = 0, cyLocal = 0; // origin (world center already translated earlier if consolidation exists)
          ctx.save();
          if (telegraph) {
            ctx.fillStyle = 'rgba(255,120,40,0.25)';
            ctx.beginPath(); ctx.moveTo(cxLocal,cyLocal);
            ctx.arc(cxLocal,cyLocal,radius, angle - span/2, angle + span/2, false);
            ctx.closePath(); ctx.fill();
          } else if (firing) {
            // Draw dangerous area outside safe arc (invert wedge)
            ctx.fillStyle = 'rgba(255,40,40,0.18)';
            ctx.beginPath();
            const start = angle - span/2;
            const end = angle + span/2;
            ctx.moveTo(cxLocal,cyLocal);
            ctx.arc(cxLocal,cyLocal,radius, end, start + Math.PI*2, false);
            ctx.closePath();
            ctx.fill();
            // Emphasize safe arc outline
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cxLocal,cyLocal,radius, start, end, false);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      restore();
    }
  };
}
