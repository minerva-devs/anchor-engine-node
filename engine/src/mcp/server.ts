/**
 * Anchor Engine MCP Server
 * 
 * Exposes Anchor Engine functionality as MCP tools for agent consumption.
 * This allows Qwen Code agents and other MCP clients to control Anchor Engine
 * programmatically.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from '../config/index.js';

const ANCHOR_BASE_URL = `http://localhost:${config.PORT}`;

// Create MCP server
const server = new Server(
  {
    name: 'anchor-engine',
    version: '4.8.2',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Helper function to make HTTP requests to Anchor Engine
async function callAnchorAPI(endpoint: string, options?: RequestInit): Promise<any> {
  const url = `${ANCHOR_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anchor API error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Get current ingestion progress for MCP response banners
 * Returns a formatted status line showing 0-100% progress
 */
async function getIngestionProgressBanner(): Promise<string> {
  try {
    const response = await callAnchorAPI('/v1/system/ingest-status');
    
    // API returns { status: 'success', state: 'idle'|'processing'|..., currentJob: {...} }
    if (response.state === 'idle' || !response.currentJob) {
      return '';
    }
    
    const job = response.currentJob;
    const percent = job.filesTotal > 0 
      ? Math.round((job.filesProcessed / job.filesTotal) * 100) 
      : 0;
    
    // Create visual progress bar
    const barLength = 10;
    const filled = Math.round((percent / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    
    return `\n⏳ INGESTION IN PROGRESS [${bar}] ${percent}% (${job.filesProcessed}/${job.filesTotal} files) - ${job.source}\n`;
  } catch {
    return '';
  }
}

/**
 * Wrap MCP response with ingestion status banner if ingestion is active
 */
async function wrapResponseWithStatus(resultText: string): Promise<string> {
  const banner = await getIngestionProgressBanner();
  if (banner) {
    return `${banner}\n${resultText}`;
  }
  return resultText;
}

// Define all MCP tools
const TOOLS = [
  {
    name: 'anchor_start',
    description: 'Start Anchor Engine server (if not already running). Returns server status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_stop',
    description: 'Stop Anchor Engine server gracefully. Returns shutdown status.',
    inputSchema: {
      type: 'object',
      properties: {
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds to wait for shutdown (default: 30000)',
        },
      },
    },
  },
  {
    name: 'anchor_status',
    description: 'Get current server status including state, active tasks, and progress.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_health',
    description: 'Check server health (database connectivity, directory accessibility). Returns 200 if healthy, 503 if unhealthy.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_ingest',
    description: 'Ingest content into Anchor Engine memory.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File or directory path to ingest',
        },
        content: {
          type: 'string',
          description: 'Raw content to ingest (alternative to path)',
        },
        source: {
          type: 'string',
          description: 'Source identifier (e.g., "qwen-session-123")',
        },
        type: {
          type: 'string',
          description: 'Content type (e.g., "chat", "code", "notes")',
        },
        buckets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Buckets to ingest into',
        },
        wait: {
          type: 'boolean',
          description: 'If true, block until ingestion completes',
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: 'anchor_ingest_status',
    description: 'Get current ingestion progress and status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_wait_for_ingest',
    description: 'Block until current ingestion completes.',
    inputSchema: {
      type: 'object',
      properties: {
        timeout: {
          type: 'number',
          description: 'Maximum time to wait in milliseconds (default: 300000)',
        },
        job_id: {
          type: 'string',
          description: 'Specific job ID to wait for (optional)',
        },
      },
    },
  },
  {
    name: 'anchor_set_ingestion_config',
    description: 'Configure ingestion behavior (concept density, tag granularity, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        concept_density: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'How many concepts/tags to extract',
        },
        tag_threshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Minimum confidence for tag extraction',
        },
        dedup_strength: {
          type: 'string',
          enum: ['light', 'medium', 'aggressive'],
          description: 'How aggressively to deduplicate content',
        },
        token_budget_default: {
          type: 'number',
          description: 'Default token budget for searches',
        },
        ingestion_profile: {
          type: 'string',
          enum: ['code', 'notes', 'chat', 'default'],
          description: 'Preset configuration for content type',
        },
      },
    },
  },
  {
    name: 'anchor_get_ingestion_config',
    description: 'Get current ingestion configuration.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_search',
    description: 'Search Anchor Engine memory with configurable parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        token_budget: {
          type: 'number',
          description: 'Maximum tokens to return',
        },
        max_hop_distance: {
          type: 'number',
          description: 'Maximum graph hop distance for retrieval',
        },
        include_provenance: {
          type: 'boolean',
          description: 'Include provenance metadata in results',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'anchor_distill',
    description: 'Compress knowledge into deduplicated summaries (YAML/MD).',
    inputSchema: {
      type: 'object',
      properties: {
        seed: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            compound_ids: { type: 'array', items: { type: 'string' } },
            buckets: { type: 'array', items: { type: 'string' } },
          },
          description: 'Seed for radial distillation',
        },
        radius: {
          type: 'number',
          description: 'Search radius in graph hops',
        },
        max_radius: {
          type: 'number',
          description: 'Maximum radius to expand to',
        },
        output_format: {
          type: 'string',
          enum: ['yaml', 'json', 'compound'],
          description: 'Output format',
        },
        output_path: {
          type: 'string',
          description: 'Custom output path',
        },
      },
    },
  },
  {
    name: 'anchor_illuminate',
    description: 'Explore connected concepts from a seed topic using BFS graph traversal.',
    inputSchema: {
      type: 'object',
      properties: {
        seed: {
          type: 'string',
          description: 'Seed query or topic to explore',
        },
        depth: {
          type: 'number',
          description: 'Maximum traversal depth',
        },
        max_nodes: {
          type: 'number',
          description: 'Maximum nodes to explore',
        },
      },
      required: ['seed'],
    },
  },
  {
    name: 'anchor_set_path',
    description: 'Add a new path to watch for file changes.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to watch',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'anchor_delete_path',
    description: 'Remove a path from being watched for file changes.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to stop watching',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'anchor_list_paths',
    description: 'List all currently watched paths.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Handle tool list request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    let resultText: string;

    switch (name) {
      case 'anchor_start': {
        const result = await callAnchorAPI('/v1/system/start', {
          method: 'POST',
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_stop': {
        const result = await callAnchorAPI('/v1/system/stop', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_status': {
        const result = await callAnchorAPI('/v1/system/status');
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_health': {
        const result = await callAnchorAPI('/health');
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_ingest': {
        const { wait, ...ingestArgs } = args || {};

        // Start ingestion
        const result = await callAnchorAPI('/v1/ingest', {
          method: 'POST',
          body: JSON.stringify(ingestArgs),
        });

        // Optionally wait for completion
        if (wait) {
          await callAnchorAPI('/v1/system/wait-for-ingest', {
            method: 'POST',
            body: JSON.stringify({ job_id: result.job_id }),
          });
        }

        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_ingest_status': {
        const result = await callAnchorAPI('/v1/system/ingest-status');
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_wait_for_ingest': {
        const result = await callAnchorAPI('/v1/system/wait-for-ingest', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_set_ingestion_config': {
        const result = await callAnchorAPI('/v1/config/ingestion', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_get_ingestion_config': {
        const result = await callAnchorAPI('/v1/config/ingestion');
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_search': {
        const result = await callAnchorAPI('/v1/search', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_distill': {
        const result = await callAnchorAPI('/v1/distill', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_illuminate': {
        const result = await callAnchorAPI('/v1/illuminate', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_set_path': {
        const result = await callAnchorAPI('/v1/system/paths', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_delete_path': {
        const result = await callAnchorAPI('/v1/system/paths', {
          method: 'DELETE',
          body: JSON.stringify(args),
        });
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      case 'anchor_list_paths': {
        const result = await callAnchorAPI('/v1/system/paths');
        resultText = JSON.stringify(result, null, 2);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Wrap response with ingestion progress banner if active
    const wrappedText = await wrapResponseWithStatus(resultText);
    return {
      content: [{ type: 'text', text: wrappedText }],
    };
  } catch (error: any) {
    // Also wrap error responses with ingestion status
    const errorText = `Error executing ${name}: ${error.message}`;
    const wrappedError = await wrapResponseWithStatus(errorText);
    return {
      content: [{ type: 'text', text: wrappedError }],
      isError: true,
    };
  }
});

// Start MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Anchor Engine MCP server running on stdio');
}

main().catch(error => {
  console.error('Fatal error running MCP server:', error);
  process.exit(1);
});

export { server };
