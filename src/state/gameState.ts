/** Minimal game state for demo run (now with pooling). */
export interface Enemy { id: number; x: number; y: number; vx: number; vy: number; hp: number; alive: boolean; defId?: string; bounty?: number; bountyAwarded?: boolean; }
export interface Bullet { id: number; x: number; y: number; vx: number; vy: number; alive: boolean; }
export interface PatternProjectile { id: number; x: number; y: number; vx: number; vy: number; ttl: number; alive: boolean; }
export interface Particle { id: number; x: number; y: number; vx: number; vy: number; ttl: number; initialTtl: number; size: number; color: string; variant: ParticleVariant; alive: boolean; }

export type ParticleVariant = 'generic' | 'spark' | 'ember' | 'trail' | 'burst';

import { Pool } from '../engine/pool';

export interface GameState {
  enemies: Enemy[];
  bullets: Bullet[];
  patternProjectiles: PatternProjectile[];
  particles: Particle[];
  enemyPool: Pool<Enemy>;
  bulletPool: Pool<Bullet>;
  patternProjectilePool: Pool<PatternProjectile>;
  particlePool: Pool<Particle>;
  kills: number;
  /** Current wave index (placeholder until wave system implemented). */
  wave: number;
  /** Kills accumulated within current wave. */
  waveKills: number;
  /** Target kills needed to advance to next wave. */
  waveTarget: number;
  enemySpawnTimer: number;
  bulletTimer: number;
  nextEnemyId: number;
  nextBulletId: number;
  /** Camera data (world space + fx). */
  camera: { x: number; y: number; zoom: number; targetZoom: number; shakeRemaining: number; shakeDuration: number; shakeAmp: number; shakeFreq: number; shakeX: number; shakeY: number };
  /** Parallax layer offsets computed last frame (for render systems wanting cached values). */
  parallax?: { layers: { depth: number; offsetX: number; offsetY: number }[] };
  /** Graze stats */
  grazeCount: number; // total grazes this run
  grazeThisWave: number; // per-wave graze counter
  /** Overdrive meter 0..1 */
  overdriveMeter: number;
  overdriveActive: boolean;
  overdriveTimeRemaining: number;
  /** Boss (if active) current and max health for pattern predicates */
  bossHealth: number;
  bossMaxHealth: number;
  bossHitbox: { x: number; y: number; radius: number };
  /** Fairness metrics (updated during boss patterns). */
  fairness: {
    exposures: number; // count of telegraph exposures recorded
    minSafeWidth: number; // min observed safe angular width (radians or normalized units)
    recentHits: number; // hits within recent rolling window
    cumulativeUnsafeTime: number; // total time with no safe lane
  adjustmentFactor?: number; // multiplier >1 means widen / ease patterns
  _recentHitDecay?: number; // internal timer for passive decay mgmt
  };
  /** Recent boss damage events (ring buffer) for analytics / phase triggers. */
  bossDamageLog: { frame: number; amount: number; source: 'patternProjectile' | 'playerBullet'; hpAfter: number }[];
  /** Active boss pattern id (runtime convenience, null if none) */
  currentBossPatternId: string | null;
  /** Fairness aids: current safe lane index (0=top,1=bottom) when pattern exposes it, else null */
  safeLaneIndex: 0 | 1 | null;
  /** Accessibility: motion & visual comfort flags */
  motionReduction: boolean;
  /** Accessibility: safe lane highlight intensity (0.1 - 1.0) */
  safeLaneHighlightIntensity?: number;
  /** Active UI/theme palette id */
  theme: 'default' | 'highContrast' | 'highContrastDark' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  /** Player survivability (Phase 2 HUD placeholders) */
  playerHealth?: number;
  playerMaxHealth?: number;
  playerArmor?: number;
  playerMaxArmor?: number;
  /** Basic economy counter */
  coins?: number;
  /** Player death flag */
  playerDead?: boolean;
}

export function createGameState(): GameState {
  const enemyPool = new Pool<Enemy>({
    initial: 32,
    create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, alive: false }),
    reset: e => { e.alive = false; }
  });
  const bulletPool = new Pool<Bullet>({
    initial: 64,
    create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, alive: false }),
    reset: b => { b.alive = false; }
  });
  const patternProjectilePool = new Pool<PatternProjectile>({
    initial: 32,
    create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, ttl: 0, alive: false }),
    reset: p => { p.alive = false; p.ttl = 0; }
  });
  const particlePool = new Pool<Particle>({
    initial: 64,
    create: () => ({ id: 0, x: 0, y: 0, vx: 0, vy: 0, ttl: 0, initialTtl: 0, size: 2, color: '#fff', variant: 'generic', alive: false }),
    reset: p => { p.alive = false; p.ttl = 0; p.initialTtl = 0; p.variant = 'generic'; }
  });
  return {
    enemies: [], bullets: [], patternProjectiles: [], particles: [], enemyPool, bulletPool, patternProjectilePool, particlePool,
    kills: 0, wave: 0, waveKills: 0, waveTarget: 10, enemySpawnTimer: 0, bulletTimer: 0, nextEnemyId: 1, nextBulletId: 1,
    camera: { x: 0, y: 0, zoom: 1, targetZoom: 1, shakeRemaining: 0, shakeDuration: 0, shakeAmp: 0, shakeFreq: 25, shakeX: 0, shakeY: 0 },
    parallax: { layers: [] },
    grazeCount: 0, grazeThisWave: 0,
    overdriveMeter: 0, overdriveActive: false, overdriveTimeRemaining: 0,
    bossHealth: 1000, bossMaxHealth: 1000, bossHitbox: { x: 0, y: 0, radius: 32 },
    bossDamageLog: [], currentBossPatternId: null,
    safeLaneIndex: null,
  fairness: { exposures: 0, minSafeWidth: Infinity, recentHits: 0, cumulativeUnsafeTime: 0, adjustmentFactor: 1, _recentHitDecay: 0 },
    motionReduction: false,
    safeLaneHighlightIntensity: 1,
    theme: 'default',
    // Phase 2 HUD baseline values
    playerHealth: 150, playerMaxHealth: 150,
    playerArmor: 80, playerMaxArmor: 80,
  coins: 0,
  playerDead: false
  };
}
