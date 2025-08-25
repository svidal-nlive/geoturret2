/** Data registries (Phase 1 P1-5). Pure structures for deterministic content. */
export interface EnemyDef {
  id: string;
  hp: number;
  speed: number;
  displayName?: string;
  role?: 'basic' | 'fast' | 'tank' | 'elite';
  bounty?: number;          // coins awarded
  spawnWeight?: number;     // relative weighting for random selection
  description?: string;
  version?: number;         // balance revision for migrations
}
export interface PowerupDef {
  id: string;
  duration?: number;
  displayName?: string;
  description?: string;
  rarity?: 'common' | 'uncommon' | 'rare';
  version?: number;
}
export interface UpgradeDef {
  id: string;
  tier: number;
  displayName?: string;
  description?: string;
  category?: 'offense' | 'defense' | 'utility' | 'economy';
  maxTier?: number;         // soft cap for future tiers
  version?: number;
}
export interface WaveModDef {
  id: string;
  description: string;
  displayName?: string;
  excludes?: string[];      // ids of mods it cannot combine with
  synergyTags?: string[];   // used later for synergy tests
  version?: number;
}
export interface BossPatternDef {
  id: string;
  version: number;
  displayName?: string;
  estDurationFrames?: number; // documented expected duration window
  description?: string;
}

const enemies = new Map<string, EnemyDef>();
const powerups = new Map<string, PowerupDef>();
const upgrades = new Map<string, UpgradeDef>();
const waveMods = new Map<string, WaveModDef>();
const bossPatterns = new Map<string, BossPatternDef>();

function ensureUnique<T extends { id: string }>(map: Map<string, T>, def: T, kind: string) {
  if (map.has(def.id)) throw new Error(`${kind} already registered: ${def.id}`);
  map.set(def.id, def);
}

export const Registries = {
  enemy: (def: EnemyDef) => ensureUnique(enemies, def, 'enemy'),
  powerup: (def: PowerupDef) => ensureUnique(powerups, def, 'powerup'),
  upgrade: (def: UpgradeDef) => ensureUnique(upgrades, def, 'upgrade'),
  waveMod: (def: WaveModDef) => ensureUnique(waveMods, def, 'waveMod'),
  bossPattern: (def: BossPatternDef) => ensureUnique(bossPatterns, def, 'bossPattern'),
  getEnemy: (id: string) => enemies.get(id),
  getPowerup: (id: string) => powerups.get(id),
  getUpgrade: (id: string) => upgrades.get(id),
  getWaveMod: (id: string) => waveMods.get(id),
  getBossPattern: (id: string) => bossPatterns.get(id),
  snapshot: () => ({ enemies: [...enemies.keys()], powerups: [...powerups.keys()], upgrades: [...upgrades.keys()], waveMods: [...waveMods.keys()], bossPatterns: [...bossPatterns.keys()] }),
  /** Build a version map (kind: id -> version) for current registry entries. */
  versionMap(): Record<string, number> {
    const snap = this.snapshot();
    const map: Record<string, number> = {};
    for (const id of snap.enemies) map['enemy:'+id] = (this.getEnemy(id)?.version) ?? 1;
    for (const id of snap.powerups) map['powerup:'+id] = (this.getPowerup(id)?.version) ?? 1;
    for (const id of snap.upgrades) map['upgrade:'+id] = (this.getUpgrade(id)?.version) ?? 1;
    for (const id of snap.waveMods) map['waveMod:'+id] = (this.getWaveMod(id)?.version) ?? 1;
    for (const id of snap.bossPatterns) map['bossPattern:'+id] = (this.getBossPattern(id)?.version) ?? 1;
    return map;
  },
  /** Stable hash of registry composition (IDs only). Simple djb2 over sorted concatenated keys. */
  hash(): string {
    const collect = (m: Map<string, any>) => [...m.keys()].sort().join('|');
    const combined = [collect(enemies), collect(powerups), collect(upgrades), collect(waveMods), collect(bossPatterns)].join('#');
    let h = 5381;
    for (let i=0;i<combined.length;i++) h = ((h << 5) + h) ^ combined.charCodeAt(i);
    // Represent as 8-char hex
    return (h >>> 0).toString(16).padStart(8,'0');
  }
};
