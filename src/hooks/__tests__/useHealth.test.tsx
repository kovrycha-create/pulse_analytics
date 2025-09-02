import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { HealthProvider, useHealth } from '../useHealth';

// simple mock helper
const flushPromises = () => new Promise(setImmediate);

if (typeof document === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  // @ts-ignore
  global.window = dom.window;
  // @ts-ignore
  global.document = dom.window.document;
  // window.navigator is available on dom.window; don't overwrite global.navigator
}

// Ensure HealthProvider sees a base URL so it actually performs checks in tests
// (the provider early-returns if no base is configured).
// @ts-ignore
if (typeof (globalThis as any).window !== 'undefined') {
  try {
    // @ts-ignore
    (globalThis as any).window.__VITE_API_BASE = 'http://localhost';
  } catch (e) {
    // ignore
  }
}

describe('useHealth', () => {
  let originalFetch: any;
  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('marks connected when /api/health returns ok json quickly', async () => {
    global.fetch = vi.fn(async () => ({
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true, version: '1.2.3' })
    } as any));

    const wrapper: React.FC<any> = ({ children }) => (<HealthProvider>{children}</HealthProvider>);
  const { result } = renderHook(() => useHealth(), { wrapper } as any);

  // initial effect triggers check; wait a bit
  await act(async () => { await flushPromises(); });

    expect(result.current.state).toBe('connected');
    expect(result.current.version).toBe('1.2.3');
  });

  it('treats non-json as offline and captures snippet', async () => {
    global.fetch = vi.fn(async () => ({
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => '<html>dev server</html>'
    } as any));

    const wrapper: React.FC<any> = ({ children }) => (<HealthProvider>{children}</HealthProvider>);
    const { result } = renderHook(() => useHealth(), { wrapper } as any);
    await act(async () => { await flushPromises(); });

    expect(result.current.state).toBe('offline');
    const first = result.current.checks[0];
    expect(first.snippet).toContain('<html');
  });
});
