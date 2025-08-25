import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';

/**
 * Minimal survivability system:
 *  - Listens to playerHit events: reduces armor first, spillover to health.
 *  - Emits playerHealthChanged / playerArmorChanged / playerDeath events.
 */
export function createSurvivabilitySystem(state: GameState): System {
  return {
    id: 'survivability', order: 40, // before economy (45) / overdrive (50) fine
    init: () => {
      eventBus.on('playerHit', (e: any) => applyDamage(e?.amount ?? 0, e));
    },
    update: (_dt: number, _ctx: OrchestratorContext) => { /* no per-frame logic yet */ }
  };

  function applyDamage(amount: number, meta: any) {
    if (amount <= 0) return;
    if (state.playerHealth == null || state.playerMaxHealth == null) return;
    if (state.playerArmor == null || state.playerMaxArmor == null) return;
    let armor = state.playerArmor;
    let health = state.playerHealth;
    if (armor > 0) {
      const absorbed = Math.min(armor, amount);
      armor -= absorbed;
      amount -= absorbed;
      if (absorbed > 0) {
        state.playerArmor = armor;
        eventBus.emit('playerArmorChanged', { armor, max: state.playerMaxArmor, absorbed, remainingDamage: amount, meta });
      }
    }
    if (amount > 0) {
      health -= amount;
      state.playerHealth = health;
      eventBus.emit('playerHealthChanged', { health, max: state.playerMaxHealth, delta: -amount, meta });
      if (health <= 0 && !state.playerDead) {
        state.playerDead = true;
        eventBus.emit('playerDeath', { frame: meta?.frame, meta });
      }
    }
  }
}
