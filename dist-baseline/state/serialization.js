import { Registries } from '../content/registries.js';
export function createSnapshot(meta) {
    const rngState = meta.rng.snapshot ? meta.rng.snapshot() : 0;
    const kills = meta.state?.kills ?? 0;
    const wave = meta.state?.wave ?? 0;
    return {
        version: 2,
        frame: meta.frame,
        time: meta.time,
        rngState,
        registries: Registries.snapshot(),
        registryHash: Registries.hash(),
        summary: { kills, wave }
    };
}
