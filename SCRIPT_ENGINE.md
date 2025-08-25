# Script Engine (Boss Pattern Timeline)

Deterministic frame-driven mini DSL powering scripted boss patterns.

## Goals
- Deterministic execution (resume-safe, replay-safe).
- Minimal authoring surface (imperative steps with explicit waits / forks).
- Bounded per-frame work (runaway protection).
- Introspectable metrics for perf & variance guards.

## Core Step Types

| Kind | Description | Notes |
|------|-------------|-------|
| `do` | Invoke a function immediately this frame | Should be pure / deterministic relative to state & RNG. Optional `label` captured for metrics. |
| `wait(frames)` | Suspend advancement for N frames | `frames>=0`; counted toward `waitFrames` metric. Frames decrement each update. |
| `if(predicate, then, else?)` | Branch expansion | Chosen branch spliced in-place; predicate may consume RNG (tracked). |
| `loopUntil(predicate, body)` | Repeat body until predicate true | Each iteration unrolled: `body` then the loop step again. Predicate re-evaluated each time. |
| `fork(branches)` | Launch parallel branches | Each branch implicitly appended with an auto `join` token. |
| `join(token)` | Internal synchronization point | Auto-inserted from `fork`; manual `join` tolerated (no-op if token missing). |

Helpers:
- `repeat(times, ...steps)` simple unrolled duplication.

## Execution Model
 
- Single `ScriptRunner` walks a mutable `steps[]` array.
- Certain steps mutate the array in place (branch & loop expansion) to keep indices monotonic & serialization simple.
- Per-frame loop executes sequential steps until encountering a blocking condition (`wait` not finished, `join` waiting on branches) or completion.
- Runaway guard: `maxStepsPerFrame` (default 100) throws `ScriptRuntimeError` if exceeded.

## Concurrency (fork/join)
 
- `fork` assigns an incrementing token; splices the current step into a `join` placeholder and creates child runners (branches each get an auto `join(token,'autoJoin')`).
- Parent `join` step each frame updates all branch runners; if all done it aggregates child metrics & label counts then advances.
- Branch runner serialization nests recursively preserving partial progress across resume.

## Serialization (Schema)

Serialized runner state (persisted in boss snapshot `bossPatternState` while active):

```json
{
  idx,                // current step index in mutated sequence
  wait,               // remaining wait frames (0 if none)
  done,               // completion flag
  nextForkToken,      // next token id
  steps,              // mutated step array (post-expansion)
  forks: [            // active fork groups
    { token, runners: [ <serialized child runner> ] }
  ],
  executedLabelCounts,// aggregated (includes completed branches after join aggregation)
  rngDraws,           // RNG draws consumed inside this runner (aggregated at joins)
  __dbg: { executedDoLabels } // ordered labels for executed top-level do steps (debug only)
}
```
Resume path uses `ScriptRunner.deserialize` to rebuild tree structure; branch metrics flow upward on join completion.

## Metrics (pattern.__scriptMetrics())

| Field | Meaning |
|-------|---------|
| `totalSteps` | Sum of step dispatches (including control steps) |
| `doCalls` | Number of `do` steps executed |
| `ifEvals` | Predicate evaluations for `if` |
| `loopIterations` | Loop body unroll counts |
| `forkLaunches` | Fork steps processed |
| `waitFrames` | Frames spent in `wait` steps (inclusive) |
| `joinWaitFrames` | Frames join spent polling unfinished branches |
| `rngDraws` | RNG draws consumed inside script (includes aggregated branch draws) |
| `executedLabelCounts` | Map label→execution count (post-join aggregated) |
| `idx` | Current step index (mutated sequence) |
| `done` | Completion flag |
| `aborted` | Abort flag (see below) |

These metrics are surfaced in boss perf attribution matrix & variance guard to catch instability (e.g. fluctuating fork fan-out altering RNG draws).

## Error Handling
 
`ScriptRuntimeError` enriches thrown errors with:
- `stepKind`
- `label`
- `index`
- `frame`
- `cause` (if underlying error thrown inside `do` predicate/body)

Validation examples:
- Negative wait frames
- Runaway per-frame step explosion

## Abort Flow
 
Patterns can be aborted externally via boss summary flag `bossAbortRequested=true` (system-level) or directly through internal helper `__scriptAbort()` in tests. Aborting marks runner done without executing remaining steps. Metrics reflect `aborted=true`.

## Determinism & Resume
 
Guarantees:
- Resuming mid-run yields identical final `executedLabelCounts`, `rngDraws`, and structural completion (`idx` at done) as continuous execution.
- Forked branch progress preserved precisely; no double execution after join aggregation.

Testing:
- Edge cases: nested forks, loop/fork interaction, manual orphan join, negative wait validation.
- Resume parity test ensures structural equivalence & label count parity.
- Duplication guard verifies continuous uniqueness plus parity after resume.

## Authoring Guidance
 
- Prefer few RNG draws; cache draw results and derive deterministic values arithmetically.
- Label meaningful `do` steps that spawn gameplay entities or mark phase transitions (enables perf/variance diffing).
- Keep loop predicates cheap & side-effect free.
- Avoid embedding large dynamic data in steps; compute on demand in `do`.

## Extensibility Roadmap
 
Planned (future):
- Timed `parallel` sugar (fork + wait + auto join pattern)
- `sequence(...blocks)` grouping with local abort scopes
- Step-level profiling (micro-timers for hot scripts)
- Authoring validation / static analyzer for common pitfalls (unlabelled high-impact do steps)

## Debugging Tips
 
Enable serialization debug during tests:
```bash
SCRIPT_DUP_DEBUG=1 npm test -- path/to/test
```
Look for `[ScriptRunner.serialize]` / `deserialize` logs to trace fork tree evolution.

Inspect live metrics during perf tests by reading `bossPatternScriptMetrics` from the orchestrator summary.

## Invariants Monitored in CI
 
- No unexpected variance in `rngDraws` (stddev guard)
- Stable `doCalls`, `forkLaunches`, `loopIterations` counts for a given pattern+seed matrix
- Label execution counts remain 1 for idempotent steps (unless intentionally repeated via loops)

Deviations trigger perf check failures prompting investigation before merge.
