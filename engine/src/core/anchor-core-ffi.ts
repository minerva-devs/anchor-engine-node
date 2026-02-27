/**
 * FFI Bindings for Anchor Core C++ Library
 * 
 * DEPRECATED: This file is no longer used. The engine now uses PGlite exclusively.
 * Kept for reference only.
 */

console.warn('[FFI] anchor-core-ffi.ts is deprecated and no longer used');

export const anchor = {
  init: () => Promise.resolve(),
  search: () => [],
  getStats: () => ({}),
  insertAtom: () => 0,
  radialInflation: () => [],
  destroy: () => {}
};
