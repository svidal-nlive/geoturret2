/** Data registries (Phase 1 P1-5). Pure structures for deterministic content. */
export interface EnemyDef { id: string; hp: number; speed: number; }
export interface PowerupDef { id: string; duration?: number; }
export interface UpgradeDef { id: string; tier: number; }
export interface WaveModDef { id: string; description: string; }
export interface BossPatternDef { id: string; version: number; }

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
  snapshot: () => ({ enemies: [...enemies.keys()], powerups: [...powerups.keys()], upgrades: [...upgrades.keys()], waveMods: [...waveMods.keys()], bossPatterns: [...bossPatterns.keys()] }),
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
