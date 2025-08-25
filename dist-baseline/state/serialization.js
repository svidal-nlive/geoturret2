import { RNG } from '../engine/index.js';
import { GameOrchestrator } from '../engine/orchestrator.js';
import { Registries } from '../content/registries.js';
export const SCHEMA_VERSION = 7;
export function createSnapshot(meta) {
    const rngState = meta.rng.snapshot ? meta.rng.snapshot() : 0;
    const kills = meta.state?.kills ?? 0;
    const wave = meta.state?.wave ?? 0;
    const parallaxLayers = meta.state?.parallaxLayers;
    const grazeCount = meta.state?.grazeCount ?? 0;
    const overdriveMeter = meta.state?.overdriveMeter ?? 0;
    const overdriveActive = meta.state?.overdriveActive ?? false;
    const bossActive = meta.state?.bossActive ?? false;
    const bossPattern = meta.state?.bossPattern ?? null;
    const bossStartedFrame = meta.state?.bossStartedFrame ?? null;
    const bossEndedFrame = meta.state?.bossEndedFrame ?? null;
    const bossPatternState = meta.state?.bossPatternState;
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
export function validateSnapshotRegistries(snap) {
    return snap.registryHash === Registries.hash();
}
export function applySnapshotSummary(state, raw) {
    const snap = upgradeSnapshot(raw);
    state.kills = snap.summary.kills;
    state.wave = snap.summary.wave;
    if (typeof snap.summary.grazeCount === 'number')
        state.grazeCount = snap.summary.grazeCount;
    if (typeof snap.summary.overdriveMeter === 'number')
        state.overdriveMeter = snap.summary.overdriveMeter;
    if (typeof snap.summary.overdriveActive === 'boolean')
        state.overdriveActive = snap.summary.overdriveActive;
}
export function createOrchestratorFromSnapshot(raw, opts = {}) {
    if (opts.validateRegistries && !validateSnapshotRegistries(raw)) {
        throw new Error('Snapshot registry hash mismatch – content has diverged.');
    }
    const snap = upgradeSnapshot(raw);
    const rng = new RNG(opts.seed ?? snap.rngState);
    const orchestrator = new GameOrchestrator({ fixedStep: opts.fixedStep, seed: rng, summarySource: opts.summarySource });
    opts.systems?.forEach(s => orchestrator.register(s));
    orchestrator.init();
    orchestrator.restore({ frame: snap.frame, time: snap.time, rngState: snap.rngState });
    return orchestrator;
}
export function upgradeSnapshot(s) {
    if (s.version === SCHEMA_VERSION)
        return s;
    const base = s;
    const parallaxLayers = base.summary.parallaxLayers;
    const ensure = (field, def) => (typeof field === 'undefined' ? def : field);
    const version = base.version;
    const graze = version >= 4 ? ensure(base.summary.grazeCount, 0) : 0;
    const odMeter = version >= 4 ? ensure(base.summary.overdriveMeter, 0) : 0;
    const odActive = version >= 4 ? ensure(base.summary.overdriveActive, false) : false;
    const bossActive = version >= 4 ? ensure(base.summary.bossActive, false) : false;
    const bossPattern = version >= 4 ? ensure(base.summary.bossPattern ?? null, null) : null;
    const bossStartedFrame = version >= 4 ? ensure(base.summary.bossStartedFrame ?? null, null) : null;
    const bossEndedFrame = version >= 4 ? ensure(base.summary.bossEndedFrame ?? null, null) : null;
    const bossPatternState = version >= 7 ? base.summary.bossPatternState : undefined;
    const versionMap = base.versionMap || {};
    if (!base.versionMap && base.registries) {
        const reg = base.registries;
        const add = (prefix, arr) => arr?.forEach((id) => { versionMap[prefix + id] = 1; });
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
