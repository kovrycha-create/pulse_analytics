import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SetupGuide from '../../components/SetupGuide';

// If the test runner didn't provide a DOM, create a minimal one so
// render() works. Vitest usually uses jsdom; this is a safe fallback.
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

describe('SetupGuide', () => {
  beforeEach(() => {
    // mock clipboard
    // @ts-ignore
    global.navigator.clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined)
    };
  });

  it('renders script tag and copies to clipboard', async () => {
  const { getByRole } = render(<SetupGuide />);

  const button = getByRole('button', { name: /copy/i });
  expect(button).toBeDefined();

  fireEvent.click(button);

  // @ts-ignore
  expect(navigator.clipboard.writeText).toHaveBeenCalled();
  // @ts-ignore - inspect mock calls
  const copiedText = (navigator.clipboard.writeText as any).mock.calls[0][0];
    expect(copiedText).toMatch(/<script async defer src="/);
  });
});
