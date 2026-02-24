/**
 * Search Page - Integration Example
 * 
 * Connects the Search UI to the C++ FFI backend
 */

import { SearchUI } from './search-ui';
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

export function SearchPage() {
  // Initialize C++ backend
  let initialized = false;
  
  const initializeBackend = async () => {
    if (!initialized) {
      try {
        await anchor.init('./engine/context_data/context.db');
        initialized = true;
        console.log('[SearchPage] C++ backend initialized');
      } catch (error) {
        console.error('[SearchPage] Failed to initialize backend:', error);
      }
    }
  };

  // Search handler
  const handleSearch = async (
    query: string,
    buckets: string[],
    tags: string[]
  ): Promise<SearchResult[]> => {
    await initializeBackend();
    
    try {
      // Use C++ FFI search
      const results = anchor.search(query, 100);
      
      // Transform to UI format
      return results.map((r: any) => ({
        id: String(r.id),
        content: r.content,
        source: r.source || 'Unknown',
        tags: r.tags || [],
        buckets: r.buckets || buckets,
        score: r.score,
        timestamp: r.timestamp
      }));
    } catch (error) {
      console.error('[SearchPage] Search failed:', error);
      return [];
    }
  };

  // Get available tags from database
  const getAvailableTags = async (): Promise<string[]> => {
    await initializeBackend();
    try {
      // Would call anchor.getTags() if implemented
      return ['important', 'reference', 'todo', 'idea', 'question'];
    } catch {
      return [];
    }
  };

  // Cleanup on unmount
  const cleanup = () => {
    anchor.destroy();
  };

  return {
    component: SearchUI,
    props: {
      onSearch: handleSearch,
      initialBuckets: ['Personal'],
      availableBuckets: ['Personal', 'Work', 'Research', 'Notes', 'Archive'],
      availableTags: getAvailableTags()
    },
    onUnmount: cleanup
  };
}

// Alternative: Simple HTML/JS version without Solid.js
export function createSearchPage(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="search-ui-legacy">
      <div class="results-panel">
        <div class="results-header">
          <div class="stats">
            <span class="stat"><span class="value" id="result-count">0</span> results</span>
            <span class="stat"><span class="value" id="char-count">0</span> chars</span>
          </div>
        </div>
        <div class="results" id="results"></div>
      </div>
      
      <div class="search-panel">
        <textarea 
          id="search-query" 
          placeholder="Search..."
          rows="3"
        ></textarea>
        <button id="search-btn">Search</button>
        
        <div class="buckets">
          <h3>Buckets</h3>
          <label><input type="checkbox" value="Personal" checked> Personal</label>
          <label><input type="checkbox" value="Work"> Work</label>
          <label><input type="checkbox" value="Research"> Research</label>
        </div>
        
        <div class="tags">
          <h3>Tags</h3>
          <div id="tag-list"></div>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .search-ui-legacy {
      display: grid;
      grid-template-columns: 1fr 350px;
      height: 100vh;
    }
    .results-panel {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .results-header {
      padding: 16px;
      border-bottom: 1px solid #ddd;
    }
    .stats {
      display: flex;
      gap: 24px;
    }
    .stat {
      font-size: 14px;
      color: #666;
    }
    .stat .value {
      font-weight: bold;
      color: #2196f3;
    }
    .results {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .result-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .result-content {
      white-space: pre-wrap;
      margin: 12px 0;
    }
    .search-panel {
      padding: 24px;
      background: #fafafa;
      overflow-y: auto;
    }
    #search-query {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      resize: vertical;
    }
    #search-btn {
      width: 100%;
      padding: 12px;
      margin-top: 12px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .buckets, .tags {
      margin-top: 24px;
    }
    .buckets h3, .tags h3 {
      font-size: 14px;
      margin-bottom: 12px;
    }
    .buckets label {
      display: block;
      padding: 8px;
      cursor: pointer;
    }
    .buckets label:hover {
      background: #f0f0f0;
    }
    #tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tag {
      background: #f5f5f5;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      cursor: pointer;
    }
    .tag:hover {
      background: #e0e0e0;
    }
  `;
  document.head.appendChild(style);

  // Wire up search
  const searchBtn = document.getElementById('search-btn');
  const searchQuery = document.getElementById('search-query');
  const resultsDiv = document.getElementById('results');
  const resultCount = document.getElementById('result-count');
  const charCount = document.getElementById('char-count');

  searchBtn?.addEventListener('click', async () => {
    const query = searchQuery?.value;
    if (!query) return;

    resultsDiv!.innerHTML = '<div class="loading">Searching...</div>';
    
    try {
      await initializeBackend();
      const results = anchor.search(query, 100);
      
      resultCount!.textContent = results.length.toString();
      charCount!.textContent = (results.reduce((sum: number, r: any) => sum + (r.content?.length || 0), 0) / 1000).toFixed(1) + 'k';
      
      resultsDiv!.innerHTML = results.map((r: any) => `
        <div class="result-card">
          <div class="result-source">${r.source || 'Unknown'}</div>
          <div class="result-content">${r.content}</div>
        </div>
      `).join('');
    } catch (error) {
      resultsDiv!.innerHTML = '<div class="error">Search failed</div>';
    }
  });

  // Load tags
  const tagList = document.getElementById('tag-list');
  const tags = ['important', 'reference', 'todo', 'idea'];
  tagList!.innerHTML = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
}
