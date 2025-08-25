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
    getEnemy: (id) => enemies.get(id),
    getPowerup: (id) => powerups.get(id),
    getUpgrade: (id) => upgrades.get(id),
    getWaveMod: (id) => waveMods.get(id),
    getBossPattern: (id) => bossPatterns.get(id),
    snapshot: () => ({ enemies: [...enemies.keys()], powerups: [...powerups.keys()], upgrades: [...upgrades.keys()], waveMods: [...waveMods.keys()], bossPatterns: [...bossPatterns.keys()] }),
    versionMap() {
        const snap = this.snapshot();
        const map = {};
        for (const id of snap.enemies)
            map['enemy:' + id] = (this.getEnemy(id)?.version) ?? 1;
        for (const id of snap.powerups)
            map['powerup:' + id] = (this.getPowerup(id)?.version) ?? 1;
        for (const id of snap.upgrades)
            map['upgrade:' + id] = (this.getUpgrade(id)?.version) ?? 1;
        for (const id of snap.waveMods)
            map['waveMod:' + id] = (this.getWaveMod(id)?.version) ?? 1;
        for (const id of snap.bossPatterns)
            map['bossPattern:' + id] = (this.getBossPattern(id)?.version) ?? 1;
        return map;
    },
    hash() {
        const collect = (m) => [...m.keys()].sort().join('|');
        const combined = [collect(enemies), collect(powerups), collect(upgrades), collect(waveMods), collect(bossPatterns)].join('#');
        let h = 5381;
        for (let i = 0; i < combined.length; i++)
            h = ((h << 5) + h) ^ combined.charCodeAt(i);
        return (h >>> 0).toString(16).padStart(8, '0');
    }
};
