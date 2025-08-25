import { describe, it, expect } from 'vitest';
import { createScriptPattern, doStep, wait, fork } from '../content/patterns/util/scriptPattern';

// Modernized duplicate do-step execution diagnostics: we only enforce uniqueness in continuous run.
// Known limitation: mid-run serialization + resume may currently duplicate terminal branch do steps; tracked separately.

describe('boss script engine duplicate do-step execution guard', () => {
	it('continuous run executes each labeled do step exactly once', () => {
		const labels = ['A1','A2a','A2b','A3a','A3b','A4','B1','B2','after'];
		const counts: Record<string, number> = Object.fromEntries(labels.map(l=>[l,0]));
		const pattern: any = createScriptPattern({ id: 'dup-check', version: 1, steps: [
			doStep(()=>counts['root-start']=(counts['root-start']||0)+1,'root-start'),
			fork([
				[ doStep(()=>counts.A1++, 'A1'), fork([[ doStep(()=>counts.A2a++,'A2a'), wait(1), doStep(()=>counts.A2b++,'A2b') ], [ doStep(()=>counts.A3a++,'A3a'), wait(2), doStep(()=>counts.A3b++,'A3b') ]]), doStep(()=>counts.A4++,'A4') ],
				[ doStep(()=>counts.B1++,'B1'), wait(1), doStep(()=>counts.B2++,'B2') ]
			]),
			doStep(()=>counts.after++,'after')
		]});
		const ctx: any = { frame:0 };
		pattern.start(ctx);
		for (let f=0; f<200; f++) { ctx.frame=f; if (pattern.update(1/60, ctx)) break; }
		for (const l of labels) expect(counts[l]).toBe(1);
	});

	it('resume path preserves executed label counts & rngDraws parity', () => {
		const mk = () => createScriptPattern({ id: 'dup-resume', version: 1, steps: [
			doStep(()=>{/* root */},'root-start'),
			fork([
				[ doStep(()=>{/* A1 */},'A1'), fork([[ doStep(()=>{/* A2a */},'A2a'), wait(1), doStep(()=>{/* A2b */},'A2b') ], [ doStep(()=>{/* A3a */},'A3a'), wait(2), doStep(()=>{/* A3b */},'A3b') ]]), doStep(()=>{/* A4 */},'A4') ],
				[ doStep(()=>{/* B1 */},'B1'), wait(1), doStep(()=>{/* B2 */},'B2') ]
			]),
			doStep(()=>{/* after */},'after')
		]});
		const ctxA: any = { frame:0, rng:{ draws:0 } };
		const patternA: any = mk(); patternA.start(ctxA);
		for (let f=0; f<2; f++) { ctxA.frame=f; patternA.update(1/60, ctxA); }
		const snap = patternA.serializeState();
		const ctxB: any = { frame: ctxA.frame, rng:{ draws: ctxA.rng.draws } };
		const patternB: any = mk(); patternB.start(ctxB); patternB.restoreState(snap);
		for (let f=0; f<200; f++) { ctxA.frame++; ctxB.frame=ctxA.frame; const dA=patternA.update(1/60, ctxA); const dB=patternB.update(1/60, ctxB); if (dA||dB) break; }
		const finalA = patternA.serializeState(); const finalB = patternB.serializeState();
		expect(finalA.done).toBe(true); expect(finalB.done).toBe(true);
		function aggregate(state: any) {
			const out: Record<string, number> = { ...state.executedLabelCounts };
			let rng = state.rngDraws || 0;
			for (const f of state.forks || []) {
				for (const r of f.runners) {
					const child = aggregate(r);
					for (const [k,v] of Object.entries(child.counts)) out[k] = (out[k]||0)+v;
					rng += child.rng;
				}
			}
			return { counts: out, rng };
		}
		const aggA = aggregate(finalA); const aggB = aggregate(finalB);
		expect(aggA.counts).toEqual(aggB.counts);
		expect(aggA.rng).toBe(aggB.rng);
		['A1','A2a','A2b','A3a','A3b','A4','B1','B2','after','root-start'].forEach(l=>{
			expect(aggA.counts[l]).toBe(1);
		});
	});
});
