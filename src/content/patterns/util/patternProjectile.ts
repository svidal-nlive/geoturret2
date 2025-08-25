import { GameState, PatternProjectile } from '../../../state/gameState';

let nextPatternProjectileId = 1;

export function spawnPatternProjectile(state: GameState, opts: { x: number; y: number; vx: number; vy: number; ttl: number }): PatternProjectile | undefined {
  const slot = state.patternProjectilePool.acquire();
  if (!slot) return; // pool exhausted
  slot.id = nextPatternProjectileId++;
  slot.x = opts.x; slot.y = opts.y; slot.vx = opts.vx; slot.vy = opts.vy; slot.ttl = opts.ttl; slot.alive = true;
  state.patternProjectiles.push(slot);
  return slot;
}
