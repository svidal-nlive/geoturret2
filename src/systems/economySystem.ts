import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';
import { Registries } from '../content/registries';

/** Economy system: awards coins on kill based on enemy bounty (once). */
export function createEconomySystem(state: GameState): System {
  return {
    id: 'economy', order: 45, // before overdrive (50) doesn't matter; we just mutate coins
    init: () => {
      eventBus.on('kill', (e: any) => {
        // Attempt to locate enemy in state for bounty (alive flag already false)
        if (!e || typeof e.enemyId !== 'number') return;
        const enemy = state.enemies.find(en => en.id === e.enemyId);
        let bounty = 0;
        if (enemy) {
          if (enemy.bountyAwarded) return; // guard double emission (center kill + collision safety)
          bounty = enemy.bounty ?? 0;
          enemy.bountyAwarded = true;
        } else if (e.defId) {
          // Fallback: if event carries defId in future, use registry
          bounty = Registries.getEnemy(e.defId)?.bounty ?? 0;
        }
        if (bounty > 0) {
          state.coins = (state.coins || 0) + bounty;
          eventBus.emit('coinsAwarded', { enemyId: e.enemyId, amount: bounty, total: state.coins });
        }
      });
    },
    update: (_dt: number, _ctx: OrchestratorContext) => {
      // No per-frame logic yet (future: passive income, interest, etc.)
    }
  };
}
