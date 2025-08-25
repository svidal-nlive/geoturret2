import { eventBus } from '../engine';
import { GameState } from '../state/gameState';

/** Simple audio manager scaffold. No real sound assets yet – provides: 
 *  - master volume persistence
 *  - ducking (temporary reduction) triggered by events (e.g., playerHit)
 *  - motionReduction adaptation (lower ceiling / optional mute of minor SFX)
 */
export interface AudioManagerOptions { state: GameState; initialVolume?: number; }

export class AudioManager {
  private state: GameState;
  private masterVolume = 1;
  private ducked = false;
  private duckUntil = 0;
  private duckFactor = 0.4; // remaining volume multiplier while ducked
  private motionReductionCeiling = 0.6; // cap volume when motion reduction enabled
  private enabledDucking = true;

  constructor(opts: AudioManagerOptions) {
    this.state = opts.state;
    this.masterVolume = opts.initialVolume ?? 1;
    eventBus.on('playerHit', () => { if (this.enabledDucking) this.duck(0.5); });
    eventBus.on('playerDeath', () => { if (this.enabledDucking) this.duck(1.2); });
  }

  update(dt: number) {
    if (this.ducked && performance.now() >= this.duckUntil) {
      this.ducked = false;
    }
  }

  setMasterVolume(v: number) { this.masterVolume = Math.min(1, Math.max(0, v)); }
  getMasterVolume() { return this.masterVolume; }
  setDuckingEnabled(v: boolean) { this.enabledDucking = !!v; }
  getDuckingEnabled() { return this.enabledDucking; }
  setDuckFactor(f: number) { this.duckFactor = Math.min(1, Math.max(0.05, f)); }

  /** Trigger a duck for duration seconds */
  duck(duration: number) {
    this.ducked = true;
    this.duckUntil = performance.now() + duration * 1000;
  }

  /** Effective mixed volume after motion reduction & ducking */
  getEffectiveVolume() {
    let v = this.masterVolume;
    if (this.state.motionReduction) v = Math.min(v, this.motionReductionCeiling);
    if (this.ducked) v *= this.duckFactor;
    return v;
  }

  // Placeholder for playing a sound effect (no asset pipeline yet)
  playSfx(name: string, opts?: { volume?: number }) {
    // In future: route through WebAudio; deterministic id if needed.
    const vol = (opts?.volume ?? 1) * this.getEffectiveVolume();
    console.log('[audio] play', name, 'vol=', vol.toFixed(2));
  }
}

export function createAudioManager(state: GameState, initialVolume?: number) {
  const mgr = new AudioManager({ state, initialVolume });
  if (typeof window !== 'undefined') {
    (window as any).audio = (window as any).audio || {};
    (window as any).audio.getMasterVolume = () => mgr.getMasterVolume();
    (window as any).audio.setMasterVolume = (v: number) => mgr.setMasterVolume(v);
    (window as any).audio.getEffectiveVolume = () => mgr.getEffectiveVolume();
    (window as any).audio.setDuckingEnabled = (v: boolean) => mgr.setDuckingEnabled(v);
    (window as any).audio.getDuckingEnabled = () => mgr.getDuckingEnabled();
    (window as any).audio.setDuckFactor = (f: number) => mgr.setDuckFactor(f);
    (window as any).audio.duck = (d: number) => mgr.duck(d);
    (window as any).audio.play = (name: string, o?: any) => mgr.playSfx(name, o);
  }
  return mgr;
}
