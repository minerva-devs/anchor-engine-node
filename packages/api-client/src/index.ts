/**
 * Anchor Engine API Client
 * 
 * Lightweight TypeScript client for interacting with Anchor Engine.
 * Works in browsers, Node.js, Obsidian plugins, and VS Code extensions.
 * 
 * @example
 * ```typescript
 * const client = new AnchorClient('http://localhost:3160');
 * 
 * // Search memory
 * const results = await client.search('OAuth setup', { token_budget: 2048 });
 * 
 * // Ingest text
 * await client.ingestText('Meeting notes...', 'meeting.md', 'inbox');
 * 
 * // Run distillation
 * const distilled = await client.distill({ query: 'career planning' });
 * ```
 */

import type {
  SearchQuery,
  SearchResponse,
  IngestTextRequest,
  IngestFileRequest,
  IngestResponse,
  DistillRequest,
  DistillResponse,
  IlluminateRequest,
  IlluminateResponse,
  SystemStats,
  HealthStatus,
  SearchIndexRequest,
  SearchIndexResponse,
  FetchSessionRequest,
  FetchSessionResponse,
  ApiResponse,
} from '@rbalchii/anchor-types';

export interface AnchorClientConfig {
  baseUrl: string;
  timeout?: number; // ms, default 30000
}

export class AnchorClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: AnchorClientConfig | string) {
    if (typeof config === 'string') {
      this.baseUrl = config;
      this.timeout = 30000;
    } else {
      this.baseUrl = config.baseUrl;
      this.timeout = config.timeout || 30000;
    }

    // Remove trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  // =============================================================================
  // Core API Methods
  // =============================================================================

  /**
   * Search the knowledge graph using STAR algorithm
   */
  async search(query: string, options?: Omit<SearchQuery, 'query'>): Promise<SearchResponse> {
    return this.post('/v1/memory/search', {
      query,
      ...options,
    });
  }

  /**
   * Ingest raw text content into the knowledge graph
   */
  async ingestText(
    content: string,
    filename: string,
    bucket: 'inbox' | 'external-inbox' = 'external-inbox'
  ): Promise<IngestResponse> {
    return this.post('/v1/research/upload-raw', {
      content,
      filename,
      bucket,
    });
  }

  /**
   * Ingest a file from the filesystem
   * Note: Only works when running locally (not in browser)
   */
  async ingestFile(
    path: string,
    bucket: 'inbox' | 'external-inbox' = 'external-inbox'
  ): Promise<IngestResponse> {
    return this.post('/v1/ingest', {
      path,
      bucket,
    });
  }

  /**
   * Run radial distillation to compress knowledge into Decision Records
   */
  async distill(options: DistillRequest['seed'] & {
    radius?: number;
    max_nodes?: number;
    output_format?: 'json' | 'yaml' | 'md';
  }): Promise<DistillResponse> {
    return this.post('/v1/memory/distill', {
      seed: {
        query: options.query,
        atom_ids: options.atom_ids,
      },
      radius: options.radius || 3,
      max_nodes: options.max_nodes || 500,
      output_format: options.output_format || 'json',
    });
  }

  /**
   * Explore the knowledge graph via BFS traversal
   */
  async illuminate(options?: {
    query?: string;
    max_depth?: number;
    max_nodes?: number;
  }): Promise<IlluminateResponse> {
    return this.post('/v1/memory/explore', {
      seed: options?.query ? { query: options.query } : undefined,
      max_depth: options?.max_depth || 3,
      max_nodes: options?.max_nodes || 50,
    });
  }

  // =============================================================================
  // Session Index (v4.8.0)
  // =============================================================================

  /**
   * Search the session index for relevant chat sessions
   */
  async searchIndex(query: string, options?: {
    max_results?: number;
    commands_only?: boolean;
  }): Promise<SearchIndexResponse> {
    return this.post('/v1/memory/search-index', {
      query,
      ...options,
    });
  }

  /**
   * Fetch full session data by session ID
   */
  async fetchSession(
    sessionId: string,
    options?: {
      max_messages?: number;
      include_metadata?: boolean;
    }
  ): Promise<FetchSessionResponse> {
    return this.post('/v1/memory/fetch-session', {
      session_id: sessionId,
      ...options,
    });
  }

  // =============================================================================
  // System & Stats
  // =============================================================================

  /**
   * Get system statistics
   */
  async getStats(): Promise<SystemStats> {
    return this.get('/v1/stats');
  }

  /**
   * Check system health
   */
  async health(): Promise<HealthStatus> {
    return this.get('/health');
  }

  /**
   * List all available compounds (source files)
   */
  async listCompounds(): Promise<ApiResponse<any>> {
    return this.get('/v1/compounds');
  }

  /**
   * Read a file with optional line range
   */
  async readFile(path: string, startLine?: number, endLine?: number): Promise<ApiResponse<any>> {
    return this.get('/v1/files/read', { path, start_line: startLine, end_line: endLine });
  }

  // =============================================================================
  // HTTP Helpers
  // =============================================================================

  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return this.request<T>(url.toString(), { method: 'GET' });
  }

  private async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private async request<T>(url: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Test connection to Anchor Engine
   */
  async ping(): Promise<boolean> {
    try {
      const health = await this.health();
      return health.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Wait for engine to be ready
   */
  async waitForReady(maxAttempts = 10, delayMs = 1000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.ping()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
  }
}

// =============================================================================
// Exports
// =============================================================================

export default AnchorClient;

// Re-export types for convenience
export * from '@rbalchii/anchor-types';
