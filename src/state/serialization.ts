/** State serialization scaffold (Phase 1 P1-7). */
import { RNG } from '../engine';
import { GameOrchestrator, System } from '../engine/orchestrator';
import { GameState } from './gameState';
import { Registries } from '../content/registries';

export const SCHEMA_VERSION = 7 as const; // v7: add bossPatternState serialization for active boss patterns
interface RunSnapshotV1 { version: 1; frame: number; time: number; rngState: number; registries: any; registryHash: string; summary: { kills: number; wave: number } }
interface RunSnapshotV2 { version: 2; frame: number; time: number; rngState: number; registries: any; registryHash: string; summary: { kills: number; wave: number } }
interface RunSnapshotV3 { version: 3; frame: number; time: number; rngState: number; registries: any; registryHash: string; summary: { kills: number; wave: number; parallaxLayers?: any[] } }
interface RunSnapshotV4 { version: 4; frame: number; time: number; rngState: number; registries: any; registryHash: string; summary: { kills: number; wave: number; grazeCount?: number; overdriveMeter?: number; overdriveActive?: boolean; bossActive?: boolean; bossPattern?: string; bossStartedFrame?: number; bossEndedFrame?: number; parallaxLayers?: any[] } }
interface RunSnapshotV5 { version: 5; frame: number; time: number; rngState: number; registries: any; registryHash: string; summary: { kills: number; wave: number; grazeCount: number; overdriveMeter: number; overdriveActive: boolean; bossActive: boolean; bossPattern: string | null; bossStartedFrame: number | null; bossEndedFrame: number | null; parallaxLayers?: any[] } }
export interface RunSnapshotMeta { version: typeof SCHEMA_VERSION; frame: number; time: number; rngState: number; registries: ReturnType<typeof Registries.snapshot>; registryHash: string; versionMap: Record<string, number>; summary: { kills: number; wave: number; grazeCount: number; overdriveMeter: number; overdriveActive: boolean; bossActive: boolean; bossPattern: string | null; bossStartedFrame: number | null; bossEndedFrame: number | null; bossPatternState?: any; parallaxLayers?: { depth: number; color?: string; tileSize?: number; step?: number }[] } }
export type AnyRunSnapshot = RunSnapshotV1 | RunSnapshotV2 | RunSnapshotV3 | RunSnapshotV4 | RunSnapshotV5 | RunSnapshotMeta;

/**
 * Create a deterministic run snapshot including RNG state, registry integrity hash and a lightweight
 * run summary (kills, wave). Wave remains a placeholder until wave progression system lands.
 */
export function createSnapshot(meta: { frame: number; time: number; rng: RNG; state?: Pick<GameState,'kills'|'wave'|'grazeCount'|'overdriveMeter'|'overdriveActive'> & { bossActive?: boolean; bossPattern?: string; bossStartedFrame?: number; bossEndedFrame?: number; bossPatternState?: any; parallaxLayers?: { depth: number; color?: string; tileSize?: number; step?: number }[] } }): RunSnapshotMeta {
  const rngState = (meta.rng as any).snapshot ? (meta.rng as any).snapshot() : 0;
  const kills = meta.state?.kills ?? 0;
  const wave = meta.state?.wave ?? 0;
  const parallaxLayers = meta.state?.parallaxLayers;
  const grazeCount = (meta.state as any)?.grazeCount ?? 0;
  const overdriveMeter = (meta.state as any)?.overdriveMeter ?? 0;
  const overdriveActive = (meta.state as any)?.overdriveActive ?? false;
  const bossActive = (meta.state as any)?.bossActive ?? false;
  const bossPattern = (meta.state as any)?.bossPattern ?? null;
  const bossStartedFrame = (meta.state as any)?.bossStartedFrame ?? null;
  const bossEndedFrame = (meta.state as any)?.bossEndedFrame ?? null;
  const bossPatternState = (meta.state as any)?.bossPatternState;
  // Build versionMap (ids -> version) for future persistence & drift analysis
  const snapIds = Registries.snapshot();
  const versionMap = Registries.versionMap();
  return {
    version: SCHEMA_VERSION,
    frame: meta.frame,
    time: meta.time,
    rngState,
    registries: snapIds,
    registryHash: Registries.hash(),
    versionMap,
  summary: { kills, wave, grazeCount, overdriveMeter, overdriveActive, bossActive, bossPattern, bossStartedFrame, bossEndedFrame, bossPatternState, parallaxLayers }
  };
}

/** Lightweight integrity check (hash compare). Returns true if matches current registries. */
export function validateSnapshotRegistries(snap: AnyRunSnapshot): boolean {
  return snap.registryHash === Registries.hash();
}

/** Apply snapshot summary fields to an existing mutable GameState (doesn't touch entities/pools). */
export function applySnapshotSummary(state: GameState, raw: AnyRunSnapshot): void {
  const snap = upgradeSnapshot(raw);
  state.kills = snap.summary.kills;
  state.wave = snap.summary.wave;
  if (typeof snap.summary.grazeCount === 'number') state.grazeCount = snap.summary.grazeCount;
  if (typeof snap.summary.overdriveMeter === 'number') state.overdriveMeter = snap.summary.overdriveMeter;
  if (typeof snap.summary.overdriveActive === 'boolean') state.overdriveActive = snap.summary.overdriveActive;
  // Parallax layer metadata is advisory; runtime parallax system manages actual offsets/config persistence.
}

export interface OrchestratorFromSnapshotOptions {
  fixedStep?: number;
  systems?: System[];
  /** Provide a summary source for future snapshots (typically ties into current GameState). */
  summarySource?: () => Pick<GameState,'kills'|'wave'|'grazeCount'|'overdriveMeter'|'overdriveActive'>;
  /** Validate registry hash matches current content (throw on mismatch). */
  validateRegistries?: boolean;
  /** Optional explicit seed; if omitted, rngState is used to seed RNG before restore (which then sets exact state). */
  seed?: number | string;
}

/** Convenience: build + init a new orchestrator and restore snapshot in one step. */
export function createOrchestratorFromSnapshot(raw: AnyRunSnapshot, opts: OrchestratorFromSnapshotOptions = {}): GameOrchestrator {
  if (opts.validateRegistries && !validateSnapshotRegistries(raw)) {
    throw new Error('Snapshot registry hash mismatch – content has diverged.');
  }
  const snap = upgradeSnapshot(raw);
  const rng = new RNG(opts.seed ?? snap.rngState);
  const orchestrator = new GameOrchestrator({ fixedStep: opts.fixedStep, seed: rng, summarySource: opts.summarySource });
  // Register systems prior to init
  opts.systems?.forEach(s => orchestrator.register(s));
  orchestrator.init();
  orchestrator.restore({ frame: snap.frame, time: snap.time, rngState: snap.rngState });
  return orchestrator;
}

/** Upgrade any prior snapshot version to latest (v4). Missing fields default. */
export function upgradeSnapshot(s: AnyRunSnapshot): RunSnapshotMeta {
  if ((s as any).version === SCHEMA_VERSION) return s as RunSnapshotMeta;
  const base: any = s;
  const parallaxLayers = base.summary.parallaxLayers;
  // v1/v2/v3 lacked graze/overdrive/boss; v4 had them optional; v5 mandates them (null defaults for pattern identity frames)
  const ensure = (field: any, def: any) => (typeof field === 'undefined' ? def : field);
  const version = base.version;
  const graze = version >=4 ? ensure(base.summary.grazeCount, 0) : 0;
  const odMeter = version >=4 ? ensure(base.summary.overdriveMeter, 0) : 0;
  const odActive = version >=4 ? ensure(base.summary.overdriveActive, false) : false;
  const bossActive = version >=4 ? ensure(base.summary.bossActive, false) : false;
  const bossPattern = version >=4 ? ensure(base.summary.bossPattern ?? null, null) : null;
  const bossStartedFrame = version >=4 ? ensure(base.summary.bossStartedFrame ?? null, null) : null;
  const bossEndedFrame = version >=4 ? ensure(base.summary.bossEndedFrame ?? null, null) : null;
  const bossPatternState = version >=7 ? base.summary.bossPatternState : undefined;
  // Derive versionMap for legacy snapshots lacking it.
  const versionMap: Record<string, number> = (base as any).versionMap || {};
  // If missing, populate with default 1 for known ids present in registries snapshot.
  if (!(base as any).versionMap && base.registries) {
    const reg = base.registries;
    const add = (prefix: string, arr: string[]) => arr?.forEach((id: string) => { versionMap[prefix+id] = 1; });
    add('enemy:', reg.enemies || []);
    add('powerup:', reg.powerups || []);
    add('upgrade:', reg.upgrades || []);
    add('waveMod:', reg.waveMods || []);
    add('bossPattern:', reg.bossPatterns || []);
  }
  return {
    version: SCHEMA_VERSION,
    frame: base.frame,
    time: base.time,
    rngState: base.rngState,
    registries: base.registries,
    registryHash: base.registryHash,
    versionMap,
    summary: {
      kills: base.summary.kills,
      wave: base.summary.wave,
      parallaxLayers,
      grazeCount: graze,
      overdriveMeter: odMeter,
      overdriveActive: odActive,
      bossActive,
      bossPattern,
      bossStartedFrame,
  bossEndedFrame,
  bossPatternState
    }
  };
}

