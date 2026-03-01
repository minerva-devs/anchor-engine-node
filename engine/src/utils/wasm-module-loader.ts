/**
 * WASM Module Loader
 * 
 * Loads Rust-compiled WASM modules for cross-platform compatibility.
 * Replaces C++ native modules with zero-compilation WASM alternatives.
 * 
 * Standard 074: Native Module Acceleration (WASM Edition)
 */

// Import WASM packages
import { fingerprint, distance } from '@rbalchii/anchor-fingerprint-wasm';
import { sanitize, atomize } from '@rbalchii/anchor-atomizer-wasm';

// These will be initialized dynamically to avoid TS issues with WASM packages
let extract_keywords_fn: ((text: string, max: number) => string[]) | null = null;
let search_graph_fn: ((query: string, data: string, config: string) => string) | null = null;

// Initialize WASM modules dynamically
async function initWasmModules() {
  try {
    // Use require for WASM packages to avoid TS type issues
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    
    const keyextract = require('@rbalchii/anchor-keyextract-wasm');
    extract_keywords_fn = keyextract.extract_keywords;
    
    const tagwalker = require('@rbalchii/anchor-tagwalker-wasm');
    search_graph_fn = tagwalker.search_graph;
    
    console.log('[WasmModuleLoader] All WASM modules loaded successfully');
  } catch (e) {
    console.error('[WasmModuleLoader] Failed to load WASM modules:', e);
  }
}

// Initialize on module load
initWasmModules();

export interface WasmModuleStatus {
  loaded: boolean;
  moduleName: string;
  version: string;
}

export class WasmModuleLoader {
  private static instance: WasmModuleLoader;
  private modules: Map<string, any> = new Map();
  private status: Map<string, WasmModuleStatus> = new Map();

  private constructor() {
    this.initializeModules();
  }

  public static getInstance(): WasmModuleLoader {
    if (!WasmModuleLoader.instance) {
      WasmModuleLoader.instance = new WasmModuleLoader();
    }
    return WasmModuleLoader.instance;
  }

  /**
   * Initialize all WASM modules
   */
  private initializeModules() {
    // Register fingerprint module
    this.modules.set('anchor-fingerprint', { fingerprint, distance });
    this.status.set('anchor-fingerprint', {
      loaded: true,
      moduleName: 'anchor-fingerprint',
      version: '1.0.0'
    });

    // Register atomizer module
    this.modules.set('anchor-atomizer', { sanitize, atomize });
    this.status.set('anchor-atomizer', {
      loaded: true,
      moduleName: 'anchor-atomizer',
      version: '1.0.0'
    });

    // Register keyextract module
    this.modules.set('anchor-keyextract', { extractKeywords: extract_keywords_fn });
    this.status.set('anchor-keyextract', {
      loaded: true,
      moduleName: 'anchor-keyextract',
      version: '1.0.0'
    });

    // Register tagwalker module
    this.modules.set('anchor-tagwalker', { searchGraph: search_graph_fn });
    this.status.set('anchor-tagwalker', {
      loaded: true,
      moduleName: 'anchor-tagwalker',
      version: '1.0.0'
    });

    console.log('[WasmModuleLoader] All WASM modules initialized successfully');
  }

  /**
   * Get a loaded WASM module
   */
  public getModule(moduleName: string): any {
    if (!this.modules.has(moduleName)) {
      throw new Error(`WASM module ${moduleName} not found`);
    }
    return this.modules.get(moduleName);
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
    return this.status.get(moduleName)?.loaded || false;
  }

  /**
   * Convenience methods for common operations
   */
  
  // Fingerprint operations
  public fingerprint(text: string): bigint {
    return fingerprint(text);
  }

  public distance(a: bigint, b: bigint): number {
    return distance(a, b);
  }

  // Atomizer operations
  public sanitizeText(text: string): string {
    return sanitize(text);
  }

  public atomizeText(text: string, strategy: string = 'prose'): string[] {
    return atomize(text, strategy);
  }

  // Keyphrase extraction
  public extractKeyphrases(text: string): string[] {
    if (extract_keywords_fn) {
      return extract_keywords_fn(text, 10);
    }
    // Fallback if WASM not loaded
    console.warn('[WasmModuleLoader] extract_keywords not loaded, returning empty array');
    return [];
  }
}

// Export singleton instance
export const wasmModuleLoader = WasmModuleLoader.getInstance();
