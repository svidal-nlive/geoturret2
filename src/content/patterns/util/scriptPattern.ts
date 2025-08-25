import { BossPattern } from '../../bossPattern';
import { OrchestratorContext } from '../../../engine';

// Timeline scripting primitives for boss patterns (Phase 1 P1-6 execution engine core).

export type ScriptStep = WaitStep | DoStep | IfStep | LoopUntilStep | ForkStep | JoinStep;

export interface WaitStep { kind: 'wait'; frames: number; label?: string }
export interface DoStep { kind: 'do'; fn: (ctx: OrchestratorContext) => void; label?: string }
export interface IfStep { kind: 'if'; predicate: (ctx: OrchestratorContext) => boolean; then: ScriptStep[]; elseBranch?: ScriptStep[]; label?: string }
export interface LoopUntilStep { kind: 'loopUntil'; predicate: (ctx: OrchestratorContext) => boolean; body: ScriptStep[]; label?: string }
export interface ForkStep { kind: 'fork'; branches: ScriptStep[][]; label?: string }
export interface JoinStep { kind: 'join'; token: number; label?: string }

export const wait = (frames: number, label?: string): WaitStep => ({ kind: 'wait', frames, label });
export const doStep = (fn: (ctx: OrchestratorContext) => void, label?: string): DoStep => ({ kind: 'do', fn, label });
export const ifStep = (predicate: (ctx: OrchestratorContext) => boolean, then: ScriptStep[], elseBranch?: ScriptStep[], label?: string): IfStep => ({ kind: 'if', predicate, then, elseBranch, label });
export const loopUntil = (predicate: (ctx: OrchestratorContext) => boolean, body: ScriptStep[], label?: string): LoopUntilStep => ({ kind: 'loopUntil', predicate, body, label });
export const fork = (branches: ScriptStep[][], label?: string): ForkStep => ({ kind: 'fork', branches, label });
export const join = (token: number, label?: string): JoinStep => ({ kind: 'join', token, label });

/** Duplicate a step sequence n times (simple unrolled repeat for determinism & inspection). */
export function repeat(times: number, ...steps: ScriptStep[]): ScriptStep[] {
  const out: ScriptStep[] = [];
  for (let i=0;i<times;i++) out.push(...steps);
  return out;
}

export class ScriptRuntimeError extends Error {
  constructor(message: string, readonly info: { stepKind: string; label?: string; index: number; frame?: number; cause?: any }) {
    super(message + (info.label ? ` [label=${info.label}]` : ''));
    this.name = 'ScriptRuntimeError';
  }
}

class ScriptRunner {
  private idx = 0;
  private waitRemaining = 0;
  private done = false;
  private nextForkToken = 1;
  private forks: Map<number, { runners: ScriptRunner[] }> = new Map();
  private aborted = false;
  // Metrics
  private totalSteps = 0;
  private doCalls = 0;
  private ifEvals = 0;
  private loopIterations = 0;
  private forkLaunches = 0;
  private waitFrames = 0;
  private joinWaitFrames = 0;
  private rngDraws = 0;
  private executedLabelCounts: Record<string, number> = {};
  constructor(private steps: ScriptStep[]) {}
  private maxStepsPerFrame = 100;
  update(ctx: OrchestratorContext): boolean {
    if (this.done) return true;
    if (this.aborted) { this.done = true; return true; }
    let stepsThisFrame = 0;
    while (this.idx < this.steps.length) {
      if (++stepsThisFrame > this.maxStepsPerFrame) throw new ScriptRuntimeError('ScriptRunner: exceeded max steps per frame (possible runaway expansion)', { stepKind: 'limit', index: this.idx, frame: (ctx as any)?.frame });
      const s = this.steps[this.idx];
      // Basic invariant checks (cheap):
      if (s.kind === 'wait' && s.frames < 0) {
        throw new ScriptRuntimeError('wait step frames must be >= 0', { stepKind: s.kind, label: s.label, index: this.idx, frame: (ctx as any)?.frame });
      }
      try {
      switch (s.kind) {
        case 'do': {
          this.totalSteps++; this.doCalls++;
          const beforeDraws = (ctx as any)?.rng?.draws ?? 0;
          s.fn(ctx);
          const afterDraws = (ctx as any)?.rng?.draws ?? beforeDraws;
          if (afterDraws > beforeDraws) this.rngDraws += (afterDraws - beforeDraws);
          if (s.label) this.executedLabelCounts[s.label] = (this.executedLabelCounts[s.label] || 0) + 1;
          this.idx++;
          continue;
        }
        case 'wait':
          this.totalSteps++;
          if (this.waitRemaining === 0) this.waitRemaining = s.frames;
          this.waitRemaining--;
          this.waitFrames++;
          if (this.waitRemaining === 0) this.idx++;
          break;
        case 'if': {
          this.totalSteps++; this.ifEvals++;
          const beforeDraws = (ctx as any)?.rng?.draws ?? 0;
          const branch = s.predicate(ctx) ? s.then : (s.elseBranch || []);
          const afterDraws = (ctx as any)?.rng?.draws ?? beforeDraws;
          if (afterDraws > beforeDraws) this.rngDraws += (afterDraws - beforeDraws);
          this.steps.splice(this.idx, 1, ...branch);
          continue;
        }
        case 'loopUntil':
          this.totalSteps++;
          {
            const beforeDraws = (ctx as any)?.rng?.draws ?? 0;
            const shouldStop = s.predicate(ctx);
            const afterDraws = (ctx as any)?.rng?.draws ?? beforeDraws;
            if (afterDraws > beforeDraws) this.rngDraws += (afterDraws - beforeDraws);
            if (shouldStop) { this.steps.splice(this.idx, 1); continue; }
          }
          this.loopIterations++;
          this.steps.splice(this.idx, 1, ...s.body, s); // unroll one iteration
          continue;
        case 'fork': {
          this.totalSteps++; this.forkLaunches++;
          const token = this.nextForkToken++;
          const runners = s.branches.map(b => new ScriptRunner(b.concat([join(token,'autoJoin')] as ScriptStep[])));
            this.forks.set(token, { runners });
          this.steps.splice(this.idx, 1, { kind: 'join', token } as JoinStep);
          continue;
        }
        case 'join': {
          this.totalSteps++;
          const group = this.forks.get(s.token);
          if (!group) { this.idx++; continue; }
          let allDone = true;
          for (const r of group.runners) if (!r.update(ctx)) allDone = false;
          if (allDone) {
            // Aggregate child execution metadata before discarding fork runners.
            for (const r of group.runners) {
              const m: any = r.metrics?.() || {};
              if (m.executedLabelCounts) {
                for (const [k,v] of Object.entries(m.executedLabelCounts)) {
                  this.executedLabelCounts[k] = (this.executedLabelCounts[k] || 0) + (v as number);
                }
              }
              if (typeof m.rngDraws === 'number') this.rngDraws += m.rngDraws;
            }
            this.forks.delete(s.token); this.idx++; continue; }
          this.joinWaitFrames++;
          break; // waiting for branches
        }
      }
      } catch (err) {
        if (err instanceof ScriptRuntimeError) throw err; // already enriched
        throw new ScriptRuntimeError('Script step execution failed', { stepKind: s.kind, label: (s as any).label, index: this.idx, frame: (ctx as any)?.frame, cause: err });
      }
      break; // reached a wait or join wait condition
    }
    if (this.idx >= this.steps.length) this.done = true;
    return this.done;
  }
  abort() { this.aborted = true; }
  metrics() {
    return {
      totalSteps: this.totalSteps,
      doCalls: this.doCalls,
      ifEvals: this.ifEvals,
      loopIterations: this.loopIterations,
      forkLaunches: this.forkLaunches,
      waitFrames: this.waitFrames,
      joinWaitFrames: this.joinWaitFrames,
      rngDraws: this.rngDraws,
      done: this.done,
      aborted: this.aborted,
      idx: this.idx,
      executedLabelCounts: { ...this.executedLabelCounts }
    };
  }
  serialize(): any {
    const executedDoLabels: string[] = [];
    for (let i=0;i<this.idx;i++) {
      const st = this.steps[i];
      if (st && st.kind==='do' && (st as any).label) executedDoLabels.push((st as any).label!);
    }
    const payload = {
      idx: this.idx,
      wait: this.waitRemaining,
      done: this.done,
      nextForkToken: this.nextForkToken,
      steps: this.steps, // mutated sequence (deterministic)
      forks: [...this.forks.entries()].map(([token, group]) => ({ token, runners: group.runners.map(r => r.serialize()) })),
      executedLabelCounts: { ...this.executedLabelCounts },
      rngDraws: this.rngDraws,
      __dbg: { executedDoLabels }
    };
    if (process.env.SCRIPT_DUP_DEBUG) {
      console.log('[ScriptRunner.serialize]', { idx: payload.idx, executedDoLabels: payload.__dbg.executedDoLabels, forkCount: payload.forks.length });
    }
    return payload;
  }
  static deserialize(data: any): ScriptRunner {
    const r = new ScriptRunner(data.steps);
    r.idx = data.idx;
    r.waitRemaining = data.wait;
    r.done = data.done;
    r.nextForkToken = data.nextForkToken;
    r.rngDraws = data.rngDraws || 0;
    r.executedLabelCounts = data.executedLabelCounts || {};
    for (const f of data.forks) {
      r.forks.set(f.token, { runners: f.runners.map((rd: any) => ScriptRunner.deserialize(rd)) });
    }
    if (process.env.SCRIPT_DUP_DEBUG) {
      console.log('[ScriptRunner.deserialize]', { idx: r.idx, executedDoLabels: data.__dbg?.executedDoLabels, forkCount: (data.forks||[]).length });
    }
    return r;
  }
}

export interface ScriptPatternConfig {
  id: string;
  version: number;
  steps: ScriptStep[];
  onStart?: (ctx: OrchestratorContext) => void;
  onEnd?: (ctx: OrchestratorContext) => void;
}

export function createScriptPattern(cfg: ScriptPatternConfig): BossPattern {
  let runner: ScriptRunner | undefined;
  const pattern: BossPattern & { __scriptAbort?: ()=>void; __scriptMetrics?: ()=>any } = {
    id: cfg.id,
    version: cfg.version,
    start(ctx) {
      runner = new ScriptRunner(cfg.steps);
      cfg.onStart?.(ctx);
    },
    update(_dt, ctx) {
      if (!runner) throw new Error('Script pattern runner missing (start not called)');
      return runner.update(ctx);
    },
    end(ctx) { cfg.onEnd?.(ctx); },
    serializeState() { return runner?.serialize(); },
  restoreState(state: any) { runner = ScriptRunner.deserialize(state); },
  };
  // Attach internal helpers (non-enumerable) for tests/tooling introspection.
  Object.defineProperty(pattern, '__scriptAbort', { value: () => runner?.abort(), enumerable: false });
  Object.defineProperty(pattern, '__scriptMetrics', { value: () => runner?.metrics(), enumerable: false });
  return pattern;
}
