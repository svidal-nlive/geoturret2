import { System, OrchestratorContext } from '../engine';
import { player } from './playerSystem';

interface KeyState { [code: string]: boolean }

export function createInputSystem(speed = 120): System {
  const keys: KeyState = {};
  function onDown(e: KeyboardEvent) { keys[e.key.toLowerCase()] = true; }
  function onUp(e: KeyboardEvent) { keys[e.key.toLowerCase()] = false; }
  return {
    id: 'input', order: -200, // before player logic
    init: () => {
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
    },
    update: (dt: number, _ctx: OrchestratorContext) => {
      let vx = 0, vy = 0;
      if (keys['w'] || keys['arrowup']) vy -= 1;
      if (keys['s'] || keys['arrowdown']) vy += 1;
      if (keys['a'] || keys['arrowleft']) vx -= 1;
      if (keys['d'] || keys['arrowright']) vx += 1;
      if (vx || vy) {
        const len = Math.hypot(vx, vy) || 1;
        vx /= len; vy /= len;
        player.x += vx * speed * dt;
        player.y += vy * speed * dt;
      }
    },
    teardown: () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    }
  };
}
