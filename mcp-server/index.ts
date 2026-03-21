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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Anchor Engine API base URL
const ANCHOR_API_URL = process.env.ANCHOR_API_URL || "http://localhost:3160";

// Anchor API Key (optional, for servers that require auth)
const ANCHOR_API_KEY = process.env.ANCHOR_API_KEY || "";

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
  api_key: "",
  rate_limit_requests_per_minute: 60,
  max_query_results: 50,
  restrict_to_localhost: true,
  allowed_operations: ["query", "read_file", "get_stats"],
  blocked_operations: [],
  allow_write_operations: false,  // Disabled by default for safety
  default_bucket_for_writes: "external-inbox"  // Safer default
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
    name: "anchor_query",
    description: "Search the Anchor memory graph using semantic/graph search. Returns relevant atoms/molecules with content, source, and relevance scores.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query string",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return (default: 20)",
        },
        buckets: {
          type: "array",
          items: { type: "string" },
          description: "Optional bucket filters",
        },
        strategy: {
          type: "string",
          enum: ["standard", "max-recall"],
          description: "Search strategy (default: standard)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "anchor_distill",
    description: "Run radial distillation on the corpus. Compresses knowledge into a deduplicated YAML/MD file that serves as a source of truth. Returns the output file path and compression stats.",
    inputSchema: {
      type: "object",
      properties: {
        seed: {
          type: "string",
          description: "Seed query for radial distillation (optional, uses global if empty)",
        },
        radius: {
          type: "number",
          description: "Search radius in graph hops (default: 3)",
        },
        max_nodes: {
          type: "number",
          description: "Maximum nodes to process (default: 500)",
        },
        output_format: {
          type: "string",
          enum: ["yaml", "md"],
          description: "Output format (default: yaml)",
        },
      },
    },
  },
  {
    name: "anchor_illuminate",
    description: "Perform BFS graph traversal (illuminate) from a seed query. Explores connected concepts in the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        seed: {
          type: "string",
          description: "Seed query or topic to explore",
        },
        depth: {
          type: "number",
          description: "Maximum traversal depth (default: 3)",
        },
        max_nodes: {
          type: "number",
          description: "Maximum nodes to explore (default: 50)",
        },
      },
      required: ["seed"],
    },
  },
  {
    name: "anchor_read_file",
    description: "Read a file (e.g., distilled output) with optional line range. Use this for token-efficient recursive search of large files.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path to read (relative to project root or absolute)",
        },
        start_line: {
          type: "number",
          description: "Starting line number (0-indexed, inclusive)",
        },
        end_line: {
          type: "number",
          description: "Ending line number (exclusive)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "anchor_list_compounds",
    description: "List available compounds (source files) in the Anchor database with metadata.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Optional filter string for compound names",
        },
        limit: {
          type: "number",
          description: "Maximum compounds to return (default: 50)",
        },
      },
    },
  },
  {
    name: "anchor_get_stats",
    description: "Get Anchor Engine statistics including atom/molecule counts, database size, and system health.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "anchor_ingest_text",
    description: "Ingest raw text content into Anchor Engine memory. Content is atomized deterministically (no LLM processing). Defaults to external-inbox for safety. Use 'inbox' only for content you created yourself (notes, thoughts, code).",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Raw text content to ingest",
        },
        filename: {
          type: "string",
          description: "Filename (e.g., 'meeting-notes-2026-03-18.md')",
        },
        bucket: {
          type: "string",
          enum: ["inbox", "external-inbox"],
          default: "external-inbox",
          description: "inbox=sovereign data (you created), external-inbox=external data (scraped/imported). Defaults to external-inbox for safety.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags (auto-extracted if not provided)",
        },
      },
      required: ["content", "filename"],
    },
  },
  {
    name: "anchor_ingest_file",
    description: "Ingest a file from filesystem into Anchor Engine. Content is atomized deterministically. Defaults to external-inbox for safety. Use 'inbox' only for files you created yourself.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute or relative path to file",
        },
        bucket: {
          type: "string",
          enum: ["inbox", "external-inbox"],
          default: "external-inbox",
          description: "inbox=sovereign data, external-inbox=external data. Defaults to external-inbox.",
        },
        delete_original: {
          type: "boolean",
          default: false,
          description: "Delete original file after ingestion",
        },
      },
      required: ["path"],
    },
  },
];

// Resource definitions
const RESOURCES: Resource[] = [
  {
    uri: "anchor://stats",
    name: "Anchor Statistics",
    description: "Real-time statistics about the Anchor knowledge graph",
    mimeType: "application/json",
  },
  {
    uri: "anchor://compounds",
    name: "Available Compounds",
    description: "List of all compounds (source files) in the database",
    mimeType: "application/json",
  },
];

// Helper function for API calls
async function callAnchorAPI(endpoint: string, method: string = "GET", body?: any): Promise<any> {
  const url = `${ANCHOR_API_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  // Add API key if configured
  if (ANCHOR_API_KEY) {
    (options.headers as Record<string, string>)["Authorization"] = `Bearer ${ANCHOR_API_KEY}`;
  }

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anchor API error (${response.status}): ${error}`);
  }

  // Handle streaming responses (SSE)
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("text/event-stream")) {
    const text = await response.text();
    // Parse SSE events
    const events = text
      .split("\n\n")
      .filter((e) => e.trim())
      .map((event) => {
        const dataMatch = event.match(/data: (.+)/);
        return dataMatch ? JSON.parse(dataMatch[1]) : null;
      })
      .filter(Boolean);
    return events;
  }

  return response.json();
}

// Tool handlers
async function handleQuery(args: any): Promise<string> {
  const { query, max_results = 20, buckets = [], strategy = "standard" } = args;

  const results = await callAnchorAPI("/v1/memory/search", "POST", {
    query,
    max_chars: max_results * 500,
    token_budget: max_results * 125,
    buckets,
    strategy,
    provenance: "all",
  });

  // Handle streaming results
  if (Array.isArray(results)) {
    const batches = results.filter((e: any) => e.type === "batch");
    const allResults = batches.flatMap((b: any) => b.results || []);

    if (allResults.length === 0) {
      return "No results found for query.";
    }

    return allResults
      .map(
        (r: any, i: number) =>
          `[${i + 1}] Score: ${(r.score || 0).toFixed(3)} | Source: ${r.source || "unknown"}\n${r.content?.substring(0, 500) || "[no content]"}${r.content?.length > 500 ? "..." : ""}`
      )
      .join("\n\n---\n\n");
  }

  return "Search completed but returned unexpected format.";
}

async function handleDistill(args: any): Promise<string> {
  const { seed = "", radius = 3, max_nodes = 500, output_format = "yaml" } = args;

  const result = await callAnchorAPI("/v1/memory/distill", "POST", {
    seed: seed ? { query: seed } : { global: true },
    radius,
    max_nodes,
    output_format,
  });

  if (result.status === "success" || result.output) {
    const stats = result.stats || {};
    return `✅ Distillation Complete

📊 Stats:
- Compression Ratio: ${stats.compression_ratio || "N/A"}
- Lines: ${stats.lines_unique || 0} unique / ${stats.lines_total || 0} total
- Duration: ${((stats.duration_ms || 0) / 1000).toFixed(1)}s

📁 Output File: ${result.output?.path || "N/A"}

💡 Use anchor_read_file to read this file efficiently.`;
  }

  return `Distillation result: ${JSON.stringify(result, null, 2)}`;
}

async function handleIlluminate(args: any): Promise<string> {
  const { seed, depth = 3, max_nodes = 50 } = args;

  const result = await callAnchorAPI("/v1/memory/explore", "POST", {
    seed: { query: seed, limit_seeds: 8 },
    max_depth: depth,
    max_nodes,
    format: "flat",
  });

  const nodes = result.results || result.nodes || [];

  if (nodes.length === 0) {
    return "No connected nodes found from seed.";
  }

  return nodes
    .map(
      (n: any, i: number) =>
        `[${i + 1}] ${n.id}\nSource: ${n.source || "unknown"}\n${n.content?.substring(0, 400) || "[no content]"}${n.content?.length > 400 ? "..." : ""}`
    )
    .join("\n\n---\n\n");
}

async function handleReadFile(args: any): Promise<string> {
  const { path: filePath, start_line, end_line } = args;

  // Normalize path
  const normalizedPath = filePath.startsWith("/")
    ? filePath
    : `${ANCHOR_API_URL}/v1/files/read?path=${encodeURIComponent(filePath)}`;

  const result = await callAnchorAPI(
    `/v1/files/read?path=${encodeURIComponent(filePath)}`,
    "GET"
  );

  if (!result.content) {
    return `Error: Could not read file ${filePath}`;
  }

  let content = result.content;
  const lines = content.split("\n");

  // Apply line range if specified
  if (start_line !== undefined || end_line !== undefined) {
    const start = start_line || 0;
    const end = end_line || lines.length;
    content = lines.slice(start, end).join("\n");
  }

  const lineInfo =
    start_line !== undefined || end_line !== undefined
      ? ` (lines ${start_line || 0}-${end_line || lines.length})`
      : "";

  return `📄 File: ${filePath}${lineInfo}\n${"=".repeat(40)}\n\n${content.substring(0, 10000)}${content.length > 10000 ? "\n\n[Content truncated...]" : ""}`;
}

async function handleListCompounds(args: any): Promise<string> {
  const { filter = "", limit = 50 } = args;

  const result = await callAnchorAPI("/v1/compounds/list", "GET");
  let compounds = result.compounds || [];

  if (filter) {
    compounds = compounds.filter((c: any) =>
      c.name?.toLowerCase().includes(filter.toLowerCase())
    );
  }

  compounds = compounds.slice(0, limit);

  if (compounds.length === 0) {
    return "No compounds found.";
  }

  return compounds
    .map(
      (c: any) =>
        `- ${c.name} (${c.molecule_count || 0} molecules, ${c.atom_count || 0} atoms)`
    )
    .join("\n");
}

async function handleGetStats(args: any): Promise<string> {
  const result = await callAnchorAPI("/v1/stats", "GET");

  return `📊 Anchor Engine Statistics

🧠 Knowledge Graph:
- Atoms: ${result.atoms?.toLocaleString() || 0}
- Molecules: ${result.molecules?.toLocaleString() || 0}
- Compounds: ${result.compounds?.toLocaleString() || 0}

💾 Storage:
- Database Size: ${result.dbSize || "N/A"}
- Index Size: ${result.indexSize || "N/A"}

⚡ System:
- Status: ${result.status || "unknown"}
- Uptime: ${result.uptime || "N/A"}
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

  try {
    const result = await callAnchorAPI("/v1/research/upload-raw", "POST", {
      content,
      filename,
      bucket,
      tags
    });

    const bucketEmoji = bucket === "inbox" ? "👑" : "🌐";
    const bucketNote = bucket === "inbox" 
      ? "Sovereign data (3.0x retrieval boost)" 
      : "External data (1.0x boost)";

    return `✅ Text ingested successfully!

${bucketEmoji} Bucket: ${bucket} - ${bucketNote}
📄 Filename: ${filename}
📊 Size: ${content.length.toLocaleString()} characters
🏷️ Tags: ${tags.length > 0 ? tags.join(", ") : "(auto-extracted)" }

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

  try {
    // First, read the file
    const fileResult = await callAnchorAPI(`/v1/files/read?path=${encodeURIComponent(filePath)}`, "GET");
    
    if (!fileResult.content) {
      return `❌ Could not read file: ${filePath}`;
    }

    const filename = filePath.split("/").pop() || filePath;
    const content = fileResult.content;

    // Then ingest it
    const ingestResult = await callAnchorAPI("/v1/research/upload-raw", "POST", {
      content,
      filename,
      bucket,
      tags: []
    });

    const bucketEmoji = bucket === "inbox" ? "👑" : "🌐";
    const bucketNote = bucket === "inbox" 
      ? "Sovereign data (3.0x retrieval boost)" 
      : "External data (1.0x boost)";

    let deleteNote = "";
    if (delete_original) {
      deleteNote = "\n🗑️ Original file will be deleted (not implemented yet - manual deletion required)";
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

// Resource handlers
async function handleResourceStats(): Promise<string> {
  const result = await callAnchorAPI("/v1/stats", "GET");
  return JSON.stringify(result, null, 2);
}

async function handleResourceCompounds(): Promise<string> {
  const result = await callAnchorAPI("/v1/compounds/list", "GET");
  return JSON.stringify(result.compounds || [], null, 2);
}

// Main server setup
const server = new Server(
  {
    name: "anchor-engine-mcp",
    version: "4.8.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Security check: MCP must be enabled
  if (!securitySettings.enabled) {
    return {
      content: [
        {
          type: "text",
          text: "🔒 MCP server is disabled. Enable it in user_settings.json (mcp.enabled: true) to use this feature.",
        },
      ],
      isError: true,
    };
  }

  // Security check: Rate limiting
  const clientId = "stdio-client"; // In stdio mode, we have one client
  if (isRateLimited(clientId)) {
    return {
      content: [
        {
          type: "text",
          text: "⏱️ Rate limit exceeded. Please wait before making more requests.",
        },
      ],
      isError: true,
    };
  }
  recordRequest(clientId);

  // Security check: Operation allowed
  const operationMap: Record<string, string> = {
    "anchor_query": "query",
    "anchor_distill": "distill",
    "anchor_illuminate": "illuminate",
    "anchor_read_file": "read_file",
    "anchor_list_compounds": "list",
    "anchor_get_stats": "get_stats",
    "anchor_ingest_text": "ingest_text",
    "anchor_ingest_file": "ingest_file"
  };
  
  const operation = operationMap[name] || name;
  if (!isOperationAllowed(operation)) {
    return {
      content: [
        {
          type: "text",
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
      case "anchor_query":
        result = await handleQuery(args);
        break;
      case "anchor_distill":
        result = await handleDistill(args);
        break;
      case "anchor_illuminate":
        result = await handleIlluminate(args);
        break;
      case "anchor_read_file":
        result = await handleReadFile(args);
        break;
      case "anchor_list_compounds":
        result = await handleListCompounds(args);
        break;
      case "anchor_get_stats":
        result = await handleGetStats(args);
        break;
      case "anchor_ingest_text":
        result = await handleIngestText(args);
        break;
      case "anchor_ingest_file":
        result = await handleIngestFile(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Handle resource requests
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    let content: string;

    switch (uri) {
      case "anchor://stats":
        content = await handleResourceStats();
        break;
      case "anchor://compounds":
        content = await handleResourceCompounds();
        break;
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
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
    const settings = await callAnchorAPI("/v1/settings", "GET");
    if (settings.settings?.mcp) {
      securitySettings = {
        ...securitySettings,
        ...settings.settings.mcp
      };
      console.error(`🔒 MCP Security: ${securitySettings.enabled ? 'ENABLED' : 'DISABLED'}`);
      if (securitySettings.enabled) {
        console.error(`   - Rate limit: ${securitySettings.rate_limit_requests_per_minute}/min`);
        console.error(`   - Max results: ${securitySettings.max_query_results}`);
        console.error(`   - Allowed ops: ${securitySettings.allowed_operations.join(', ')}`);
      }
    } else {
      console.error("⚠️ No MCP settings found in Anchor config. Using defaults (disabled).");
    }
  } catch (error: any) {
    console.error(`⚠️ Failed to load security settings: ${error.message}`);
    console.error("   MCP will remain disabled until settings can be loaded.");
    securitySettings.enabled = false;
  }
}

// Start server
async function main() {
  // Load security settings first
  await loadSecuritySettings();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Anchor Engine MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
