import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';
import { player } from './playerSystem';

interface GrazeTag { grazed?: boolean }

/**
 * GrazeSystem: awards graze when enemy passes within grazeRadius but outside hitRadius of player.
 * Each enemy can grant at most one graze per lifetime.
 */
export function createGrazeSystem(state: GameState, opts?: { grazeRadius?: number; hitRadius?: number }): System {
  const GOLDEN_MODE = !!process.env.GOLDEN_MODE;
  // Under golden mode we freeze the widened radius values so future tweaks don't change goldens.
  const grazeRadius = GOLDEN_MODE ? 48 : (opts?.grazeRadius ?? 48);
  const hitRadius = GOLDEN_MODE ? 12 : (opts?.hitRadius ?? 12);
  const g2 = grazeRadius * grazeRadius;
  const h2 = hitRadius * hitRadius;
  return {
    id: 'graze', order: 5, // after movement, before collision cleanup
    update: (_dt: number, _ctx: OrchestratorContext) => {
      for (const e of state.enemies as (typeof state.enemies & GrazeTag[])) if (e.alive && !(e as GrazeTag).grazed) {
        const dx = e.x - player.x; const dy = e.y - player.y; const d2 = dx*dx + dy*dy;
        if (d2 <= g2 && d2 > h2) {
          (e as GrazeTag).grazed = true;
          state.grazeCount++; state.grazeThisWave++;
          eventBus.emit('graze', { enemyId: e.id, distance: Math.sqrt(d2) });
        }
      }
    }
  };
}
