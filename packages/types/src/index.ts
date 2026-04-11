// Core Anchor Engine Types
// Shared across all integrations (web, Obsidian, VS Code, etc.)

// =============================================================================
// Core Data Model
// =============================================================================

export interface Atom {
  id: string;
  content: string;
  source: string;
  start_offset: number;
  end_offset: number;
  timestamp: number;
  tags: string[];
  simhash: string;
}

export interface Molecule {
  id: string;
  compound_id: string;
  start_offset: number;
  end_offset: number;
  timestamp: number;
}

export interface Compound {
  id: string;
  source_path: string;
  filename: string;
  size_bytes: number;
  molecule_count: number;
  ingested_at: number;
  bucket: 'inbox' | 'external-inbox';
}

export interface Tag {
  id: string;
  name: string;
  atom_count: number;
  created_at: number;
}

// =============================================================================
// Search & Retrieval
// =============================================================================

export interface SearchQuery {
  query: string;
  token_budget?: number;
  max_chars?: number;
  provenance?: 'all' | 'minimal';
  buckets?: string[];
  tags?: string[];
  strategy?: 'standard' | 'max-recall';
}

export interface SearchResult {
  id: string;
  content: string;
  source: string;
  score: number;
  timestamp: number;
  tags: string[];
  hop_distance?: number;
  shared_tags?: string[];
  provenance?: string;
}

export interface SearchMetadata {
  atom_count: number;
  filled_percent: number;
  total_results: number;
  query_time_ms: number;
}

export interface SearchResponse {
  results: SearchResult[];
  metadata: SearchMetadata;
  context: string;
}

// =============================================================================
// Ingestion
// =============================================================================

export interface IngestTextRequest {
  content: string;
  filename: string;
  bucket?: 'inbox' | 'external-inbox';
  tags?: string[];
}

export interface IngestFileRequest {
  path: string;
  bucket?: 'inbox' | 'external-inbox';
  delete_original?: boolean;
}

export interface IngestResponse {
  status: 'success' | 'error';
  message?: string;
  atoms_created?: number;
  molecules_created?: number;
  compound_id?: string;
}

// =============================================================================
// Distillation
// =============================================================================

export interface DistillRequest {
  seed: {
    query?: string;
    atom_ids?: string[];
  };
  radius?: number;
  max_nodes?: number;
  output_format?: 'json' | 'yaml' | 'md';
}

export interface DecisionRecord {
  id: string;
  problem: string;
  solution: string;
  rationale: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated';
  alternatives?: string[];
  consequences?: string[];
  tags: string[];
  sources: Array<{
    source: string;
    timestamp: number;
  }>;
  created_at: number;
  updated_at: number;
}

export interface DistillResponse {
  status: 'success' | 'error';
  stats: {
    compounds_processed: number;
    blocks_total: number;
    blocks_unique: number;
    compression_ratio: string;
  };
  output: {
    path: string;
    records?: DecisionRecord[];
  };
}

// =============================================================================
// Graph Exploration
// =============================================================================

export interface IlluminateRequest {
  seed?: {
    query?: string;
    atom_ids?: string[];
  };
  max_depth?: number;
  max_nodes?: number;
}

export interface IlluminateResult {
  id: string;
  content: string;
  score: number;
  hop_distance: number;
  tags: string[];
  source: string;
  timestamp: number;
}

export interface IlluminateResponse {
  results: IlluminateResult[];
  metadata: {
    total_nodes: number;
    max_depth_reached: number;
  };
}

// =============================================================================
// Session Index (v5.0.0)
// =============================================================================

export interface SessionIndexEntry {
  session_id: string;
  date: string;
  message_count: number;
  commands: string[];
  topics: string[];
  participants: string[];
  full_log_path: string;
}

export interface SearchIndexRequest {
  query: string;
  max_results?: number;
  commands_only?: boolean;
}

export interface SearchIndexResponse {
  sessions: SessionIndexEntry[];
  total: number;
}

export interface FetchSessionRequest {
  session_id: string;
  max_messages?: number;
  include_metadata?: boolean;
}

export interface FetchSessionResponse {
  session: SessionIndexEntry;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
}

// =============================================================================
// System & Stats
// =============================================================================

export interface SystemStats {
  atoms: number;
  molecules: number;
  compounds: number;
  tags: number;
  database_size_mb: number;
  mirrored_brain_size_mb: number;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  uptime: string;
  memory_mb: number;
  database_ready: boolean;
}

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
