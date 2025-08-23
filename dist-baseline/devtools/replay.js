import { GameOrchestrator } from '../engine/orchestrator.js';
import { createGameState } from '../state/gameState.js';
import { createPlayerSystem } from '../systems/playerSystem.js';
import { createWaveSystem } from '../systems/waveSystem.js';
import { createEnemySystem } from '../systems/enemySystem.js';
import { createBulletSystem } from '../systems/bulletSystem.js';
import { createCollisionSystem } from '../systems/collisionSystem.js';
import '../content/initialContent.js';
export function recordRun(opts) {
    const fixedStep = opts.fixedStep ?? 1 / 60;
    const state = createGameState();
    const o = new GameOrchestrator({ seed: opts.seed, fixedStep, summarySource: () => ({ kills: state.kills, wave: state.wave }) });
    o.register(createPlayerSystem(state));
    o.register(createWaveSystem(state));
    o.register(createEnemySystem(state));
    o.register(createBulletSystem(state));
    o.register(createCollisionSystem(state));
    o.init();
    o.advance(opts.duration);
    const final = o.snapshot();
    return { version: 1, seed: opts.seed, duration: opts.duration, fixedStep, final, kills: state.kills, wave: state.wave };
}
export function replayRun(rec) {
    const state = createGameState();
    const o = new GameOrchestrator({ seed: rec.seed, fixedStep: rec.fixedStep, summarySource: () => ({ kills: state.kills, wave: state.wave }) });
    o.register(createPlayerSystem(state));
    o.register(createWaveSystem(state));
    o.register(createEnemySystem(state));
    o.register(createBulletSystem(state));
    o.register(createCollisionSystem(state));
    o.init();
    o.advance(rec.duration);
    const snap = o.snapshot();
    const diffs = [];
    if (snap.frame !== rec.final.frame)
        diffs.push(`frame mismatch ${snap.frame} != ${rec.final.frame}`);
    if (Math.abs(snap.time - rec.final.time) > 1e-9)
        diffs.push(`time mismatch ${snap.time} != ${rec.final.time}`);
    if (snap.rngState !== rec.final.rngState)
        diffs.push('rngState mismatch');
    if (snap.registryHash !== rec.final.registryHash)
        diffs.push('registryHash mismatch');
    if (snap.summary.kills !== rec.kills)
        diffs.push(`kills mismatch ${snap.summary.kills} != ${rec.kills}`);
    if (snap.summary.wave !== rec.wave)
        diffs.push(`wave mismatch ${snap.summary.wave} != ${rec.wave}`);
    return { ok: diffs.length === 0, differences: diffs, replayFinal: snap };
}
