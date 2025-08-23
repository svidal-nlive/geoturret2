/** Minimal game state for demo run (now with pooling). */
export interface Enemy { id: number; x: number; y: number; vx: number; vy: number; hp: number; alive: boolean; }
export interface Bullet { id: number; x: number; y: number; vx: number; vy: number; alive: boolean; }

import { Pool } from '../engine/pool';

export interface GameState {
  enemies: Enemy[];
  bullets: Bullet[];
  enemyPool: Pool<Enemy>;
  bulletPool: Pool<Bullet>;
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
  return { enemies: [], bullets: [], enemyPool, bulletPool, kills: 0, wave: 0, waveKills: 0, waveTarget: 10, enemySpawnTimer: 0, bulletTimer: 0, nextEnemyId: 1, nextBulletId: 1, camera: { x: 0, y: 0, zoom: 1, targetZoom: 1, shakeRemaining: 0, shakeDuration: 0, shakeAmp: 0, shakeFreq: 25, shakeX: 0, shakeY: 0 }, parallax: { layers: [] }, grazeCount: 0, grazeThisWave: 0, overdriveMeter: 0, overdriveActive: false, overdriveTimeRemaining: 0 };
}
