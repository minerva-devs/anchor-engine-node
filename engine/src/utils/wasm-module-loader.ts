/**
 * WASM Module Loader
 *
 * Loads Rust-compiled WASM modules for cross-platform compatibility.
 * Replaces C++ native modules with zero-compilation WASM alternatives.
 *
 * Uses import.meta.resolve for proper ESM module resolution when
 * installed as an npm package.
 *
 * Standard 074: Native Module Acceleration (WASM Edition)
 */

// Module storage - initialized dynamically
let fingerprint_fn: ((text: string) => bigint) | null = null;
let distance_fn: ((a: bigint, b: bigint) => number) | null = null;
let sanitize_fn: ((text: string) => string) | null = null;
let atomize_fn: ((text: string, strategy: string) => string[]) | null = null;
let extract_keywords_fn: ((text: string, max: number) => string[]) | null = null;
let search_graph_fn: ((query: string, data: string, config: string) => string) | null = null;

// Track initialization state
let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize all WASM modules using import.meta.resolve for proper ESM resolution
 */
async function initWasmModules(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[WasmModuleLoader] Initializing WASM modules...');

      // Resolve and load fingerprint WASM
      try {
        const fingerprintPath = import.meta.resolve('@rbalchii/anchor-fingerprint-wasm');
        const fingerprintModule = await import(fingerprintPath);
        fingerprint_fn = fingerprintModule.fingerprint;
        distance_fn = fingerprintModule.distance;
        console.log('[WasmModuleLoader] ✓ anchor-fingerprint-wasm loaded');
      } catch (e) {
        console.error('[WasmModuleLoader] Failed to load anchor-fingerprint-wasm:', e);
      }

      // Resolve and load atomizer WASM
      try {
        const atomizerPath = import.meta.resolve('@rbalchii/anchor-atomizer-wasm');
        const atomizerModule = await import(atomizerPath);
        sanitize_fn = atomizerModule.sanitize;
        atomize_fn = atomizerModule.atomize;
        console.log('[WasmModuleLoader] ✓ anchor-atomizer-wasm loaded');
      } catch (e) {
        console.error('[WasmModuleLoader] Failed to load anchor-atomizer-wasm:', e);
      }

      // Resolve and load keyextract WASM
      try {
        const keyextractPath = import.meta.resolve('@rbalchii/anchor-keyextract-wasm');
        const keyextractModule = await import(keyextractPath);
        extract_keywords_fn = keyextractModule.extract_keywords;
        console.log('[WasmModuleLoader] ✓ anchor-keyextract-wasm loaded');
      } catch (e) {
        console.error('[WasmModuleLoader] Failed to load anchor-keyextract-wasm:', e);
      }

      // Resolve and load tagwalker WASM
      try {
        const tagwalkerPath = import.meta.resolve('@rbalchii/anchor-tagwalker-wasm');
        const tagwalkerModule = await import(tagwalkerPath);
        search_graph_fn = tagwalkerModule.search_graph;
        console.log('[WasmModuleLoader] ✓ anchor-tagwalker-wasm loaded');
      } catch (e) {
        console.error('[WasmModuleLoader] Failed to load anchor-tagwalker-wasm:', e);
      }

      initialized = true;
      console.log('[WasmModuleLoader] All WASM modules initialized successfully');
    } catch (e) {
      console.error('[WasmModuleLoader] Failed to initialize WASM modules:', e);
      throw e;
    }
  })();

  return initPromise;
}

export interface WasmModuleStatus {
  loaded: boolean;
  moduleName: string;
  version: string;
}

export class WasmModuleLoader {
  private static instance: WasmModuleLoader;
  private status: Map<string, WasmModuleStatus> = new Map();

  private constructor() {
    // Initialize modules asynchronously
    initWasmModules().catch(e => {
      console.error('[WasmModuleLoader] Initialization error:', e);
    });
  }

  public static getInstance(): WasmModuleLoader {
    if (!WasmModuleLoader.instance) {
      WasmModuleLoader.instance = new WasmModuleLoader();
    }
    return WasmModuleLoader.instance;
  }

  /**
   * Wait for all WASM modules to be initialized
   */
  public async waitForInit(): Promise<void> {
    await initWasmModules();
  }

  /**
   * Get module status
   */
  public getStatus(moduleName: string): WasmModuleStatus | undefined {
    return this.status.get(moduleName);
  }

  /**
   * Get all module statuses
   */
  public getAllStatus(): Map<string, WasmModuleStatus> {
    return this.status;
  }

  /**
   * Check if a module is loaded
   */
  public isLoaded(moduleName: string): boolean {
    switch (moduleName) {
      case 'anchor-fingerprint':
        return fingerprint_fn !== null && distance_fn !== null;
      case 'anchor-atomizer':
        return sanitize_fn !== null && atomize_fn !== null;
      case 'anchor-keyextract':
        return extract_keywords_fn !== null;
      case 'anchor-tagwalker':
        return search_graph_fn !== null;
      default:
        return false;
    }
  }

  /**
   * Convenience methods for common operations
   */

  // Fingerprint operations
  public fingerprint(text: string): bigint {
    if (!fingerprint_fn) {
      throw new Error('WASM fingerprint module not loaded');
    }
    return fingerprint_fn(text);
  }

  public distance(a: bigint, b: bigint): number {
    if (!distance_fn) {
      throw new Error('WASM distance module not loaded');
    }
    return distance_fn(a, b);
  }

  // Atomizer operations
  public sanitizeText(text: string): string {
    if (!sanitize_fn) {
      console.warn('[WasmModuleLoader] sanitize not loaded, returning original text');
      return text;
    }
    return sanitize_fn(text);
  }

  public atomizeText(text: string, strategy: string = 'prose'): string[] {
    if (!atomize_fn) {
      console.warn('[WasmModuleLoader] atomize not loaded, returning single chunk');
      return [text];
    }
    return atomize_fn(text, strategy);
  }

  // Keyphrase extraction
  public extractKeyphrases(text: string): string[] {
    if (!extract_keywords_fn) {
      console.warn('[WasmModuleLoader] extract_keywords not loaded, returning empty array');
      return [];
    }
    return extract_keywords_fn(text, 10);
  }

  // Graph search
  public searchGraph(query: string, data: string, config: string): string {
    if (!search_graph_fn) {
      throw new Error('WASM search_graph module not loaded');
    }
    return search_graph_fn(query, data, config);
  }
}

// Export singleton instance
export const wasmModuleLoader = WasmModuleLoader.getInstance();

// Export init function for explicit initialization
export { initWasmModules };