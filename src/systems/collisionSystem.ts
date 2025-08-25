import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';

export function createCollisionSystem(state: GameState): System {
  return {
    id: 'collision', order: 10,
    update: (_dt, _ctx: OrchestratorContext) => {
      const debugPhases = process.env.PERF_DEBUG_PHASES;
      let t0:number|undefined; let pairs=0; let kills=0;
      if (debugPhases) t0 = performance.now();
      for (const b of state.bullets) if (b.alive) {
  const R = 12; // revert to original collision radius; center kill radius now drives cadence
  const R2 = R * R;
        for (const e of state.enemies) if (e.alive) {
          const dx = e.x - b.x; const dy = e.y - b.y;
          if (dx*dx + dy*dy < R2) { // hit radius R
            e.alive = false; b.alive = false; state.kills++; state.waveKills++; kills++; eventBus.emit('kill', { enemyId: e.id }); break;
          }
          if (debugPhases) pairs++;
        }
      }
      // periodic cleanup: reclaim dead or out-of-bounds (every 20 frames roughly via kills heuristic)
      if (state.kills % 5 === 0) {
        const cleanStart = debugPhases ? performance.now() : 0;
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const e = state.enemies[i];
          if (!e.alive) { state.enemies.splice(i,1); state.enemyPool.release(e); }
        }
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          const b = state.bullets[i];
            if (!b.alive || Math.abs(b.x) > 400 || Math.abs(b.y) > 400) { state.bullets.splice(i,1); state.bulletPool.release(b); }
        }
        if (debugPhases && t0 !== undefined) {
          const now = performance.now();
          const total = now - t0;
          const cleanMs = now - cleanStart;
          // Emit structured line for easy grep
          // Format: PERF_COLLISION frame=<frame?> total=<ms> pairs=<pairs> kills=<kills> cleanup=<ms>
          let poolInfo = '';
          if (process.env.PERF_DEBUG_POOLS) {
            const es = state.enemyPool.stats();
            const bs = state.bulletPool.stats();
            poolInfo = ` ePoolSize=${es.size} eFree=${es.free} bPoolSize=${bs.size} bFree=${bs.free}`;
          }
          console.log(`PERF_COLLISION total=${total.toFixed(4)} pairs=${pairs} kills=${kills} cleanup=${cleanMs.toFixed(4)}${poolInfo}`);
        }
      }
    }
  };
}
