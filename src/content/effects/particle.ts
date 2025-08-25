import { GameState, Particle, ParticleVariant } from '../../state/gameState';
import { globalRng } from '../../engine';

let nextParticleId = 1;

export interface ParticleSpawnOptions { x: number; y: number; vx?: number; vy?: number; ttl?: number; size?: number; color?: string; variant?: ParticleVariant; }

export function spawnParticle(state: GameState, opts: ParticleSpawnOptions): Particle | undefined {
  // Accessibility: motion/visual reduction. Strategy:
  //  - Probabilistically skip spawning 50% of non-critical particles when enabled.
  //  - Reduce lifetime & size modestly for remaining particles to limit on-screen motion.
  if (state.motionReduction) {
    // Always allow key variants we may treat as feedback (sparks), but thin generic/trail/ember/burst.
    const v = opts.variant;
    const critical = v === 'spark';
    // Use deterministic rng so tests / replays stable.
    if (!critical && globalRng.next() < 0.5) return; // skip spawn entirely
  }
  const slot = state.particlePool.acquire();
  if (!slot) return;
  slot.id = nextParticleId++;
  slot.x = opts.x; slot.y = opts.y;
  slot.vx = opts.vx ?? 0; slot.vy = opts.vy ?? 0;
  let ttl = opts.ttl ?? 0.6;
  let size = opts.size ?? 2;
  if (state.motionReduction) {
    ttl *= 0.6; // shorter lifetime
    size = Math.max(1, size * 0.8);
  }
  slot.ttl = ttl;
  slot.initialTtl = slot.ttl;
  slot.size = size;
  slot.color = opts.color ?? '#fa4';
  slot.variant = opts.variant ?? 'generic';
  slot.alive = true;
  state.particles.push(slot);
  return slot;
}

// Specialized variant helpers
export function spawnSpark(state: GameState, x: number, y: number, angle: number, speed: number) {
  return spawnParticle(state, { x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, ttl: 0.4, size: 2, color: '#ffd54a', variant: 'spark' });
}

export function spawnEmber(state: GameState, x: number, y: number, rng?: { next(): number }) {
  const r = rng || { next: () => Math.random() };
  const angle = (r.next()*Math.PI*2); // deterministic when rng provided
  const speed = 10 + r.next()*10;
  return spawnParticle(state, { x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, ttl: 0.9, size: 3, color: '#ff8733', variant: 'ember' });
}

export function spawnTrail(state: GameState, x: number, y: number, baseColor = '#8cf') {
  return spawnParticle(state, { x, y, ttl: 0.3, size: 3, color: baseColor, variant: 'trail' });
}

export function spawnBurst(state: GameState, x: number, y: number, count = 8) {
  const actual = state.motionReduction ? Math.max(3, Math.round(count * 0.4)) : count;
  const speed = state.motionReduction ? 32 : 50;
  for (let i=0;i<actual;i++) {
    const ang = (Math.PI*2*i)/actual;
    spawnParticle(state, { x, y, vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed, ttl: 0.45, size: 2, color: '#f5f5f5', variant: 'burst' });
  }
}
