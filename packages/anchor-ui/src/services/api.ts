interface SearchParams {
    query: string;
    max_chars: number;
    token_budget: number;
    provenance: 'internal' | 'all';
    buckets?: string[];
    tags?: string[];
    include_code?: boolean;
    strategy?: 'standard' | 'max-recall';
}

interface SearchResult {
    id: string;
    content: string;
    source: string;
    provenance: string;
    score: number;
    [key: string]: any;
}

interface SearchResponse {
    results: SearchResult[];
    context: string;
    metadata: any;
    split_queries?: string[];
}

// Get base API URL from environment or default to engine on port 3160
const getBaseUrl = () => {
    // In development, we proxy to the engine server
    // In production, this could be configured differently
    return import.meta.env.VITE_API_BASE_URL || '';
};

// Get API key from localStorage or use default
const getApiKey = () => {
    return localStorage.getItem('anchor_api_key') || 'anchor-engine-default-key';
};

// Common headers for all API requests
const getHeaders = (contentType = 'application/json') => ({
    'Content-Type': contentType,
    'Authorization': `Bearer ${getApiKey()}`,
});

export const api = {
    // Generic HTTP methods
    get: (endpoint: string) => fetch(`${getBaseUrl()}${endpoint}`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    post: (endpoint: string, data?: any) =>
        fetch(`${getBaseUrl()}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: data ? JSON.stringify(data) : undefined
        }).then(r => r.json()),

    // Specific API methods
    getBuckets: () => fetch(`${getBaseUrl()}/v1/buckets`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    createBucket: (name: string, location?: 'inbox' | 'external-inbox') =>
        fetch(`${getBaseUrl()}/v1/buckets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, location })
        }).then(r => r.json()),

    getTags: (buckets?: string[]) => {
        const query = buckets && buckets.length > 0 ? `?buckets=${buckets.join(',')}` : '';
        return fetch(`${getBaseUrl()}/v1/tags${query}`, {
            headers: getHeaders(),
        }).then(r => r.json());
    },

    search: (params: SearchParams): Promise<SearchResponse> =>
        fetch(`${getBaseUrl()}/v1/memory/search`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(params)
        }).then(r => r.json()),

    quarantineAtom: (atomId: string) =>
        fetch(`${getBaseUrl()}/v1/atoms/${atomId}/quarantine`, {
            method: 'POST',
            headers: getHeaders(),
        }),

    backup: () => fetch(`${getBaseUrl()}/v1/backup`, {
        method: 'POST',
        headers: getHeaders(),
    }).then(r => r.json()),

    getQuarantined: () => fetch(`${getBaseUrl()}/v1/atoms/quarantined`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    cureAtom: (atomId: string) => fetch(`${getBaseUrl()}/v1/atoms/${atomId}/restore`, {
        method: 'POST',
        headers: getHeaders(),
    }).then(r => r.json()),

    deleteAtom: (atomId: string) => fetch(`${getBaseUrl()}/v1/atoms/${atomId}`, {
        method: 'DELETE',
        headers: getHeaders(),
    }).then(r => r.json()),

    getSettings: () => fetch(`${getBaseUrl()}/v1/settings`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    updateSettings: (settings: any) => fetch(`${getBaseUrl()}/v1/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settings)
    }).then(r => r.json()),

    getStats: () => fetch(`${getBaseUrl()}/v1/stats`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    getSystemStatus: () => fetch(`${getBaseUrl()}/v1/system/status`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    getWatchdogStatus: () => fetch(`${getBaseUrl()}/v1/watchdog/status`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    // GitHub repo ingestion - includes optional PAT token
    ingestGithubRepo: (url: string, bucket: string, token?: string) => fetch(`${getBaseUrl()}/v1/github/repos`, {
        method: 'POST',
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
        body: JSON.stringify({ url, bucket })
    }).then(r => r.json()),

    getGithubCredentials: () => fetch(`${getBaseUrl()}/v1/github/credentials`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    getGitRepos: () => fetch(`${getBaseUrl()}/v1/git/repos`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    syncGitRepo: (id: string) => fetch(`${getBaseUrl()}/v1/github/repos/${id}/sync`, {
        method: 'POST',
        headers: getHeaders(),
    }).then(r => r.json()),

    deleteGitRepo: (id: string) => fetch(`${getBaseUrl()}/v1/github/repos/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    }).then(r => r.json()),

    // Research/scraping endpoints
    scrapeUrl: (url: string) => fetch(`${getBaseUrl()}/v1/research/scrape`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ url })
    }).then(r => r.json()),

    // Distillation endpoints
    distillMemory: (seed?: string, radius?: number, outputPath?: string) =>
        fetch(`${getBaseUrl()}/v1/memory/distill`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ seed, radius, output_path: outputPath })
        }).then(r => r.json()),

    // Synonym management
    getSynonyms: () => fetch(`${getBaseUrl()}/v1/synonyms`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    addSynonym: (term: string, synonyms: string[]) =>
        fetch(`${getBaseUrl()}/v1/synonyms`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ term, synonyms })
        }).then(r => r.json()),

    deleteSynonym: (term: string) =>
        fetch(`${getBaseUrl()}/v1/synonyms/${term}`, {
            method: 'DELETE',
            headers: getHeaders(),
        }).then(r => r.json()),

    // Taxonomy endpoints
    getTaxonomy: () => fetch(`${getBaseUrl()}/v1/taxonomy`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    // Chat/completion endpoints
    chat: (messages: any[], model?: string) =>
        fetch(`${getBaseUrl()}/v1/chat/completions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ messages, model })
        }).then(r => r.json()),

    // Model management
    getModels: () => fetch(`${getBaseUrl()}/v1/models`, {
        headers: getHeaders(),
    }).then(r => r.json()),

    loadModel: (model: string) =>
        fetch(`${getBaseUrl()}/v1/model/load`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ model })
        }).then(r => r.json()),

    // Terminal command execution
    execCommand: (command: string, cwd?: string, timeout?: number) =>
        fetch(`${getBaseUrl()}/v1/terminal/exec`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ command, cwd, timeout })
        }).then(r => r.json()),

    // Ingestion configuration
    updateIngestionConfig: (config: any) =>
        fetch(`${getBaseUrl()}/v1/config/ingestion`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(config)
        }).then(r => r.json()),

    // Engine switching
    switchEngine: (engine: string) =>
        fetch(`${getBaseUrl()}/v1/engine/switch`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ engine })
        }).then(r => r.json()),
};
