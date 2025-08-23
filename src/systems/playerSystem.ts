import { System, OrchestratorContext } from '../engine';
import { GameState } from '../state/gameState';

export interface Player { x: number; y: number; }
export const player: Player = { x: 0, y: 0 };

export function createPlayerSystem(state: GameState): System {
  return {
    id: 'player', order: -100,
    init: () => {
      player.x = 0; player.y = 0;
    },
    update: (_dt, _ctx: OrchestratorContext) => {
      // For now player fixed at center (0,0) – coordinates are relative; render system will translate.
    }
  };
}
