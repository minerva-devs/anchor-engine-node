#!/usr/bin/env node
/**
 * Anchor Engine MCP Server
 *
 * Exposes Anchor's search, distill, and exploration capabilities
 * to any MCP-compatible client (Claude, Cursor, Qwen Code, etc.)
 *
 * Tools:
 * - anchor_query: Semantic search over the memory graph
 * - anchor_distill: Run radial distillation on corpus
 * - anchor_illuminate: BFS graph traversal
 * - anchor_read_file: Read files with line ranges (token-efficient)
 * - anchor_list_compounds: List available compounds
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type {
  Tool,
  Resource } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get MCP server directory
// dist/ is at mcp-server/dist/, so we need to go up 2 levels to reach project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');

// Try to load settings from user_settings.json (unity of abstraction)
let settingsApiKey = '';
let settingsApiUrl = 'http://localhost:3160'; // Default port, will be overridden by user_settings.json
let settingsMcpConfig: Partial<MCPSecuritySettings> = {};

try {
  // Try project root first
  const settingsPath = join(projectRoot, 'user_settings.json');
  if (existsSync(settingsPath)) {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    settingsApiKey = settings.server?.api_key || '';
    settingsApiUrl = `http://localhost:${settings.server?.port || 3160}`;
    
    // Load MCP-specific settings if present
    if (settings.mcp) {
      settingsMcpConfig = {
        enabled: settings.mcp.enabled ?? false,
        rate_limit_requests_per_minute: settings.mcp.rate_limit_requests_per_minute ?? 60,
        max_query_results: settings.mcp.max_query_results ?? 50,
        allowed_operations: settings.mcp.allowed_operations ?? ['query', 'read_file', 'get_stats'],
        blocked_operations: settings.mcp.blocked_operations ?? [],
        allow_write_operations: settings.mcp.allowed_operations?.includes('ingest') ?? false,
        default_bucket_for_writes: 'external-inbox',
      };
    }
    
    console.error('✅ MCP: Loaded settings from user_settings.json');
    console.error(`   Engine URL: ${settingsApiUrl}`);
    console.error(`   API Key: ${settingsApiKey ? 'set (' + settingsApiKey.substring(0, 8) + '...)' : 'not set'}`);
  }
} catch (error) {
  console.error('⚠️  MCP: Could not load user_settings.json, using defaults');
}

// Anchor Engine API base URL
// Environment variables override settings (for backward compatibility)
const ANCHOR_API_URL = process.env.ANCHOR_API_URL || settingsApiUrl;

// Anchor API Key (optional, for servers that require auth)
// Environment variables override settings (for backward compatibility)
const ANCHOR_API_KEY = process.env.ANCHOR_API_KEY || settingsApiKey;

// Security settings
interface MCPSecuritySettings {
  enabled: boolean;
  require_api_key: boolean;
  api_key: string;
  rate_limit_requests_per_minute: number;
  max_query_results: number;
  restrict_to_localhost: boolean;
  allowed_operations: string[];
  blocked_operations: string[];
  allow_write_operations: boolean;  // NEW: Toggle for ingest operations
  default_bucket_for_writes: string;  // NEW: Default bucket (inbox or external-inbox)
}

let securitySettings: MCPSecuritySettings = {
  enabled: false,
  require_api_key: true,
  api_key: '',
  rate_limit_requests_per_minute: 60,
  max_query_results: 50,
  restrict_to_localhost: true,
  allowed_operations: ['query', 'read_file', 'get_stats'],
  blocked_operations: [],
  allow_write_operations: false,  // Disabled by default for safety
  default_bucket_for_writes: 'external-inbox',  // Safer default
  ...settingsMcpConfig,  // Apply settings from user_settings.json
};

// Rate limiting
const requestCounts = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const counts = requestCounts.get(clientId) || [];
  
  // Remove old entries
  const recent = counts.filter(t => now - t < windowMs);
  requestCounts.set(clientId, recent);
  
  return recent.length >= securitySettings.rate_limit_requests_per_minute;
}

function recordRequest(clientId: string): void {
  const counts = requestCounts.get(clientId) || [];
  counts.push(Date.now());
  requestCounts.set(clientId, counts);
}

/**
 * Security validation helpers for MCP write operations
 */

// Maximum content size for ingestion (100KB)
const MAX_CONTENT_SIZE = 100_000;

// Maximum filename length
const MAX_FILENAME_LENGTH = 255;

// Dangerous patterns to block
const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /process\s*\.\s*env/i,
  /require\s*\(/i,
  /document\s*\./i,
  /window\s*\./i,
  /setTimeout\s*\(\s*[^,)]*[,)]/i,
  /setInterval\s*\(\s*[^,)]*[,)]/i,
  /Function\s*\(/i,
  /\beval\b/i,
];

/**
 * Validate filename for security
 */
function isValidFilename(filename: string): boolean {
  // Check length
  if (filename.length === 0 || filename.length > MAX_FILENAME_LENGTH) {
    return false;
  }

  // Check for path traversal
  if (filename.includes('..') || filename.includes('//')) {
    return false;
  }

  // Check for absolute paths in filename (should be just basename)
  if (filename.startsWith('/') || filename.startsWith('\\')) {
    return false;
  }

  // Check for dangerous characters
  const dangerousChars = ['\0', '\n', '\r', '<', '>', '|', '"', "'", '`'];
  for (const char of dangerousChars) {
    if (filename.includes(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate content for security
 */
function isValidContent(content: string): { valid: boolean; error?: string } {
  // Check size
  if (content.length > MAX_CONTENT_SIZE) {
    return { valid: false, error: `Content too large (max ${MAX_CONTENT_SIZE.toLocaleString()} characters)` };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      return { valid: false, error: 'Content contains potentially dangerous patterns' };
    }
  }

  return { valid: true };
}

/**
 * Validate bucket for security
 */
function isValidBucket(bucket: string): boolean {
  const allowedBuckets = ['inbox', 'external-inbox', 'code', 'docs', 'notes'];
  return allowedBuckets.includes(bucket);
}

function isOperationAllowed(operation: string): boolean {
  if (securitySettings.blocked_operations.includes(operation)) {
    return false;
  }
  if (securitySettings.allowed_operations.length === 0) {
    return true;
  }
  return securitySettings.allowed_operations.includes(operation);
}

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'anchor_query',
    description: 'Search the Anchor memory graph using semantic/graph search. Returns relevant atoms/molecules with content, source, and relevance scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
        },
        buckets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional bucket filters',
        },
        strategy: {
          type: 'string',
          enum: ['standard', 'max-recall'],
          description: 'Search strategy (default: standard)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'anchor_distill',
    description: 'Run radial distillation on the corpus. Compresses knowledge into a deduplicated output. Supports semantic aggregation tuning.',
    inputSchema: {
      type: 'object',
      properties: {
        seed: {
          type: 'string',
          description: 'Seed query for radial distillation (optional, uses global if empty)',
        },
        radius: {
          type: 'number',
          description: 'Search radius in graph hops (default: 3)',
        },
        max_nodes: {
          type: 'number',
          description: 'Maximum nodes to process (default: 500)',
        },
        output_format: {
          type: 'string',
          enum: ['yaml', 'json', 'decision-records', 'json-full', 'nested-yaml'],
          description: 'Output format (default: json)',
        },
        similarity_threshold: {
          type: 'number',
          description: 'Semantic aggregation similarity (0.50-0.95). Higher=conservative, lower=aggressive (default: 0.85)',
        },
        dry_run: {
          type: 'boolean',
          description: 'Preview without writing output files (default: false)',
        },
      },
    },
  },
  {
    name: 'anchor_illuminate',
    description: 'Perform BFS graph traversal (illuminate) from a seed query. Explores connected concepts in the knowledge graph.',
    inputSchema: {
      type: 'object',
      properties: {
        seed: {
          type: 'string',
          description: 'Seed query or topic to explore',
        },
        depth: {
          type: 'number',
          description: 'Maximum traversal depth (default: 3)',
        },
        max_nodes: {
          type: 'number',
          description: 'Maximum nodes to explore (default: 50)',
        },
      },
      required: ['seed'],
    },
  },
  {
    name: 'anchor_read_file',
    description: 'Read a file (e.g., distilled output) with optional line range. Use this for token-efficient recursive search of large files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to read (relative to project root or absolute)',
        },
        start_line: {
          type: 'number',
          description: 'Starting line number (0-indexed, inclusive)',
        },
        end_line: {
          type: 'number',
          description: 'Ending line number (exclusive)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'anchor_list_compounds',
    description: 'List available compounds (source files) in the Anchor database with metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter string for compound names',
        },
        limit: {
          type: 'number',
          description: 'Maximum compounds to return (default: 50)',
        },
      },
    },
  },
  {
    name: 'anchor_get_stats',
    description: 'Get Anchor Engine statistics including atom/molecule counts, database size, and system health.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_ingest_text',
    description: "Ingest raw text content into Anchor Engine memory. Content is atomized deterministically (no LLM processing). Defaults to external-inbox for safety. Use 'inbox' only for content you created yourself (notes, thoughts, code).",
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Raw text content to ingest',
        },
        filename: {
          type: 'string',
          description: "Filename (e.g., 'meeting-notes-2026-03-18.md')",
        },
        bucket: {
          type: 'string',
          enum: ['inbox', 'external-inbox'],
          default: 'external-inbox',
          description: 'inbox=sovereign data (you created), external-inbox=external data (scraped/imported). Defaults to external-inbox for safety.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags (auto-extracted if not provided)',
        },
      },
      required: ['content', 'filename'],
    },
  },
  {
    name: 'anchor_ingest_file',
    description: "Ingest a file from filesystem into Anchor Engine. Content is atomized deterministically. Defaults to external-inbox for safety. Use 'inbox' only for files you created yourself.",
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to file',
        },
        bucket: {
          type: 'string',
          enum: ['inbox', 'external-inbox'],
          default: 'external-inbox',
          description: 'inbox=sovereign data, external-inbox=external data. Defaults to external-inbox.',
        },
        delete_original: {
          type: 'boolean',
          default: false,
          description: 'Delete original file after ingestion',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'anchor_github_ingest',
    description: 'Ingest a GitHub repository into Anchor Engine. Downloads source files and optionally runs code analysis (ESLint, unused exports, duplicates) and/or includes full commit history.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: "GitHub repository URL (e.g., 'https://github.com/user/repo')",
        },
        branch: {
          type: 'string',
          default: 'main',
          description: 'Branch to ingest (default: main)',
        },
        bucket: {
          type: 'string',
          default: 'code',
          description: 'Bucket for ingested content (default: code)',
        },
        run_analysis: {
          type: 'boolean',
          default: false,
          description: 'Run code analysis (ESLint, unused exports, duplicates)',
        },
        include_history: {
          type: 'boolean',
          default: true,
          description: 'Include full commit history (search code changes over time)',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'anchor_watchdog_start',
    description: 'Start the automatic file watcher service. Monitors directories for new files and ingests them automatically into the knowledge graph.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_watchdog_stop',
    description: 'Stop the automatic file watcher service.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_watchdog_status',
    description: 'Get the current status of the watchdog service (active/inactive) and ingestion progress.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'anchor_watchdog_ingest',
    description: 'Trigger a manual ingestion run. Processes all pending files in the watch directories immediately.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Resource definitions
const RESOURCES: Resource[] = [
  {
    uri: 'anchor://stats',
    name: 'Anchor Statistics',
    description: 'Real-time statistics about the Anchor knowledge graph',
    mimeType: 'application/json',
  },
  {
    uri: 'anchor://compounds',
    name: 'Available Compounds',
    description: 'List of all compounds (source files) in the database',
    mimeType: 'application/json',
  },
];

// Helper function for API calls
async function callAnchorAPI(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `${ANCHOR_API_URL}${endpoint}`;
  console.error(`[MCP] Calling: ${method} ${url}`);

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add API key if configured
  if (ANCHOR_API_KEY) {
    (options.headers as Record<string, string>).Authorization = `Bearer ${ANCHOR_API_KEY}`;
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anchor API error (${response.status}): ${error}`);
    }

    // Handle streaming responses (SSE)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      const text = await response.text();
      // Parse SSE events
      const events = text
        .split('\n\n')
        .filter(e => e.trim())
        .map(event => {
          const dataMatch = event.match(/data: (.+)/);
          return dataMatch ? JSON.parse(dataMatch[1]) : null;
        })
        .filter(Boolean);
      return events;
    }

    return response.json();
  } catch (error: any) {
    console.error(`[MCP] Fetch failed for ${url}: ${error.message}`);
    console.error(`[MCP] ANCHOR_API_URL=${ANCHOR_API_URL}`);
    throw error;
  }
}

// Tool handlers
async function handleQuery(args: any): Promise<string> {
  const { query, max_results = 20, buckets = [], strategy = 'standard' } = args;

  const results = await callAnchorAPI('/v1/memory/search', 'POST', {
    query,
    max_chars: max_results * 500,
    token_budget: max_results * 125,
    buckets,
    strategy,
    provenance: 'all',
  });

  // Handle streaming results
  if (Array.isArray(results)) {
    const batches = results.filter((e: any) => e.type === 'batch');
    const allResults = batches.flatMap((b: any) => b.results || []);

    if (allResults.length === 0) {
      return 'No results found for query.';
    }

    return allResults
      .map(
        (r: any, i: number) =>
          `[${i + 1}] Score: ${(r.score || 0).toFixed(3)} | Source: ${r.source || 'unknown'}\n${r.content?.substring(0, 500) || '[no content]'}${r.content?.length > 500 ? '...' : ''}`,
      )
      .join('\n\n---\n\n');
  }

  return 'Search completed but returned unexpected format.';
}

async function handleDistill(args: any): Promise<string> {
  const { seed = '', radius = 3, max_nodes = 500, output_format = 'json', similarity_threshold, dry_run } = args;

  const result = await callAnchorAPI('/v1/memory/distill', 'POST', {
    seed: seed ? { query: seed } : { global: true },
    radius,
    max_nodes,
    output_format,
    mode: 'tag-based',
    similarity_threshold,
    dry_run: dry_run || false,
  });

  if (result.status === 'success' || result.output) {
    const stats = result.stats || {};
    const aggInfo = result.aggregation_reduction ? ` | Aggregation: -${result.aggregation_reduction}` : '';
    return `✅ Distillation Complete

📊 Stats:
- Compression Ratio: ${stats.compression_ratio || 'N/A'}
- Records: ${stats.decision_records || 0} (from ${stats.blocks_total || 0} blocks)
- Duration: ${((stats.duration_ms || 0) / 1000).toFixed(1)}s${aggInfo}
${similarity_threshold !== undefined ? `- Similarity Threshold: ${(similarity_threshold * 100).toFixed(0)}%` : ''}
${dry_run ? '- ⚠️ DRY RUN — no files written' : ''}

📁 Output File: ${result.output?.path || 'N/A'}

💡 Use anchor_read_file to read this file efficiently.`;
  }

  return `Distillation result: ${JSON.stringify(result, null, 2)}`;
}

async function handleIlluminate(args: any): Promise<string> {
  const { seed, depth = 3, max_nodes = 50 } = args;

  const result = await callAnchorAPI('/v1/memory/explore', 'POST', {
    seed: { query: seed, limit_seeds: 8 },
    max_depth: depth,
    max_nodes,
    format: 'flat',
  });

  const nodes = result.results || result.nodes || [];

  if (nodes.length === 0) {
    return 'No connected nodes found from seed.';
  }

  return nodes
    .map(
      (n: any, i: number) =>
        `[${i + 1}] ${n.id}\nSource: ${n.source || 'unknown'}\n${n.content?.substring(0, 400) || '[no content]'}${n.content?.length > 400 ? '...' : ''}`,
    )
    .join('\n\n---\n\n');
}

async function handleReadFile(args: any): Promise<string> {
  const { path: filePath, start_line, end_line, max_chars = 10000 } = args;

  // Resolve file path relative to project root
  const fs = await import('fs');
  const path = await import('path');
  
  // Try to read from project root first
  let absolutePath = path.resolve(projectRoot, filePath);
  
  // If file doesn't exist, try absolute path
  if (!fs.existsSync(absolutePath)) {
    absolutePath = path.resolve(filePath);
  }
  
  // If still not found, try common locations
  if (!fs.existsSync(absolutePath)) {
    const commonLocations = [
      path.resolve(projectRoot, 'local-data', 'inbox', filePath),
      path.resolve(projectRoot, 'local-data', 'distilled', filePath),
      path.resolve(projectRoot, 'mirrored_brain', filePath),
    ];
    
    for (const loc of commonLocations) {
      if (fs.existsSync(loc)) {
        absolutePath = loc;
        break;
      }
    }
  }
  
  if (!fs.existsSync(absolutePath)) {
    return `Error: File not found: ${filePath}`;
  }
  
  // Security: Verify path is within project root
  const relativePath = path.relative(projectRoot, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return 'Error: Access denied: file outside project directory';
  }
  
  try {
    const content = fs.readFileSync(absolutePath, 'utf8');
    let lines = content.split('\n');
    
    // Apply line range if specified
    if (start_line !== undefined || end_line !== undefined) {
      const start = start_line !== undefined ? Math.max(0, start_line) : 0;
      const end = end_line !== undefined ? Math.min(lines.length, end_line) : lines.length;
      lines = lines.slice(start, end);
    }
    
    let resultContent = lines.join('\n');
    
    // Apply character limit
    if (resultContent.length > max_chars) {
      resultContent = resultContent.substring(0, max_chars) + '\n\n[Content truncated...]';
    }
    
    const lineInfo = (start_line !== undefined || end_line !== undefined)
      ? ` (lines ${start_line ?? 0}-${end_line ?? lines.length})`
      : '';
    
    return `📄 File: ${filePath}${lineInfo}\n${'='.repeat(40)}\n\n${resultContent}`;
  } catch (error: any) {
    return `Error reading file ${filePath}: ${error.message}`;
  }
}

async function handleListCompounds(args: any): Promise<string> {
  const { filter = '', limit = 50 } = args;

  const result = await callAnchorAPI('/v1/compounds/list', 'GET');
  let compounds = result.compounds || [];

  if (filter) {
    compounds = compounds.filter((c: any) =>
      c.name?.toLowerCase().includes(filter.toLowerCase()),
    );
  }

  compounds = compounds.slice(0, limit);

  if (compounds.length === 0) {
    return 'No compounds found.';
  }

  return compounds
    .map(
      (c: any) =>
        `- ${c.name} (${c.molecule_count || 0} molecules, ${c.atom_count || 0} atoms)`,
    )
    .join('\n');
}

async function handleGetStats(args: any): Promise<string> {
  const result = await callAnchorAPI('/v1/stats', 'GET');

  return `📊 Anchor Engine Statistics

🧠 Knowledge Graph:
- Atoms: ${result.atoms?.toLocaleString() || 0}
- Molecules: ${result.molecules?.toLocaleString() || 0}
- Compounds: ${result.compounds?.toLocaleString() || 0}

💾 Storage:
- Database Size: ${result.dbSize || 'N/A'}
- Index Size: ${result.indexSize || 'N/A'}

⚡ System:
- Status: ${result.status || 'unknown'}
- Uptime: ${result.uptime || 'N/A'}
`;
}

async function handleIngestText(args: any): Promise<string> {
  // Security check: Write operations must be enabled
  if (!securitySettings.allow_write_operations) {
    return `❌ Write operations are disabled.

To enable text ingestion, add this to your user_settings.json:

{
  "mcp": {
    "allow_write_operations": true,
    "default_bucket_for_writes": "external-inbox"
  }
}

⚠️ Only enable write operations if you trust the AI agent.
📝 Default bucket is 'external-inbox' for safety (untrusted data).
   Use 'inbox' only for content you created yourself.`;
  }

  const { content, filename, bucket = securitySettings.default_bucket_for_writes, tags = [] } = args;

  // === SECURITY VALIDATION ===

  // 1. Validate filename
  if (!isValidFilename(filename)) {
    return `❌ Invalid filename: ${filename}

Security checks failed:
- Filename must not be empty or exceed ${MAX_FILENAME_LENGTH} characters
- Filename must not contain path traversal (..) or absolute paths
- Filename must not contain dangerous characters`;
  }

  // 2. Validate content
  const contentValidation = isValidContent(content);
  if (!contentValidation.valid) {
    return `❌ Content validation failed: ${contentValidation.error}`;
  }

  // 3. Validate bucket
  if (!isValidBucket(bucket)) {
    return `❌ Invalid bucket: ${bucket}

Allowed buckets: inbox, external-inbox, code, docs, notes`;
  }

  // 4. Rate limiting check
  const clientId = args.clientId || 'mcp-client';
  if (isRateLimited(clientId)) {
    return '❌ Rate limit exceeded. Please wait before making another request.';
  }

  try {
    const result = await callAnchorAPI('/v1/research/upload-raw', 'POST', {
      content,
      filename,
      bucket,
      tags,
    });

    const bucketEmoji = bucket === 'inbox' ? '👑' : '🌐';
    const bucketNote = bucket === 'inbox' 
      ? 'Sovereign data (3.0x retrieval boost)' 
      : 'External data (1.0x boost)';

    return `✅ Text ingested successfully!

${bucketEmoji} Bucket: ${bucket} - ${bucketNote}
📄 Filename: ${filename}
📊 Size: ${content.length.toLocaleString()} characters
🏷️ Tags: ${tags.length > 0 ? tags.join(', ') : '(auto-extracted)' }

💡 Content will be atomized deterministically (no LLM processing).
   Use anchor_query to search for this content after ingestion.`;
  } catch (error: any) {
    return `❌ Ingestion failed: ${error.message}`;
  }
}

async function handleIngestFile(args: any): Promise<string> {
  // Security check: Write operations must be enabled
  if (!securitySettings.allow_write_operations) {
    return `❌ Write operations are disabled.

To enable file ingestion, add this to your user_settings.json:

{
  "mcp": {
    "allow_write_operations": true,
    "default_bucket_for_writes": "external-inbox"
  }
}

⚠️ Only enable write operations if you trust the AI agent.
📁 Default bucket is 'external-inbox' for safety (untrusted data).
   Use 'inbox' only for files you created yourself.`;
  }

  const { path: filePath, bucket = securitySettings.default_bucket_for_writes, delete_original = false } = args;

  // === SECURITY VALIDATION ===

  // 1. Validate bucket
  if (!isValidBucket(bucket)) {
    return `❌ Invalid bucket: ${bucket}

Allowed buckets: inbox, external-inbox, code, docs, notes`;
  }

  // 2. Rate limiting check
  const clientId = args.clientId || 'mcp-client';
  if (isRateLimited(clientId)) {
    return '❌ Rate limit exceeded. Please wait before making another request.';
  }

  try {
    // First, read the file
    const fileResult = await callAnchorAPI(`/v1/files/read?path=${encodeURIComponent(filePath)}`, 'GET');

    if (!fileResult.content) {
      return `❌ Could not read file: ${filePath}`;
    }

    const filename = filePath.split('/').pop() || filePath;
    const { content } = fileResult;

    // 3. Validate content size (for large files)
    const contentValidation = isValidContent(content);
    if (!contentValidation.valid) {
      return `❌ File too large: ${contentValidation.error}

To ingest larger files, use the web UI or API directly.`;
    }

    // Then ingest it
    const ingestResult = await callAnchorAPI('/v1/research/upload-raw', 'POST', {
      content,
      filename,
      bucket,
      tags: [],
    });

    const bucketEmoji = bucket === 'inbox' ? '👑' : '🌐';
    const bucketNote = bucket === 'inbox' 
      ? 'Sovereign data (3.0x retrieval boost)' 
      : 'External data (1.0x boost)';

    let deleteNote = '';
    if (delete_original) {
      deleteNote = '\n🗑️ Original file will be deleted (not implemented yet - manual deletion required)';
    }

    return `✅ File ingested successfully!

${bucketEmoji} Bucket: ${bucket} - ${bucketNote}
📄 Filename: ${filename}
📊 Size: ${content.length.toLocaleString()} characters
📁 Source: ${filePath}

💡 Content will be atomized deterministically (no LLM processing).
   Use anchor_query to search for this content after ingestion.${deleteNote}`;
  } catch (error: any) {
    return `❌ File ingestion failed: ${error.message}`;
  }
}

async function handleGithubIngest(args: any): Promise<string> {
  const { 
    url, 
    branch = 'main', 
    bucket = 'code', 
    run_analysis = false, 
    include_history = true, 
  } = args;

  if (!url) {
    return '❌ GitHub URL is required.';
  }

  // Parse URL to get owner/repo for display
  let ownerRepo = url;
  try {
    const parsed = new URL(url);
    ownerRepo = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '');
  } catch {
    // Use as-is if parsing fails
  }

  try {
    const result = await callAnchorAPI('/v1/github/repos', 'POST', {
      url,
      branch,
      bucket,
      run_analysis,
      include_history,
    });

    const features: string[] = [];
    if (include_history) features.push('📝 commit history');
    if (run_analysis) features.push('🔍 code analysis');

    return `✅ GitHub ingestion started!

📦 Repository: ${ownerRepo}
🌿 Branch: ${branch}
🪣 Bucket: ${bucket}

${features.length > 0 ? `Features enabled:\n${features.map(f => `  ${f}`).join('\n')}` : 'No additional features enabled.'}

⏳ Ingestion runs in the background. Use anchor_query to search for content after a few moments.

💡 Tips:
  - Use anchor_get_stats to check ingestion progress
  - Search with: anchor_query({ query: "topic in ${ownerRepo}" })
  - Analysis results tagged with #analysis`;
  } catch (error: any) {
    return `❌ GitHub ingestion failed: ${error.message}`;
  }
}

// Watchdog handler functions
async function handleWatchdogStart(args: any): Promise<string> {
  try {
    const result = await callAnchorAPI('/v1/watchdog/start', 'POST');
    return `✅ Watchdog service started

👀 The file watcher is now monitoring directories for new files.
📁 New files will be automatically ingested into the knowledge graph.
⏱️  Synonym generation will run 10 seconds after ingestion completes.

To check status, use: anchor_watchdog_status`;
  } catch (error: any) {
    return `❌ Failed to start watchdog: ${error.message}`;
  }
}

async function handleWatchdogStop(args: any): Promise<string> {
  try {
    const result = await callAnchorAPI('/v1/watchdog/stop', 'POST');
    return `⏹️  Watchdog service stopped

The file watcher is no longer monitoring directories.
Files added to watched directories will not be automatically ingested.

To restart, use: anchor_watchdog_start`;
  } catch (error: any) {
    return `❌ Failed to stop watchdog: ${error.message}`;
  }
}

async function handleWatchdogStatus(args: any): Promise<string> {
  try {
    const result = await callAnchorAPI('/v1/ingest/status', 'GET');

    const statusEmoji = result.active ? '🟢' : '🔴';
    const statusText = result.active ? 'Active' : 'Inactive';
    const stateText = result.state || 'idle';

    let progressText = '';
    if (result.progress && result.progress.current && result.progress.total) {
      const percent = Math.round((result.progress.current / result.progress.total) * 100);
      progressText = `
📊 Progress: ${result.progress.current}/${result.progress.total} files (${percent}%)`;
    }

    let lastCompletedText = '';
    if (result.lastCompleted) {
      lastCompletedText = `
⏰ Last completed: ${new Date(result.lastCompleted).toLocaleString()}`;
    }

    return `${statusEmoji} Watchdog Status

📌 Status: ${statusText}
🔄 State: ${stateText}
📁 Current file: ${result.currentFile || 'None'}${progressText}${lastCompletedText}
📦 Queue depth: ${result.queueDepth || 0}
✅ Atoms created: ${result.atomsCreated || 0}`;
  } catch (error: any) {
    return `❌ Failed to get watchdog status: ${error.message}`;
  }
}

async function handleWatchdogIngest(args: any): Promise<string> {
  try {
    const result = await callAnchorAPI('/v1/watchdog/ingest', 'POST');

    let resultText = `✅ Manual ingestion triggered

📊 Results:
• Files processed: ${result.files_processed || 0}
• Atoms created: ${result.atoms_created || 0}
• Duration: ${result.duration_ms ? (result.duration_ms / 1000).toFixed(1) + 's' : 'N/A'}`;

    if (result.skipped && result.skipped > 0) {
      resultText += `
• Skipped (unchanged): ${result.skipped}`;
    }

    if (result.errors && result.errors.length > 0) {
      resultText += `
❌ Errors: ${result.errors.length}`;
    }

    return resultText;
  } catch (error: any) {
    return `❌ Failed to trigger ingestion: ${error.message}`;
  }
}

// Resource handlers
async function handleResourceStats(): Promise<string> {
  const result = await callAnchorAPI('/v1/stats', 'GET');
  return JSON.stringify(result, null, 2);
}

async function handleResourceCompounds(): Promise<string> {
  const result = await callAnchorAPI('/v1/compounds/list', 'GET');
  return JSON.stringify(result.compounds || [], null, 2);
}

// Main server setup
const server = new Server(
  {
    name: 'anchor-engine-mcp',
    version: '4.9.5',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  // Security check: MCP must be enabled
  if (!securitySettings.enabled) {
    return {
      content: [
        {
          type: 'text',
          text: '🔒 MCP server is disabled. Enable it in user_settings.json (mcp.enabled: true) to use this feature.',
        },
      ],
      isError: true,
    };
  }

  // Security check: Rate limiting
  const clientId = 'stdio-client'; // In stdio mode, we have one client
  if (isRateLimited(clientId)) {
    return {
      content: [
        {
          type: 'text',
          text: '⏱️ Rate limit exceeded. Please wait before making more requests.',
        },
      ],
      isError: true,
    };
  }
  recordRequest(clientId);

  // Security check: Operation allowed
  const operationMap: Record<string, string> = {
    'anchor_query': 'query',
    'anchor_distill': 'distill',
    'anchor_illuminate': 'illuminate',
    'anchor_read_file': 'read_file',
    'anchor_list_compounds': 'list',
    'anchor_get_stats': 'get_stats',
    'anchor_ingest_text': 'ingest_text',
    'anchor_ingest_file': 'ingest_file',
    'anchor_github_ingest': 'github_ingest',
    'anchor_watchdog_start': 'watchdog',
    'anchor_watchdog_stop': 'watchdog',
    'anchor_watchdog_status': 'watchdog',
    'anchor_watchdog_ingest': 'watchdog',
  };
  
  const operation = operationMap[name] || name;
  if (!isOperationAllowed(operation)) {
    return {
      content: [
        {
          type: 'text',
          text: `🚫 Operation '${name}' is not allowed. Check mcp.allowed_operations in settings.`,
        },
      ],
      isError: true,
    };
  }

  // Security check: Max results limit
  if (args && typeof args === 'object' && 'max_results' in args) {
    const requestedMax = Number(args.max_results) || 20;
    if (requestedMax > securitySettings.max_query_results) {
      args.max_results = securitySettings.max_query_results;
    }
  }

  try {
    let result: string;

    switch (name) {
      case 'anchor_query':
        result = await handleQuery(args);
        break;
      case 'anchor_distill':
        result = await handleDistill(args);
        break;
      case 'anchor_illuminate':
        result = await handleIlluminate(args);
        break;
      case 'anchor_read_file':
        result = await handleReadFile(args);
        break;
      case 'anchor_list_compounds':
        result = await handleListCompounds(args);
        break;
      case 'anchor_get_stats':
        result = await handleGetStats(args);
        break;
      case 'anchor_ingest_text':
        result = await handleIngestText(args);
        break;
      case 'anchor_ingest_file':
        result = await handleIngestFile(args);
        break;
      case 'anchor_github_ingest':
        result = await handleGithubIngest(args);
        break;
      case 'anchor_watchdog_start':
        result = await handleWatchdogStart(args);
        break;
      case 'anchor_watchdog_stop':
        result = await handleWatchdogStop(args);
        break;
      case 'anchor_watchdog_status':
        result = await handleWatchdogStatus(args);
        break;
      case 'anchor_watchdog_ingest':
        result = await handleWatchdogIngest(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Handle resource requests
server.setRequestHandler(ReadResourceRequestSchema, async request => {
  const { uri } = request.params;

  try {
    let content: string;

    switch (uri) {
      case 'anchor://stats':
        content = await handleResourceStats();
        break;
      case 'anchor://compounds':
        content = await handleResourceCompounds();
        break;
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: content,
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Resource error: ${error.message}`);
  }
});

// Load security settings from Anchor
async function loadSecuritySettings(): Promise<void> {
  try {
    const settings = await callAnchorAPI('/v1/settings', 'GET');
    if (settings.settings?.mcp) {
      securitySettings = {
        ...securitySettings,
        ...settings.settings.mcp,
      };
      console.error(`🔒 MCP Security: ${securitySettings.enabled ? 'ENABLED' : 'DISABLED'}`);
      if (securitySettings.enabled) {
        console.error(`   - Rate limit: ${securitySettings.rate_limit_requests_per_minute}/min`);
        console.error(`   - Max results: ${securitySettings.max_query_results}`);
        console.error(`   - Allowed ops: ${securitySettings.allowed_operations.join(', ')}`);
      }
    } else {
      console.error('⚠️ No MCP settings found in Anchor config. Using settings from user_settings.json.');
    }
  } catch (error: any) {
    console.error(`⚠️ Failed to load security settings from engine: ${error.message}`);
    console.error('   Using settings from user_settings.json (already loaded at startup).');
    // Don't disable - keep the settings loaded from user_settings.json at startup
  }
}

// Start server
async function main() {
  // Load security settings first
  await loadSecuritySettings();

  // Show configuration summary
  console.error('');
  console.error('🔌 MCP Server Configuration:');
  console.error(`   Engine URL: ${ANCHOR_API_URL}`);
  console.error(`   API Key: ${ANCHOR_API_KEY ? 'set (' + ANCHOR_API_KEY.substring(0, 8) + '...)' : 'not set'}`);
  console.error(`   Source: ${process.env.ANCHOR_API_KEY ? 'environment variables' : 'user_settings.json'}`);
  console.error(`   MCP Enabled: ${securitySettings.enabled ? '✅' : '❌'}`);
  console.error('');

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Anchor Engine MCP Server running on stdio');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
