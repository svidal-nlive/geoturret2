import { GameOrchestrator } from '../engine/orchestrator.js';
import { createGameState } from '../state/gameState.js';
import { createPlayerSystem } from '../systems/playerSystem.js';
import { createWaveSystem } from '../systems/waveSystem.js';
import { createEnemySystem } from '../systems/enemySystem.js';
import { createBulletSystem } from '../systems/bulletSystem.js';
import { createCollisionSystem } from '../systems/collisionSystem.js';
import { upgradeSnapshot } from '../state/serialization.js';
import { createParallaxSystem } from '../systems/parallaxSystem.js';
import { createGrazeSystem } from '../systems/grazeSystem.js';
import { createOverdriveSystem } from '../systems/overdriveSystem.js';
import { createBossSystem } from '../systems/bossSystem.js';
import '../content/initialContent.js';
export function recordRun(opts) {
    const fixedStep = opts.fixedStep ?? 1 / 60;
    const state = createGameState();
    const bossSummary = { bossActive: false };
    const o = new GameOrchestrator({ seed: opts.seed, fixedStep, summarySource: () => ({
            kills: state.kills,
            wave: state.wave,
            grazeCount: state.grazeCount,
            overdriveMeter: state.overdriveMeter,
            overdriveActive: state.overdriveActive,
            bossActive: bossSummary.bossActive,
            bossPattern: bossSummary.bossPattern,
            bossStartedFrame: bossSummary.bossStartedFrame,
            bossEndedFrame: bossSummary.bossEndedFrame,
            parallaxLayers: state.parallax?.layers?.map(l => ({ depth: l.depth, color: l.color, tileSize: l.tileSize, step: l.step })) || []
        }) });
    o.register(createPlayerSystem(state));
    o.register(createWaveSystem(state));
    o.register(createEnemySystem(state));
    o.register(createBulletSystem(state));
    o.register(createCollisionSystem(state));
    o.register(createGrazeSystem(state));
    const overdriveCfg = ('' + opts.seed).includes('grazeOD') ? { killGain: 0.25, grazeGain: 0.25, duration: 2 } : undefined;
    o.register(createOverdriveSystem(state, overdriveCfg));
    if (("" + opts.seed).includes('boss')) {
        o.register(createBossSystem(bossSummary, state, { triggerWave: 1, seed: String(opts.seed) }));
    }
    if (opts.withParallax)
        o.register(createParallaxSystem(state));
    o.init();
    if (opts.withParallax && state.parallax) {
        if (!state.parallax.layers.length) {
            state.parallax.layers = [
                { depth: 0.2, offsetX: 0, offsetY: 0, color: '#113', tileSize: 1800, step: 140 },
                { depth: 0.5, offsetX: 0, offsetY: 0, color: '#225', tileSize: 1200, step: 90 }
            ];
        }
    }
    o.advance(opts.duration);
    const final = o.snapshot();
    return { version: 1, seed: opts.seed, duration: opts.duration, fixedStep, final, kills: state.kills, wave: state.wave };
}
export function replayRun(rec) {
    const state = createGameState();
    const bossSummary = { bossActive: false };
    const o = new GameOrchestrator({ seed: rec.seed, fixedStep: rec.fixedStep, summarySource: () => ({
            kills: state.kills,
            wave: state.wave,
            grazeCount: state.grazeCount,
            overdriveMeter: state.overdriveMeter,
            overdriveActive: state.overdriveActive,
            bossActive: bossSummary.bossActive,
            bossPattern: bossSummary.bossPattern,
            bossStartedFrame: bossSummary.bossStartedFrame,
            bossEndedFrame: bossSummary.bossEndedFrame,
            parallaxLayers: state.parallax?.layers?.map(l => ({ depth: l.depth, color: l.color, tileSize: l.tileSize, step: l.step })) || []
        }) });
    o.register(createPlayerSystem(state));
    o.register(createWaveSystem(state));
    o.register(createEnemySystem(state));
    o.register(createBulletSystem(state));
    o.register(createCollisionSystem(state));
    o.register(createGrazeSystem(state));
    const overdriveCfg = ('' + rec.seed).includes('grazeOD') ? { killGain: 0.25, grazeGain: 0.25, duration: 2 } : undefined;
    o.register(createOverdriveSystem(state, overdriveCfg));
    if (("" + rec.seed).includes('boss')) {
        o.register(createBossSystem(bossSummary, state, { triggerWave: 1, seed: String(rec.seed) }));
    }
    if (rec.withParallax || ('' + rec.seed).includes('parallax')) {
        o.register(createParallaxSystem(state));
    }
    o.init();
    o.advance(rec.duration);
    const snap = o.snapshot();
    const recFinalUpgraded = upgradeSnapshot(rec.final);
    const diffs = [];
    if (snap.frame !== recFinalUpgraded.frame)
        diffs.push(`frame mismatch ${snap.frame} != ${recFinalUpgraded.frame}`);
    if (Math.abs(snap.time - recFinalUpgraded.time) > 1e-9)
        diffs.push(`time mismatch ${snap.time} != ${recFinalUpgraded.time}`);
    if (snap.rngState !== recFinalUpgraded.rngState)
        diffs.push('rngState mismatch');
    if (snap.registryHash !== recFinalUpgraded.registryHash)
        diffs.push('registryHash mismatch');
    if (recFinalUpgraded.versionMap) {
        const keys = new Set([...Object.keys(recFinalUpgraded.versionMap), ...Object.keys(snap.versionMap || {})]);
        for (const k of keys) {
            const a = snap.versionMap?.[k];
            const b = recFinalUpgraded.versionMap[k];
            if (a !== b)
                diffs.push(`versionMap mismatch ${k}:${a}!=${b}`);
        }
    }
    if (snap.summary.kills !== rec.kills)
        diffs.push(`kills mismatch ${snap.summary.kills} != ${rec.kills}`);
    if (snap.summary.wave !== rec.wave)
        diffs.push(`wave mismatch ${snap.summary.wave} != ${rec.wave}`);
    if (process.env.GOLDEN_REQUIRE_EXTENDED) {
        if ((snap.summary.grazeCount ?? 0) !== (recFinalUpgraded.summary.grazeCount ?? 0))
            diffs.push('grazeCount mismatch');
        if ((snap.summary.overdriveMeter ?? 0) !== (recFinalUpgraded.summary.overdriveMeter ?? 0))
            diffs.push('overdriveMeter mismatch');
        if ((snap.summary.overdriveActive ?? false) !== (recFinalUpgraded.summary.overdriveActive ?? false))
            diffs.push('overdriveActive mismatch');
    }
    return { ok: diffs.length === 0, differences: diffs, replayFinal: snap };
}
