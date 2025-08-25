import { eventBus } from './eventBus.js';
import { RNG } from './rng.js';
import { createSnapshot } from '../state/serialization.js';
export class GameOrchestrator {
    systems = [];
    frame = 0;
    time = 0;
    accumulator = 0;
    step;
    rng;
    profilerEnabled = false;
    lastProfile;
    summarySource;
    constructor(opts) {
        this.step = opts?.fixedStep ?? (1 / 60);
        if (opts?.seed instanceof RNG)
            this.rng = opts.seed;
        else if (typeof opts?.seed !== 'undefined')
            this.rng = new RNG(opts.seed);
        else
            throw new Error('Orchestrator requires explicit seed (number|string|RNG) for determinism.');
        this.summarySource = opts?.summarySource;
    }
    register(system) {
        if (this.systems.find(s => s.id === system.id))
            throw new Error(`System id already registered: ${system.id}`);
        this.systems.push(system);
        this.sortSystems();
    }
    sortSystems() {
        this.systems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    init() {
        const ctx = this.buildContext();
        for (const s of this.systems)
            s.init?.(ctx);
    }
    advance(elapsed) {
        this.accumulator += elapsed;
        let steps = 0;
        while (this.accumulator + 1e-12 >= this.step) {
            this.accumulator -= this.step;
            this.tick();
            steps++;
        }
        return steps;
    }
    tick() {
        const ctx = this.buildContext();
        if (this.profilerEnabled) {
            this.lastProfile = {};
            for (const s of this.systems) {
                const start = performance.now();
                s.update(this.step, ctx);
                this.lastProfile[s.id] = performance.now() - start;
            }
            eventBus.emit('perfSample', { frame: this.frame, profiling: this.lastProfile });
        }
        else {
            for (const s of this.systems)
                s.update(this.step, ctx);
        }
        globalThis.__frame = this.frame;
        this.frame++;
        this.time += this.step;
        eventBus.emit('frame', { frame: this.frame, time: this.time });
    }
    buildContext() {
        return {
            frame: this.frame,
            time: this.time,
            rng: this.rng,
            emit: eventBus.emit.bind(eventBus),
            on: eventBus.on.bind(eventBus)
        };
    }
    teardown() {
        const ctx = this.buildContext();
        for (const s of [...this.systems].reverse())
            s.teardown?.(ctx);
    }
    getMetrics() {
        return { frame: this.frame, time: this.time, systems: this.systems.length, stepsLastAdvance: 0, accumulator: this.accumulator, profiling: this.lastProfile };
    }
    getStep() { return this.step; }
    enableProfiler(flag = true) { this.profilerEnabled = flag; }
    snapshot() {
        const snap = createSnapshot({ frame: this.frame, time: this.time, rng: this.rng, state: this.summarySource?.() });
        eventBus.emit('snapshot', { frame: snap.frame, time: snap.time, registryHash: snap.registryHash, summary: snap.summary });
        return snap;
    }
    restore(meta) {
        this.frame = meta.frame;
        this.time = meta.time;
        this.accumulator = 0;
        if (this.rng.restore)
            this.rng.restore(meta.rngState);
    }
}
