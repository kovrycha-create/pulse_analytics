// Provide minimal DOM bindings for environments that don't automatically
// provide them (Vitest usually provides jsdom). Only set globals when
// they're missing to avoid overwriting existing envs.
try {
	if (typeof globalThis.document === 'undefined' || typeof globalThis.window === 'undefined') {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { JSDOM } = require('jsdom');
		const dom = new JSDOM('<!doctype html><html><body></body></html>');
		// @ts-ignore
		globalThis.window = dom.window;
		// @ts-ignore
		globalThis.document = dom.window.document;
		// don't overwrite navigator if present
		if (typeof (globalThis as any).navigator === 'undefined') {
			// @ts-ignore
			globalThis.navigator = dom.window.navigator;
		}
		// copy a few commonly used props
		['location', 'history', 'CustomEvent'].forEach((p) => {
			if (!(p in globalThis) && (dom.window as any)[p]) {
				// @ts-ignore
				globalThis[p] = (dom.window as any)[p];
			}
		});
	}
} catch (e) {
	// if jsdom isn't available, tests will still run in envs that provide a DOM
}

import '@testing-library/jest-dom';
