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
  }
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
];

// Handle tool list request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'anchor_start': {
        const result = await callAnchorAPI('/v1/system/start', {
          method: 'POST',
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_stop': {
        const result = await callAnchorAPI('/v1/system/stop', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_status': {
        const result = await callAnchorAPI('/v1/system/status');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_health': {
        const result = await callAnchorAPI('/health');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
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

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_ingest_status': {
        const result = await callAnchorAPI('/v1/system/ingest-status');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_wait_for_ingest': {
        const result = await callAnchorAPI('/v1/system/wait-for-ingest', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_set_ingestion_config': {
        const result = await callAnchorAPI('/v1/config/ingestion', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_get_ingestion_config': {
        const result = await callAnchorAPI('/v1/config/ingestion');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_search': {
        const result = await callAnchorAPI('/v1/search', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_distill': {
        const result = await callAnchorAPI('/v1/distill', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_illuminate': {
        const result = await callAnchorAPI('/v1/illuminate', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'anchor_set_path': {
        const result = await callAnchorAPI('/v1/system/paths', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
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

main().catch((error) => {
  console.error('Fatal error running MCP server:', error);
  process.exit(1);
});

export { server };
