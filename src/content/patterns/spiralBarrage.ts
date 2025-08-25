/**
 * Boss pattern: spiral-barrage
 * Deterministic spiral of inward & outward enemy spawn arcs to stress spawn pacing without huge volume.
 * Duration: 240 frames (4s) after 60f warmup. Spawns every 20f creating 6 enemies arranged in a rotating arc.
 */
import { GameState, Enemy } from '../../state/gameState';
import { spawnPatternProjectile } from './util/patternProjectile';
import { spawnParticle } from '../../content/effects/particle';
import { BossPattern } from '../bossPattern';

export function createSpiralBarragePattern(state: GameState): BossPattern {
  let frame = 0; // pattern-local frame counter
  const warmup = 60;
  const activeDuration = 240; // frames after warmup
  return {
    id: 'spiral-barrage',
    version: 1,
    start() { /* no RNG draws needed for deterministic spiral */ },
    update(_dt, _ctx) {
      frame++;
      if (frame <= warmup) return false; // still warming up
      const activeFrame = frame - warmup; // 1..activeDuration
      if (activeFrame % 20 === 1) { // spawn burst every 20 pattern frames
        const baseAngle = ((activeFrame-1)/20) * (Math.PI / 8) % (Math.PI*2);
    for (let i=0;i<6;i++) {
          const slot = state.enemyPool.acquire();
          if (!slot) break;
            const angle = baseAngle + i * (Math.PI / 3);
            const dist = 150;
            const speed = 30 + i * 2;
            slot.id = state.nextEnemyId++;
            slot.x = Math.cos(angle) * dist;
            slot.y = Math.sin(angle) * dist;
            const dir = (i % 2 === 0) ? -1 : 1;
            slot.vx = Math.cos(angle) * speed * dir;
            slot.vy = Math.sin(angle) * speed * dir;
            slot.hp = 1; slot.alive = true;
            (state.enemies as Enemy[]).push(slot as Enemy);
      // Spawn outward projectile ring (pooled) for visual density without enemy count growth
      const projSpeed = 60;
      spawnPatternProjectile(state, { x: slot.x, y: slot.y, vx: Math.cos(angle) * projSpeed, vy: Math.sin(angle) * projSpeed, ttl: 2.5 });
            // Particle burst (small radial cluster) using pooled particles
            for (let j=0;j<3;j++) {
              const offA = angle + j * (Math.PI * 2 / 3);
              spawnParticle(state, { x: slot.x, y: slot.y, vx: Math.cos(offA) * 10, vy: Math.sin(offA) * 10, ttl: 0.5, size: 2, color: '#fa4' });
            }
        }
      }
  if (activeFrame >= activeDuration) return true; // signal completion once active window elapsed
      return false;
    }
  };
}
