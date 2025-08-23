import { System, OrchestratorContext, eventBus } from '../engine';
import { GameState } from '../state/gameState';
import { player } from './playerSystem';

/** Simple smooth camera following the player with configurable lag. */
export function createCameraSystem(state: GameState, opts?: { stiffness?: number; worldRadius?: number; bounds?: { minX: number; maxX: number; minY: number; maxY: number }; deadzone?: number; zoomStiffness?: number; leadTime?: number; maxLead?: number }): System {
  const stiffness = opts?.stiffness ?? 10; // follow smoothing
  const deadzone = opts?.deadzone ?? 8;
  const zoomStiff = opts?.zoomStiffness ?? 6;
  const leadTime = opts?.leadTime ?? 0; // seconds to look ahead along velocity
  const maxLead = opts?.maxLead ?? 160; // clamp distance of lead
  // Backwards compat: worldRadius if rectangular bounds not provided
  const worldRadius = opts?.worldRadius ?? 0;
  const rect = opts?.bounds;
  // Expose simple shake API
  if (typeof window !== 'undefined') {
    (window as any).cameraShake = function(duration = 0.4, amp = 24, freq = 28) {
      state.camera.shakeDuration = duration;
      state.camera.shakeRemaining = duration;
      state.camera.shakeAmp = amp;
      state.camera.shakeFreq = freq;
    };
    (window as any).cameraZoomTo = function(z = 1) { state.camera.targetZoom = Math.max(0.2, Math.min(3, z)); };
  }
  // Track previous player position for velocity estimation
  let prevPx = player.x;
  let prevPy = player.y;
  return {
    id: 'camera', order: -150, // after input (-200) but before player (-100) not required, just early
    update: (dt: number, _ctx: OrchestratorContext) => {
      const cx = state.camera.x;
      const cy = state.camera.y;
      // target player pos
      let tx = player.x;
      let ty = player.y;
      // Velocity-based lead (estimate velocity from previous frame)
      if (leadTime > 0 && dt > 0) {
        const vx = (player.x - prevPx) / dt;
        const vy = (player.y - prevPy) / dt;
        let lx = vx * leadTime;
        let ly = vy * leadTime;
        const mag = Math.hypot(lx, ly);
        if (mag > maxLead) { const s = maxLead / (mag || 1); lx *= s; ly *= s; }
        tx += lx; ty += ly;
      }
      // Deadzone: if player within deadzone rect around camera, don't adjust target (reduces micro jitter)
      if (Math.abs(tx - cx) < deadzone) tx = cx;
      if (Math.abs(ty - cy) < deadzone) ty = cy;
      // exponential smoothing toward player
      const lerp = 1 - Math.exp(-stiffness * dt);
      let nx = cx + (tx - cx) * lerp;
      let ny = cy + (ty - cy) * lerp;
      // Clamp to bounds
      if (rect) {
        nx = Math.max(rect.minX, Math.min(rect.maxX, nx));
        ny = Math.max(rect.minY, Math.min(rect.maxY, ny));
      } else if (worldRadius > 0) {
        const dist2 = nx*nx + ny*ny;
        const r = worldRadius;
        if (dist2 > r*r) { const d = Math.sqrt(dist2); nx = nx / d * r; ny = ny / d * r; }
      }
      state.camera.x = nx;
      state.camera.y = ny;
      // Zoom smoothing toward targetZoom
      const zoomLerp = 1 - Math.exp(-zoomStiff * dt);
      state.camera.zoom += (state.camera.targetZoom - state.camera.zoom) * zoomLerp;
      // Shake update
      if (state.camera.shakeRemaining > 0) {
        state.camera.shakeRemaining -= dt;
        const t = state.camera.shakeDuration - state.camera.shakeRemaining;
        const progress = Math.max(0, state.camera.shakeRemaining) / state.camera.shakeDuration;
        const damp = progress; // linear falloff
        const f = state.camera.shakeFreq;
        // Use simple sin noise based on time & remaining
        state.camera.shakeX = (Math.sin(t * f * 13.37) * 0.5 + Math.sin(t * f * 7.11) * 0.5) * state.camera.shakeAmp * damp;
        state.camera.shakeY = (Math.cos(t * f * 11.17) * 0.5 + Math.sin(t * f * 5.27) * 0.5) * state.camera.shakeAmp * damp;
      } else {
        state.camera.shakeX = 0; state.camera.shakeY = 0;
      }
  prevPx = player.x;
  prevPy = player.y;
    }
  };
}
