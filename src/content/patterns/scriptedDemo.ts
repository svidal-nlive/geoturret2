import { GameState } from '../../state/gameState';
import { createScriptPattern, wait, doStep, loopUntil, ifStep } from './util/scriptPattern';
import { spawnPatternProjectile } from './util/patternProjectile';
import { spawnSpark } from '../../content/effects/particle';

// Simple scripted boss pattern leveraging P1-6 engine primitives.
// Timeline: warmup (30f) -> 3 repeating volleys (every 40f) -> finish.
export function createScriptedDemoPattern(state: GameState) {
  const steps = [
    wait(30, 'warmup'),
    // Loop until frame threshold inside pattern (frame tracked via ctx.frame): produce volleys every 40 frames
    loopUntil(ctx=>ctx.frame >= 30 + 40*3, [
      doStep(ctx => {
        for (let i=0;i<8;i++) {
          const ang = (Math.PI*2*i)/8;
          spawnPatternProjectile(state, { x: 0, y: 0, vx: Math.cos(ang)*70, vy: Math.sin(ang)*70, ttl: 1.5 });
          spawnSpark(state, 0,0, ang, 30);
        }
      }, 'volley'),
      wait(40, 'interVolley')
    ])
    , ifStep(()=> (state.bossHealth/state.bossMaxHealth) > 0.5, [
        doStep(()=>{ /* Phase transition placeholder above 50% */ })
      ], [
        doStep(()=>{ /* Alternate low-health finisher placeholder */ })
      ])
  ];
  return createScriptPattern({ id: 'scripted-demo', version: 1, steps });
}
