// Dynamic optional subsystem loader. Keeps core entry lean.
import type { GameState } from '../state/gameState';
import { GameOrchestrator } from '../engine';

export interface OptionalLoadResult {
  boss?: { register: () => void };
  audio?: any;
  hud?: () => void;
}

export async function loadOptionals(orchestrator: GameOrchestrator, state: GameState, seed: string, enableBoss = true) : Promise<OptionalLoadResult> {
  const res: OptionalLoadResult = {};
  if (enableBoss) {
    const { createBossSystem } = await import('../systems/bossSystem');
    const summary: any = { bossActive: false };
    res.boss = { register: () => orchestrator.register(createBossSystem(summary, state, { triggerWave: 1, seed })) };
    (window as any).boss = { summary: () => ({ ...summary }), abort: () => { summary.bossAbortRequested = true; } };
  }
  // Audio (optional)
  try {
    const { createAudioManager } = await import('../audio/audioManager');
    const audioMgr = createAudioManager(state, 1);
    res.audio = audioMgr;
  } catch {}
  // HUD + theme tooling
  try {
    const { initHud } = await import('../hud/initHud');
    const palettes = await import('../content/theme/palettes');
    res.hud = () => initHud(orchestrator, state, {
      audioMgr: res.audio,
      applyMotionPref: () => { document.body.classList.toggle('motion-reduction', !!state.motionReduction); },
      listPalettes: palettes.listPalettes,
      auditPalettesForContrast: palettes.auditPalettesForContrast,
      getPaletteTheme: () => state.theme,
      setPaletteTheme: (id: string) => { state.theme = id as any; },
      isThemeAutoEnabled: () => false,
      setThemeAutoEnabled: () => {},
      getThemeAutoMode: () => 'onChange',
      setThemeAutoMode: () => {},
      getThemeAutoIntervalSeconds: () => 5,
      setThemeAutoIntervalSeconds: () => {}
    });
  } catch {}
  return res;
}
