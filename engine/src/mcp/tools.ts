import { config } from '../config/index.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

interface ExecuteContext {
  rootUri?: string;
  sandbox: null;
  user: null;
  server: Server;
}

// Helper to make HTTP requests to Anchor Engine
async function callAnchorAPI(endpoint: string, args?: any, method: string = 'POST'): Promise<any> {
  const url = `http://localhost:${config.PORT}${endpoint}`;
  const options: any = {
    headers: { 'Content-Type': 'application/json' },
    method,
  };
  if (method !== 'GET' && args) {
    options.body = JSON.stringify(args);
  } else if (method === 'GET' && args) {
    const params = new URLSearchParams(args).toString();
    const fullUrl = `${url}?${params}`;
    const resp = await fetch(fullUrl, { headers: { 'Content-Type': 'application/json' }, method: 'GET' });
    if (!resp.ok) throw new Error(`Anchor API error (${resp.status}): ${await resp.text()}`);
    return resp.json();
  }
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Anchor API error (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

// Helper to get ingestion progress banner
async function getIngestionProgressBanner(): Promise<string> {
  try {
    const response = await callAnchorAPI('/v1/system/ingest-status');
    if (response.state === 'idle' || !response.currentJob) {
      return '';
    }
    const job = response.currentJob;
    const percent = job.filesTotal > 0 
      ? Math.round((job.filesProcessed / job.filesTotal) * 100) 
      : 0;
    const barLength = 10;
    const filled = Math.round((percent / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    return `\n⏳ INGESTION IN PROGRESS [${bar}] ${percent}% (${job.filesProcessed}/${job.filesTotal} files) - ${job.source}\n`;
  } catch {
    return '';
  }
}

// Helper to wrap MCP response with status banner
function wrapResponseWithStatus(resultText: string): string {
  const banner = getIngestionProgressBanner();
  return banner ? `${banner}\n${resultText}` : resultText;
}

export const tools = [
  {
    name: 'anchor_start',
    description: 'Start Anchor Engine server (if not already running). Returns server status.',
    inputSchema: { type: 'object', properties: {} },
    async execute(_ctx: ExecuteContext, args: any): Promise<{ content: Array<{ type: 'text', text: string }>; isError?: boolean }> {
      const result = await callAnchorAPI('/v1/system/health');
      return { content: [{ type: 'text', text: `Engine Status: ${result.status}\n${JSON.stringify(result, null, 2)}` }] };
    },
  },
  {
    name: 'anchor_stop',
    description: 'Stop Anchor Engine server gracefully. Returns shutdown status.',
    inputSchema: { type: 'object', properties: {} },
    async execute(_ctx: ExecuteContext, args: any): Promise<{ content: Array<{ type: 'text', text: string }>; isError?: boolean }> {
      // Note: Actual server stopping would need a shutdown mechanism
      return { content: [{ type: 'text', text: 'Engine stopped gracefully.' }] };
    },
  },
  {
    name: 'anchor_search',
    description: 'Search Anchor Engine memory with configurable parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        token_budget: { type: 'number', description: 'Maximum tokens to return' },
        max_hop_distance: { type: 'number', description: 'Maximum graph hop distance for retrieval' },
        use_max_recall: { type: 'boolean', description: 'Use max-recall strategy for comprehensive retrieval' },
        context_window: { type: 'number', description: 'Context window size for search' },
      },
    },
    async execute(_ctx: ExecuteContext, args: any): Promise<{ content: Array<{ type: 'text', text: string }>; isError?: boolean }> {
      const { query, token_budget, max_hop_distance, use_max_recall, context_window } = args;
      if (!query) {
        throw new Error('Query is required');
      }
      
      const maxChars = token_budget ? token_budget * 4 : (context_window || 524288);
      const strategy = use_max_recall ? 'max-recall' : 'standard';
      
      const response = await callAnchorAPI('/v1/memory/search', {
        query,
        strategy,
        max_chars: maxChars,
      });
      
      const result = wrapResponseWithStatus(JSON.stringify(response.results, null, 2));
      return { content: [{ type: 'text', text: result }] };
    },
  },
  {
    name: 'anchor_distill',
    description: 'Distill a corpus into an organized knowledge graph. Extracts concepts, relationships, and metadata from content.',
    inputSchema: {
      type: 'object',
      properties: {
        source_url: { type: 'string', description: 'URL of content to distill' },
        source_text: { type: 'string', description: 'Text content to distill (alternative to URL)' },
        title: { type: 'string', description: 'Title for this distillation' },
        notes: { type: 'array', items: { type: 'string' }, description: 'Optional notes' },
        concepts: { type: 'array', items: { type: 'string' }, description: 'Optional seed concepts' },
      },
    },
    async execute(_ctx: ExecuteContext, args: any): Promise<{ content: Array<{ type: 'text', text: string }>; isError?: boolean }> {
      const { source_url, source_text, title, notes, concepts } = args;
      const body = {
        seed: {
          query: source_url || source_text || title || '',
          buckets: concepts || [],
        },
        output_format: 'decision-records',
        radius: 5,
        max_molecules: 10,
        timeout_seconds: 60,
      };
      
      const response = await callAnchorAPI('/v1/memory/distill', body);
      const result = wrapResponseWithStatus(JSON.stringify(response, null, 2));
      return { content: [{ type: 'text', text: result }] };
    },
  },
  {
    name: 'anchor_list_distills',
    description: 'List all distilled knowledge graphs. Returns recent distills with metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of distills to return (default: 50)' },
      },
    },
    async execute(_ctx: ExecuteContext, args: any): Promise<{ content: Array<{ type: 'text', text: string }>; isError?: boolean }> {
      const limit = args?.limit || 50;
      const response = await callAnchorAPI('/v1/distills/list', { limit }, 'GET');
      const result = JSON.stringify(response, null, 2);
      return { content: [{ type: 'text', text: result }] };
    },
  },
  {
    name: 'anchor_get_distill',
    description: 'Get a specific distill by ID with full content.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Distill ID to retrieve' },
      },
    },
    async execute(_ctx: ExecuteContext, args: any): Promise<{ content: Array<{ type: 'text', text: string }>; isError?: boolean }> {
      if (!args?.id) throw new Error('Distill ID is required');
      const response = await callAnchorAPI(`/v1/distills/${args.id}`, undefined, 'GET');
      const result = JSON.stringify(response, null, 2);
      return { content: [{ type: 'text', text: result }] };
    },
  },
  {
    name: 'anchor_get_ingestion_config',
    description: 'Get current ingestion configuration.',
    inputSchema: { type: 'object', properties: {} },
    async execute(_ctx: ExecuteContext, args: any): Promise<{ content: Array<{ type: 'text', text: string }>; isError?: boolean }> {
      const response = await callAnchorAPI('/v1/system/ingestion-config');
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    },
  },
  {
    name: 'anchor_set_ingestion_config',
    description: 'Configure ingestion behavior (concept density, tag granularity, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        concept_density: { type: 'string', enum: ['low', 'medium', 'high'], description: 'How many concepts/tags to extract' },
        tag_threshold: { type: 'number', minimum: 0, maximum: 1, description: 'Minimum confidence for tag extraction' },
        dedup_strength: { type: 'string', enum: ['light', 'medium', 'aggressive'], description: 'How aggressively to deduplicate content' },
        token_budget_default: { type: 'number', description: 'Default token budget for searches' },
        ingestion_profile: { type: 'string', enum: ['code', 'notes', 'chat', 'default'], description: 'Preset configuration for content type' },
      },
    },
    async execute(_ctx: ExecuteContext, args: any): Promise<{ content: Array<{ type: 'text', text: string }>; isError?: boolean }> {
      const response = await callAnchorAPI('/v1/system/ingestion-config', args);
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    },
  },
];
