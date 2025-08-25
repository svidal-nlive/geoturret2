import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState, Enemy } from '../state/gameState';
import { Registries } from '../content/registries';

export function createEnemySystem(state: GameState): System {
  return {
    id: 'enemySpawn', order: -50,
  update: (dt, ctx: OrchestratorContext) => {
  const GOLDEN_MODE = !!process.env.GOLDEN_MODE; // when true, freeze spawn + center-kill tuning for golden stability
  state.enemySpawnTimer += dt;
  // Spawn cadence:
  //  - Golden path: fixed logic snapshot (0.70s early until 10 kills or 10s) kept stable for golden recordings.
  //  - Non-golden path: starts from same baseline; future balance tweaks should modify only the else branch.
  let interval: number;
  if (GOLDEN_MODE) {
    interval = (ctx.frame < 600 && state.kills < 10) ? 0.70 : 0.75;
  } else {
    interval = (ctx.frame < 600 && state.kills < 10) ? 0.70 : 0.75; // identical now; tweak freely outside golden mode later
  }
      while (state.enemySpawnTimer >= interval) {
        state.enemySpawnTimer -= interval;
        const slot = state.enemyPool.acquire();
        if (!slot) break; // pool exhausted (future: metrics / backpressure)
        const angle = ctx.rng.next() * Math.PI * 2;
        const dist = 120 + ctx.rng.next() * 60; // spawn ring
        const speed = 20 + ctx.rng.next() * 20; // units per second
        slot.id = state.nextEnemyId++;
        // Simple selection: iterate enemy registry (placeholder: uniform pick). Future: weight by spawnWeight.
        const enemyIds = Registries.snapshot().enemies;
        if (enemyIds.length > 0) {
          const pick = enemyIds[Math.floor(ctx.rng.next() * enemyIds.length)];
          slot.defId = pick;
          const def = Registries.getEnemy(pick);
          slot.bounty = def?.bounty ?? 0;
        } else {
          slot.defId = 'unknown';
          slot.bounty = 0;
        }
        slot.bountyAwarded = false;
        slot.x = Math.cos(angle) * dist;
        slot.y = Math.sin(angle) * dist;
        slot.vx = -Math.cos(angle) * speed; // head roughly toward center
        slot.vy = -Math.sin(angle) * speed;
        slot.hp = 1;
        slot.alive = true;
        state.enemies.push(slot as Enemy);
      }
      // move enemies (in-place; dead entries retained until cleanup pass)
  // Center kill radius schedule (frozen under GOLDEN_MODE):
  let useRadius: number;
  if (GOLDEN_MODE) {
    const baseRadius = 32;
    const earlyBoost = 42;
    useRadius = ((ctx.frame < 360 && state.wave === 0) || (ctx.frame < 600 && state.kills < 10)) ? earlyBoost : baseRadius;
    if (state.kills < 10 && ctx.frame >= 500 && ctx.frame < 600) useRadius = 60; // late safety boost
  } else {
    // Current live logic mirrors golden snapshot; future tuning goes here.
    const baseRadius = 32;
    const earlyBoost = 42;
    useRadius = ((ctx.frame < 360 && state.wave === 0) || (ctx.frame < 600 && state.kills < 10)) ? earlyBoost : baseRadius;
    if (state.kills < 10 && ctx.frame >= 500 && ctx.frame < 600) useRadius = 60;
  }
  const CENTER_KILL_RADIUS2 = useRadius * useRadius;
      for (const e of state.enemies) if (e.alive) {
        e.x += e.vx * dt; e.y += e.vy * dt;
        const dist2 = e.x*e.x + e.y*e.y;
        // If hp already depleted (e.g., future DOT) just mark dead; collision system counted kill.
        if (e.hp <= 0) { e.alive = false; continue; }
        // Re-introduce center arrival as a kill to drive deterministic wave progression.
        if (dist2 < CENTER_KILL_RADIUS2) {
          e.alive = false;
          state.kills++; state.waveKills++;
          // Emit kill, then player hit (enemy reached core). Damage scales lightly by role.
          eventBus.emit('kill', { enemyId: e.id, cause: 'center' });
          if (e.defId) {
            const def = Registries.getEnemy(e.defId);
            let dmg = 10;
            switch (def?.role) {
              case 'fast': dmg = 8; break;
              case 'tank': dmg = 20; break;
              case 'elite': dmg = 25; break;
              default: dmg = 10; break;
            }
            eventBus.emit('playerHit', { enemyId: e.id, defId: e.defId, amount: dmg, role: def?.role });
          } else {
            eventBus.emit('playerHit', { enemyId: e.id, amount: 10 });
          }
          continue;
        }
      }
    }
  };
}
