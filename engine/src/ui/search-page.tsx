/**
 * Search Page - Solid.js Integration with C++ FFI
 */

import { createSignal, createEffect, For, Show, onMount, onCleanup } from 'solid-js';
import { anchor } from '../core/anchor-core-ffi';

interface SearchResult {
  id: string;
  content: string;
  source: string;
  tags: string[];
  buckets: string[];
  score?: number;
  timestamp?: number;
}

interface SearchPageProps {
  initialBuckets?: string[];
  availableBuckets?: string[];
  availableTags?: string[];
}

export function SearchPage(props: SearchPageProps) {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [selectedBuckets, setSelectedBuckets] = createSignal<string[]>(props.initialBuckets || ['Personal']);
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [showTags, setShowTags] = createSignal(true);
  const [showBuckets, setShowBuckets] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [initialized, setInitialized] = createSignal(false);

  const availableBuckets = () => props.availableBuckets || ['Personal', 'Work', 'Research', 'Notes', 'Archive'];
  const availableTags = () => props.availableTags || ['important', 'reference', 'todo', 'idea', 'question'];

  // Initialize C++ backend on mount
  onMount(async () => {
    try {
      console.log('[SearchPage] Initializing C++ backend...');
      await anchor.init('./engine/context_data/context.db');
      setInitialized(true);
      console.log('[SearchPage] Backend initialized successfully');
    } catch (err: any) {
      console.error('[SearchPage] Failed to initialize backend:', err);
      setError('Failed to connect to database. Please ensure the C++ core is built.');
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    anchor.destroy();
  });

  const toggleBucket = (bucket: string) => {
    const current = selectedBuckets();
    if (current.includes(bucket)) {
      setSelectedBuckets(current.filter(b => b !== bucket));
    } else {
      setSelectedBuckets([...current, bucket]);
    }
  };

  const toggleTag = (tag: string) => {
    const current = selectedTags();
    if (current.includes(tag)) {
      setSelectedTags(current.filter(t => t !== tag));
    } else {
      setSelectedTags([...current, tag]);
    }
  };

  const performSearch = async () => {
    if (!query().trim() || !initialized()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use C++ FFI search
      const rawResults = anchor.search(query(), 100);
      
      // Transform to UI format
      const formattedResults = rawResults.map((r: any) => ({
        id: String(r.id),
        content: r.content,
        source: r.source_id || r.source || 'Unknown',
        tags: r.tags || [],
        buckets: r.buckets || selectedBuckets(),
        score: r.score,
        timestamp: r.timestamp
      }));
      
      setResults(formattedResults);
    } catch (err: any) {
      console.error('[SearchPage] Search failed:', err);
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      performSearch();
    }
  };

  // Stats
  const resultCount = () => results().length;
  const totalChars = () => results().reduce((sum, r) => sum + (r.content?.length || 0), 0);
  const uniqueSources = () => new Set(results().map(r => r.source)).size;

  return (
    <div class="search-ui">
      {/* Results Panel (Left 2/3) */}
      <div class="results-panel">
        <div class="results-header">
          <div class="results-stats">
            <Show when={resultCount() > 0}>
              <div class="stat">
                <span class="stat-value">{resultCount()}</span>
                <span class="stat-label">results</span>
              </div>
              <div class="stat">
                <span class="stat-value">{(totalChars() / 1000).toFixed(1)}k</span>
                <span class="stat-label">chars</span>
              </div>
              <div class="stat">
                <span class="stat-value">{uniqueSources()}</span>
                <span class="stat-label">sources</span>
              </div>
            </Show>
          </div>
        </div>

        <div class="results-grid">
          <Show when={loading()}>
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Searching...</p>
            </div>
          </Show>
          
          <Show when={!loading() && error()}>
            <div class="error-state">
              <p class="error-message">{error()}</p>
            </div>
          </Show>
          
          <Show when={!loading() && !error() && resultCount() === 0}>
            <div class="empty-state">
              <p>Enter a search query to find relevant context</p>
            </div>
          </Show>
          
          <Show when={!loading() && !error() && resultCount() > 0}>
            <For each={results()}>
              {(result) => (
                <div class="result-card">
                  <div class="result-meta">
                    <span class="result-source">{result.source}</span>
                    <Show when={result.score}>
                      <span class="result-score">Score: {(result.score! * 100).toFixed(0)}%</span>
                    </Show>
                  </div>
                  <div class="result-content">{result.content}</div>
                  <Show when={result.tags.length > 0}>
                    <div class="result-tags">
                      <For each={result.tags}>
                        {(tag) => (
                          <span class="tag" onClick={() => toggleTag(tag)}>
                            {tag}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>

      {/* Search Panel (Right 1/3) */}
      <div class="search-panel">
        <div class="search-input-container">
          <textarea
            class="search-input"
            placeholder="Search your knowledge base..."
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          <button 
            class="search-button"
            onClick={performSearch}
            disabled={loading() || !query().trim() || !initialized()}
          >
            {loading() ? 'Searching...' : initialized() ? 'Search' : 'Loading...'}
          </button>
        </div>

        {/* Buckets Section */}
        <div class="search-section">
          <div class="section-header" onClick={() => setShowBuckets(!showBuckets())}>
            <span class="section-title">Buckets</span>
            <span class="section-toggle">{showBuckets() ? '▼' : '▶'}</span>
          </div>
          <Show when={showBuckets()}>
            <div class="bucket-list">
              <For each={availableBuckets()}>
                {(bucket) => (
                  <label class="bucket-item">
                    <input
                      type="checkbox"
                      checked={selectedBuckets().includes(bucket)}
                      onChange={() => toggleBucket(bucket)}
                    />
                    <span class="bucket-name">{bucket}</span>
                  </label>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Tags Section */}
        <div class="search-section">
          <div class="section-header" onClick={() => setShowTags(!showTags())}>
            <span class="section-title">Tags</span>
            <span class="section-count">{availableTags().length}</span>
            <span class="section-toggle">{showTags() ? '▼' : '▶'}</span>
          </div>
          <Show when={showTags()}>
            <div class="tag-list">
              <For each={availableTags()}>
                {(tag) => (
                  <button
                    class={`tag-item ${selectedTags().includes(tag) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Active Filters */}
        <Show when={selectedBuckets().length > 0 || selectedTags().length > 0}>
          <div class="active-filters">
            <span class="filters-title">Active Filters:</span>
            <div class="filters-list">
              <For each={selectedBuckets()}>
                {(bucket) => (
                  <span class="filter-badge bucket" onClick={() => toggleBucket(bucket)}>
                    {bucket} ×
                  </span>
                )}
              </For>
              <For each={selectedTags()}>
                {(tag) => (
                  <span class="filter-badge tag" onClick={() => toggleTag(tag)}>
                    {tag} ×
                  </span>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
