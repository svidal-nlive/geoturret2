#!/usr/bin/env node
// Print registry hash (IDs only). Works with either dist-baseline (preferred) or falls back to TS sources.
import fs from 'fs';
import path from 'path';

let loaded = false;
try {
	if (fs.existsSync(path.resolve('dist-baseline/content/registries.js'))) {
		await import('../dist-baseline/content/initialContent.js');
		const { Registries } = await import('../dist-baseline/content/registries.js');
		console.log(Registries.hash());
		loaded = true;
	}
} catch(e) { /* ignore and fallback */ }
if (!loaded) {
	await import('../src/content/initialContent.ts');
	const { Registries } = await import('../src/content/registries.ts');
	console.log(Registries.hash());
}
