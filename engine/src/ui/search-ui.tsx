/**
 * Search UI Component
 * 
 * Layout:
 * - Left 2/3: Data compounds display (results)
 * - Right 1/3: Search panel (query, tags, buckets)
 * 
 * Features:
 * - Tag dropdown (list of available tags)
 * - Toggleable buckets
 * - Result counters
 * - Clean, minimal design
 */

import { h, createSignal, createEffect, For, Show } from 'solid-js';

interface SearchResult {
  id: string;
  content: string;
  source: string;
  tags: string[];
  buckets: string[];
  score?: number;
  timestamp?: number;
}

interface SearchUIProps {
  onSearch?: (query: string, buckets: string[], tags: string[]) => Promise<SearchResult[]>;
  initialBuckets?: string[];
  availableBuckets?: string[];
  availableTags?: string[];
}

export function SearchUI(props: SearchUIProps) {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [selectedBuckets, setSelectedBuckets] = createSignal<string[]>(props.initialBuckets || []);
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [showTags, setShowTags] = createSignal(false);
  const [showBuckets, setShowBuckets] = createSignal(false);
  const [searchHistory, setSearchHistory] = createSignal<string[]>([]);

  const availableBuckets = () => props.availableBuckets || ['Personal', 'Work', 'Research', 'Notes'];
  const availableTags = () => props.availableTags || [];

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
    if (!query().trim()) return;
    
    setLoading(true);
    try {
      if (props.onSearch) {
        const searchResults = await props.onSearch(
          query(),
          selectedBuckets(),
          selectedTags()
        );
        setResults(searchResults);
        
        // Add to history
        const history = searchHistory();
        if (!history.includes(query())) {
          setSearchHistory([query(), ...history.slice(0, 9)]);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
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

  const loadHistoryItem = (item: string) => {
    setQuery(item);
  };

  // Stats
  const resultCount = () => results().length;
  const totalChars = () => results().reduce((sum, r) => sum + (r.content?.length || 0), 0);
  const uniqueSources = () => new Set(results().map(r => r.source)).size;

  return (
    <div class="search-ui">
      {/* Main Content Area - Left 2/3 */}
      <div class="search-results-panel">
        {/* Results Header */}
        <div class="results-header">
          <div class="results-stats">
            <Show when={resultCount() > 0}>
              <span class="stat">
                <span class="stat-value">{resultCount()}</span>
                <span class="stat-label">results</span>
              </span>
              <span class="stat">
                <span class="stat-value">{(totalChars() / 1000).toFixed(1)}k</span>
                <span class="stat-label">chars</span>
              </span>
              <span class="stat">
                <span class="stat-value">{uniqueSources()}</span>
                <span class="stat-label">sources</span>
              </span>
            </Show>
          </div>
        </div>

        {/* Results Grid */}
        <div class="results-grid">
          <Show 
            when={!loading()}
            fallback={
              <div class="loading-state">
                <div class="spinner"></div>
                <p>Searching...</p>
              </div>
            }
          >
            <Show 
              when={resultCount() > 0}
              fallback={
                <div class="empty-state">
                  <p>Enter a search query to find relevant context</p>
                </div>
              }
            >
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
                    <div class="result-tags">
                      <For each={result.tags}>
                        {(tag) => (
                          <span class="tag" onClick={() => toggleTag(tag)}>
                            {tag}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </Show>
        </div>
      </div>

      {/* Search Panel - Right 1/3 */}
      <div class="search-panel">
        {/* Search Input */}
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
            disabled={loading() || !query().trim()}
          >
            {loading() ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search History */}
        <Show when={searchHistory().length > 0}>
          <div class="search-history">
            <div class="history-header">
              <span>Recent Searches</span>
              <button class="clear-history" onClick={() => setSearchHistory([])}>
                Clear
              </button>
            </div>
            <div class="history-list">
              <For each={searchHistory()}>
                {(item) => (
                  <button 
                    class="history-item"
                    onClick={() => loadHistoryItem(item)}
                  >
                    {item}
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

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
                    <Show when={selectedBuckets().includes(bucket)}>
                      <span class="bucket-active">✓</span>
                    </Show>
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
              <Show 
                when={availableTags().length > 0}
                fallback={<p class="no-tags">No tags available</p>}
              >
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
              </Show>
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

// CSS Styles
const styles = `
.search-ui {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 0;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Results Panel (Left 2/3) */
.search-results-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
  border-right: 1px solid #e0e0e0;
}

.results-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.results-stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #2196f3;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  transition: box-shadow 0.2s;
}

.result-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.result-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: #666;
}

.result-source {
  font-weight: 500;
  color: #1976d2;
}

.result-score {
  background: #e3f2fd;
  padding: 2px 8px;
  border-radius: 4px;
  color: #1976d2;
}

.result-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.result-tags .tag {
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.result-tags .tag:hover {
  background: #e0e0e0;
}

/* Search Panel (Right 1/3) */
.search-panel {
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 24px;
  overflow-y: auto;
  background: #fafafa;
}

.search-input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}

.search-input:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.search-button {
  padding: 12px 24px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.search-button:hover {
  background: #1976d2;
}

.search-button:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
}

/* Search History */
.search-history {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.clear-history {
  background: none;
  border: none;
  color: #2196f3;
  font-size: 12px;
  cursor: pointer;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  text-align: left;
  padding: 8px 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: #e0e0e0;
}

/* Sections */
.search-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
  cursor: pointer;
  user-select: none;
}

.section-title {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.section-count {
  font-size: 12px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
}

.section-toggle {
  font-size: 12px;
  color: #999;
}

/* Buckets */
.bucket-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bucket-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.bucket-item:hover {
  background: #f5f5f5;
}

.bucket-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.bucket-name {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.bucket-active {
  color: #4caf50;
  font-weight: bold;
}

/* Tags */
.tag-list {
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.tag-item {
  padding: 6px 14px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-item:hover {
  background: #e0e0e0;
}

.tag-item.selected {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.no-tags {
  font-size: 13px;
  color: #999;
  padding: 12px 16px;
}

/* Active Filters */
.active-filters {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.filters-title {
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 12px;
  display: block;
}

.filters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.filter-badge:hover {
  opacity: 0.7;
}

.filter-badge.bucket {
  background: #e8f5e9;
  color: #2e7d32;
}

.filter-badge.tag {
  background: #e3f2fd;
  color: #1976d2;
}

/* States */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1024px) {
  .search-ui {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  
  .search-panel {
    border-top: 1px solid #e0e0e0;
    max-height: 400px;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
