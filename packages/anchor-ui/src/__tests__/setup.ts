import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated but still used
    removeListener: vi.fn(), // Deprecated but still used
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock fetch globally
global.fetch = vi.fn();

// Mock console.error to suppress expected test warnings
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Suppress React testing library warnings about cleanup
  if (
    args[0]?.includes?.('act(') ||
    args[0]?.includes?.('ReactDOM.render') ||
    args[0]?.includes?.('Warning: An update to')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as any;
};

// Mock cancelAnimationFrame
global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};
