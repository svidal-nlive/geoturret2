import { describe, it, expect } from 'vitest';
import '../content/initialContent';
import { GameOrchestrator } from '../engine/orchestrator';
import { createRandomCounterSystem } from '../systems/randomCounterSystem';
import { applySnapshotSummary, createOrchestratorFromSnapshot } from './serialization';
import { createGameState } from './gameState';

/**
 * Validate restoring a snapshot yields identical subsequent RNG-driven system output
 * compared to an uninterrupted run (mid-run resume determinism).
 */
describe('snapshot restore path', () => {
  it('restores orchestrator frame/time/rng producing identical future sequence', () => {
    const seed = 'restore-seed';
    // Continuous run orchestrator
    const full = new GameOrchestrator({ fixedStep: 1/60, seed });
    const sysFull = createRandomCounterSystem();
    full.register(sysFull.system);
    full.init();

    // Partial run orchestrator we will snapshot then resume via restoration
    const partA = new GameOrchestrator({ fixedStep: 1/60, seed });
    const sysA = createRandomCounterSystem('rcA');
    partA.register(sysA.system);
    partA.init();

    // Advance both to snapshot frame (e.g., ~0.5s -> 30 frames)
    full.advance(0.5);
    partA.advance(0.5);
    const snap = partA.snapshot();

    // Advance continuous orchestrator further (e.g., additional 0.4s)
    full.advance(0.4);
    const fullValues = sysFull.getValues().slice();

    // Resume: create new orchestrator (partB) and restore snapshot
    const partB = new GameOrchestrator({ fixedStep: 1/60, seed }); // seed will be overridden by restore rngState
    const sysB = createRandomCounterSystem('rcB');
    partB.register(sysB.system);
    partB.init();
    // Mutate internal state to snapshot values
    partB.restore({ frame: snap.frame, time: snap.time, rngState: snap.rngState });
    // Apply summary to game state (simulating user-provided state container)
    const gs = createGameState();
    applySnapshotSummary(gs, snap);

    // Advance remaining time equal to what full already advanced post-snapshot (0.4s)
    partB.advance(0.4);
    const resumedValues = sysB.getValues();

    // The tail portion of continuous values after snapshot frame should equal resumed sequence
    const snapshotFrameCount = snap.frame; // frames already produced before snapshot
    const tail = fullValues.slice(snapshotFrameCount); // remaining frames values
    expect(resumedValues).toEqual(tail);
  });

  it('helper createOrchestratorFromSnapshot resumes deterministically', () => {
    const seed = 'restore-seed-helper';
    const full = new GameOrchestrator({ fixedStep: 1/60, seed });
    const sysFull = createRandomCounterSystem();
    full.register(sysFull.system);
    full.init();
    full.advance(0.5);
    const snap = full.snapshot();
    full.advance(0.4);
    const fullValues = sysFull.getValues();

    const sysResume = createRandomCounterSystem('rcResume');
    const resumed = createOrchestratorFromSnapshot(snap, { fixedStep: 1/60, systems: [sysResume.system] });
    resumed.advance(0.4);
    const resumedValues = sysResume.getValues();
    const tail = fullValues.slice(snap.frame);
    expect(resumedValues).toEqual(tail);
  });
});
