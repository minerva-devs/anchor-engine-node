import { http, HttpResponse } from 'msw';

// Base URL for API
const API_URL = 'http://localhost:3160';

// Mock data
export const mockBuckets = ['inbox', 'code', 'personal', 'dd-data', 'agents', 'news', 'rag'];
export const mockTags = ['important', 'work', 'todo', 'archive', 'reference'];
export const mockSearchResults = {
  results: [
    {
      id: 'atom-1',
      content: 'Test search result content',
      source: 'test.md',
      timestamp: Date.now(),
      provenance: 'internal',
      score: 0.95,
      buckets: ['inbox'],
      tags: ['important'],
    },
  ],
  context: 'Test context from backend',
  metadata: {
    atomCount: 1,
    strategy: 'standard',
  },
  split_queries: [],
};

// API Request Handlers
export const handlers = [
  // Health check
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok', uptime: 1000 });
  }),

  // Get buckets
  http.get(`${API_URL}/v1/buckets`, () => {
    return HttpResponse.json(mockBuckets);
  }),

  // Get tags
  http.get(`${API_URL}/v1/tags`, ({ request }) => {
    const url = new URL(request.url);
    const buckets = url.searchParams.get('buckets');
    
    // Return filtered tags based on buckets (simplified)
    return HttpResponse.json(buckets ? mockTags : mockTags);
  }),

  // Search
  http.post(`${API_URL}/v1/memory/search`, async ({ request }) => {
    const body = await request.json() as any;
    
    // Validate required fields
    if (!body.query) {
      return HttpResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Return mock search results
    return HttpResponse.json({
      ...mockSearchResults,
      metadata: {
        ...mockSearchResults.metadata,
        strategy: body.strategy || 'standard',
      },
    });
  }),

  // Quarantine atom
  http.post(`${API_URL}/v1/atoms/:atomId/quarantine`, ({ params }) => {
    return HttpResponse.json({
      status: 'success',
      message: `Atom ${params.atomId} quarantined`,
    });
  }),

  // Restore atom
  http.post(`${API_URL}/v1/atoms/:atomId/restore`, ({ params }) => {
    return HttpResponse.json({
      status: 'success',
      message: `Atom ${params.atomId} restored`,
    });
  }),

  // Get quarantined atoms
  http.get(`${API_URL}/v1/atoms/quarantined`, () => {
    return HttpResponse.json([]);
  }),

  // Backup
  http.post(`${API_URL}/v1/backup`, () => {
    return HttpResponse.json({
      status: 'success',
      filename: `backup-${Date.now()}.json`,
    });
  }),

  // Research web search
  http.get(`${API_URL}/v1/research/web-search`, () => {
    return HttpResponse.json({ results: [] });
  }),

  // Research scrape
  http.post(`${API_URL}/v1/research/scrape`, async () => {
    return HttpResponse.json({
      title: 'Test Article',
      content: 'Test scraped content',
    });
  }),

  // Upload raw - with proper payload handling for UI tests
  http.post(`${API_URL}/v1/research/upload-raw`, async ({ request }) => {
    const body = await request.json() as any;
    if (!body.content || !body.filename) {
      return HttpResponse.json(
        { error: 'content and filename are required' },
        { status: 400 }
      );
    }
    return HttpResponse.json({ 
      status: 'success',
      uploaded: true,
      filename: body.filename
    });
  }),

  // Get models (disabled endpoint)
  http.get(`${API_URL}/v1/models`, () => {
    return HttpResponse.json(
      { error: 'Models endpoint disabled' },
      { status: 503 }
    );
  }),

  // Model status (disabled endpoint)
  http.get(`${API_URL}/v1/model/status`, () => {
    return HttpResponse.json(
      { error: 'Model status disabled' },
      { status: 503 }
    );
  }),

  // Load model
  http.post(`${API_URL}/v1/inference/load`, async () => {
    return HttpResponse.json({ status: 'loading' });
  }),

  // Graph data
  http.post(`${API_URL}/v1/graph/data`, async () => {
    return HttpResponse.json({ nodes: [], links: [] });
  }),

  // System paths
  http.get(`${API_URL}/v1/system/paths`, () => {
    return HttpResponse.json([]);
  }),

  // Add path
  http.post(`${API_URL}/v1/system/paths`, async () => {
    return HttpResponse.json({ status: 'success' });
  }),

  // === BACKEND TEST ENDPOINTS ===

  // Get stats (backend test endpoint)
  http.get(`${API_URL}/v1/stats`, () => {
    return HttpResponse.json({
      atoms: 0,
      buckets: mockBuckets.length,
      tags: mockTags.length,
      memoryUsage: 'low'
    });
  }),

  // Watchdog status (backend test endpoint)
  http.get(`${API_URL}/v1/watchdog/status`, () => {
    return HttpResponse.json({
      is_running: false,
      last_scan_time: null,
      watched_paths_count: 0
    });
  }),

  // Settings endpoints (used by UI components)
  http.get(`${API_URL}/v1/settings`, () => {
    return HttpResponse.json({
      settings: {
        search: { max_chars_default: 524288 },
        adaptive_concurrency: { environment: 'auto' }
      }
    });
  }),

  http.put(`${API_URL}/v1/settings`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ settings: body.settings || {} });
  }),

  // Taxonomy endpoint (used by UI)
  http.get(`${API_URL}/v1/taxonomy`, () => {
    return HttpResponse.json({ rules: [], presets: [] });
  }),

  // Chat completions endpoint (used by ChatInterface)
  http.post(`${API_URL}/v1/chat/completions`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ 
      content: 'Mocked chat response',
      model: body.model || 'default'
    });
  }),

  // Engine switch endpoint (used by UI)
  http.post(`${API_URL}/v1/engine/switch`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ 
      engine: body.engine || 'default',
      status: 'active'
    });
  }),

  // Config ingestion endpoint (used by UI)
  http.post(`${API_URL}/v1/config/ingestion`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ 
      config: body.config || {},
      status: 'updated'
    });
  }),

  // GitHub credentials endpoint (used by GithubModal)
  http.get(`${API_URL}/v1/github/credentials`, () => {
    return HttpResponse.json({ 
      has_credentials: false,
      message: 'No credentials configured'
    });
  }),

  // Git repos endpoints (used by GitCommandsModal)
  http.get(`${API_URL}/v1/git/repos`, () => {
    return HttpResponse.json({ repos: [] });
  }),

  http.post(`${API_URL}/v1/github/repos`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ 
      id: 'mock-rep-' + Date.now(),
      status: 'queued',
      url: body.url
    });
  }),

  http.post(`${API_URL}/v1/github/repos/:id/sync`, async ({ params }) => {
    return HttpResponse.json({ 
      id: params.id,
      status: 'syncing',
      progress: 0
    });
  }),

  http.delete(`${API_URL}/v1/github/repos/:id`, async ({ params }) => {
    return HttpResponse.json({ 
      id: params.id,
      status: 'deleted'
    });
  }),

  // Synonym endpoints (used by UI)
  http.get(`${API_URL}/v1/synonyms`, () => {
    return HttpResponse.json({ synonyms: {} });
  }),

  http.post(`${API_URL}/v1/synonyms`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ 
      term: body.term,
      status: 'added'
    });
  }),

  http.delete(`${API_URL}/v1/synonyms/:term`, async ({ params }) => {
    return HttpResponse.json({ 
      term: params.term,
      status: 'deleted'
    });
  }),

  // Memory distill endpoint (used by UI)
  http.post(`${API_URL}/v1/memory/distill`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ 
      output_path: body.output_path || 'distilled-output.md',
      status: 'queued'
    });
  }),

  // System status endpoint (used by UI)
  http.get(`${API_URL}/v1/system/status`, () => {
    return HttpResponse.json({
      uptime: Date.now(),
      version: '4.8.0',
      healthy: true
    });
  })
];