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
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    post: (endpoint: string, data?: any) =>
        fetch(`${getBaseUrl()}${endpoint}`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: data ? JSON.stringify(data) : undefined
        }).then(r => r.json()),

    // Specific API methods
    getBuckets: () => fetch(`${getBaseUrl()}/v1/buckets`, {
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    createBucket: (name: string, location?: 'inbox' | 'external-inbox') =>
        fetch(`${getBaseUrl()}/v1/buckets`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: JSON.stringify({ name, location })
        }).then(r => r.json()),

    getTags: (buckets?: string[]) => {
        const query = buckets && buckets.length > 0 ? `?buckets=${buckets.join(',')}` : '';
        return fetch(`${getBaseUrl()}/v1/tags${query}`, {
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
        }).then(r => r.json());
    },

    search: (params: SearchParams): Promise<SearchResponse> =>
        fetch(`${getBaseUrl()}/v1/memory/search`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: JSON.stringify(params)
        }).then(r => r.json()),

    quarantineAtom: (atomId: string) =>
        fetch(`${getBaseUrl()}/v1/atoms/${atomId}/quarantine`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
        }),

    backup: () => fetch(`${getBaseUrl()}/v1/backup`, {
        method: 'POST',
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    getQuarantined: () => fetch(`${getBaseUrl()}/v1/atoms/quarantined`, {
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    cureAtom: (atomId: string) => fetch(`${getBaseUrl()}/v1/atoms/${atomId}/restore`, {
        method: 'POST',
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    dream: () => fetch(`${getBaseUrl()}/v1/dream`, {
        method: 'POST',
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    research: (query: string) =>
        fetch(`${getBaseUrl()}/v1/research/web-search?q=${encodeURIComponent(query)}`, {
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
        }).then(r => r.json()),

    scrape: (url: string, category: string = 'article') =>
        fetch(`${getBaseUrl()}/v1/research/scrape`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: JSON.stringify({ url, category })
        }).then(r => r.json()),

    uploadRaw: (content: string, filename: string) =>
        fetch(`${getBaseUrl()}/v1/research/upload-raw`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: JSON.stringify({ content, filename })
        }).then(r => r.json()),

    getModels: () => fetch(`${getBaseUrl()}/v1/models`, {
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    loadModel: (model: string, options?: any) =>
        fetch(`${getBaseUrl()}/v1/inference/load`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: JSON.stringify({ model, options })
        }).then(r => r.json()),

    getModelStatus: () => fetch(`${getBaseUrl()}/v1/model/status`, {
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    getGraphData: (query: string, limit: number = 20) =>
        fetch(`${getBaseUrl()}/v1/graph/data`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: JSON.stringify({ query, limit })
        }).then(r => r.json()),

    getPaths: () => fetch(`${getBaseUrl()}/v1/system/paths`, {
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    addPath: (path: string) => fetch(`${getBaseUrl()}/v1/system/paths`, {
        method: 'POST',
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
        body: JSON.stringify({ path })
    }).then(r => r.json()),

    removePath: (path: string) => fetch(`${getBaseUrl()}/v1/system/paths`, {
        method: 'DELETE',
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
        body: JSON.stringify({ path })
    }).then(r => r.json()),

    ingestGithubRepo: (url: string, bucket: string, token?: string) => fetch(`${getBaseUrl()}/v1/github/repos`, {
        method: 'POST',
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
        body: JSON.stringify({ url, bucket })
    }).then(r => r.json()),

    getGithubCredentials: () => fetch(`${getBaseUrl()}/v1/github/credentials`, {
        headers: getHeaders(),
    }).then(r => r.json()),
    getGitRepos: () => fetch(`${getBaseUrl()}/v1/git/repos`, {
        headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
    }).then(r => r.json()),

    runGitCommand: (command: string, workingDir: string) =>
        fetch(`${getBaseUrl()}/v1/git/run`, {
            method: 'POST',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: JSON.stringify({ command, working_dir: workingDir })
        }).then(r => r.json()),

    // Update search settings and notify UI components
    updateSearchSettings: async (settings: { max_chars_default?: number }) => {
        const result = await fetch(`${getBaseUrl()}/v1/settings/search`, {
            method: 'PUT',
            headers: { ...getHeaders(), ...(token && { "x-github-token": token }) },
            body: JSON.stringify(settings)
        }).then(r => r.json());
        
        // Dispatch event to notify UI components of settings change
        if (settings.max_chars_default) {
            const tokenBudget = Math.floor(settings.max_chars_default / 4);
            window.dispatchEvent(new CustomEvent('settings-changed', {
                detail: { tokenBudget }
            }));
        }
        
        return result;
    }
} as const;

// Define the type for the api object
export type ApiType = typeof api;
