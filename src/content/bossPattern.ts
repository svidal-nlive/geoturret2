/** Boss pattern interface (Phase 1 P1-6). */
import { OrchestratorContext } from '../engine';

export interface BossPattern {
  id: string;
  version: number;
  /** Called once when pattern starts */
  start(ctx: OrchestratorContext): void;
  /** Per-frame fixed step; return true when pattern complete */
  update(dt: number, ctx: OrchestratorContext): boolean;
  /** Optional clean-up */
  end?(ctx: OrchestratorContext): void;
  /** Serialize internal execution state for persistence (optional). */
  serializeState?(): any;
  /** Restore internal execution state previously serialized (optional). */
  restoreState?(state: any): void;
}

export type BossPatternFactory = () => BossPattern;
