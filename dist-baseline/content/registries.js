const enemies = new Map();
const powerups = new Map();
const upgrades = new Map();
const waveMods = new Map();
const bossPatterns = new Map();
function ensureUnique(map, def, kind) {
    if (map.has(def.id))
        throw new Error(`${kind} already registered: ${def.id}`);
    map.set(def.id, def);
}
export const Registries = {
    enemy: (def) => ensureUnique(enemies, def, 'enemy'),
    powerup: (def) => ensureUnique(powerups, def, 'powerup'),
    upgrade: (def) => ensureUnique(upgrades, def, 'upgrade'),
    waveMod: (def) => ensureUnique(waveMods, def, 'waveMod'),
    bossPattern: (def) => ensureUnique(bossPatterns, def, 'bossPattern'),
    snapshot: () => ({ enemies: [...enemies.keys()], powerups: [...powerups.keys()], upgrades: [...upgrades.keys()], waveMods: [...waveMods.keys()], bossPatterns: [...bossPatterns.keys()] }),
    hash() {
        const collect = (m) => [...m.keys()].sort().join('|');
        const combined = [collect(enemies), collect(powerups), collect(upgrades), collect(waveMods), collect(bossPatterns)].join('#');
        let h = 5381;
        for (let i = 0; i < combined.length; i++)
            h = ((h << 5) + h) ^ combined.charCodeAt(i);
        return (h >>> 0).toString(16).padStart(8, '0');
    }
};
