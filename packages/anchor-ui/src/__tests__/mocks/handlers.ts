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
  });

  // Restore atom
  http.post(`${API_URL}/v1/atoms/:atomId/restore`, ({ params }) => {
    return HttpResponse.json({
      status: 'success',
      message: `Atom ${params.atomId} restored`,
    });
  });

  // Get quarantined atoms
  http.get(`${API_URL}/v1/atoms/quarantined`, () => {
    return HttpResponse.json([]);
  });

  // Backup
  http.post(`${API_URL}/v1/backup`, () => {
    return HttpResponse.json({
      status: 'success',
      filename: `backup-${Date.now()}.json`,
    });
  });

  // Research web search
  http.get(`${API_URL}/v1/research/web-search`, () => {
    return HttpResponse.json({ results: [] });
  });

  // Research scrape
  http.post(`${API_URL}/v1/research/scrape`, async () => {
    return HttpResponse.json({
      title: 'Test Article',
      content: 'Test scraped content',
    });
  });

  // Upload raw
  http.post(`${API_URL}/v1/research/upload-raw`, async () => {
    return HttpResponse.json({ status: 'success' });
  });

  // Get models (disabled endpoint)
  http.get(`${API_URL}/v1/models`, () => {
    return HttpResponse.json(
      { error: 'Models endpoint disabled' },
      { status: 503 }
    );
  });

  // Model status (disabled endpoint)
  http.get(`${API_URL}/v1/model/status`, () => {
    return HttpResponse.json(
      { error: 'Model status disabled' },
      { status: 503 }
    );
  });

  // Load model
  http.post(`${API_URL}/v1/inference/load`, async () => {
    return HttpResponse.json({ status: 'loading' });
  });

  // Graph data
  http.post(`${API_URL}/v1/graph/data`, async () => {
    return HttpResponse.json({ nodes: [], links: [] });
  });

  // System paths
  http.get(`${API_URL}/v1/system/paths`, () => {
    return HttpResponse.json([]);
  });

  // Add path
  http.post(`${API_URL}/v1/system/paths`, async () => {
    return HttpResponse.json({ status: 'success' });
  });
];
