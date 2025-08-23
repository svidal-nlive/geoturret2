import { GameState } from '../../state/gameState';
import { createScriptPattern, wait, doStep, loopUntil, ifStep, fork } from './util/scriptPattern';
import { spawnPatternProjectile } from './util/patternProjectile';
import { spawnSpark, spawnEmber } from '../effects/particle';

// Advanced phase pattern: spawns parallel radial volleys with increasing density as health drops.
// Demonstrates forked substreams that terminate naturally when loopUntil predicate satisfied.
export function createPhaseForkDemoPattern(state: GameState) {
  const makeRadialVolley = (count: number, speed: number) => doStep(ctx => {
    for (let i=0;i<count;i++) {
      const ang = (Math.PI*2*i)/count;
      spawnPatternProjectile(state, { x: 0, y: 0, vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed, ttl: 2 });
      spawnSpark(state, 0, 0, ang, speed*0.4);
    }
  }, `radial-${count}`);

  const healthPct = () => state.bossHealth / state.bossMaxHealth;

  const phaseBody = (thresholdLow: number, thresholdHigh: number, baseCount: number) => [
    loopUntil(()=> healthPct() < thresholdLow, [
      makeRadialVolley(baseCount, 60 + (1-thresholdLow)*40),
      wait(30),
      makeRadialVolley(baseCount+4, 70 + (1-thresholdLow)*50),
      wait(30)
    ]),
    doStep(()=>{ /* phase complete marker */ })
  ];

  const steps = [
    doStep(()=>{ /* start */ }),
    // Opening fork: two staggered ember FX lanes for visual flair
    fork([
      [loopUntil(()=>healthPct() < 0.95, [doStep(ctx=>{ spawnEmber(state, 0,0, ctx.rng); }), wait(5)])],
      [loopUntil(()=>healthPct() < 0.95, [wait(2), doStep(ctx=>{ spawnEmber(state, 0,0, ctx.rng); }), wait(5)])]
    ]),
    // Phase 1 (100% -> 75%)
    ...phaseBody(0.75, 1.0, 8),
    ifStep(()=> healthPct() < 0.75, [doStep(()=>{/* enter phase2 */})]),
    ...phaseBody(0.50, 0.75, 10),
    ifStep(()=> healthPct() < 0.50, [doStep(()=>{/* enter phase3 */})]),
    ...phaseBody(0.25, 0.50, 12),
    ifStep(()=> healthPct() < 0.25, [doStep(()=>{/* final phase */})]),
    // Final burn (below 25%) faster volleys until death
    loopUntil(()=> state.bossHealth <=0, [
      makeRadialVolley(16, 120),
      wait(20)
    ]),
    doStep(()=>{/* pattern finished */})
  ];
  return createScriptPattern({ id: 'phase-fork-demo', version: 1, steps });
}
