import { useState } from 'react';
import { AnchorClient } from '@rbalchii/anchor-client';

const client = new AnchorClient('http://localhost:3160');

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [tokenBudget, setTokenBudget] = useState(2048);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'meta'>('cards');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await client.search(query, { token_budget: tokenBudget });
      setResults(response.results);
      setMetadata(response.metadata);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>🔍 Search Memory</h2>
      <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
        Query your knowledge graph using STAR algorithm
      </p>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything... (e.g., 'OAuth setup discussion')"
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="token-budget" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568' }}>
            Token Budget: <strong>{tokenBudget}</strong> tokens (≈{tokenBudget * 4} chars)
          </label>
          <input
            id="token-budget"
            type="range"
            min="512"
            max="16384"
            step="512"
            value={tokenBudget}
            onChange={(e) => setTokenBudget(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : '🔍 Search'}
        </button>

        {results.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewMode(viewMode === 'cards' ? 'meta' : 'cards')}
            style={{ marginLeft: '0.5rem' }}
          >
            {viewMode === 'cards' ? '🔍 Meta Analysis' : '🃏 View Cards'}
          </button>
        )}
      </form>

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Searching...</span>
        </div>
      )}

      {metadata && (
        <div className="stats-bar" style={{ marginTop: '2rem' }}>
          <div className="stat">
            <div className="stat-value">{metadata.atom_count}</div>
            <div className="stat-label">Results</div>
          </div>
          <div className="stat">
            <div className="stat-value">{metadata.filled_percent}%</div>
            <div className="stat-label">Context Fill</div>
          </div>
          <div className="stat">
            <div className="stat-value">{metadata.query_time_ms}ms</div>
            <div className="stat-label">Query Time</div>
          </div>
        </div>
      )}

      {results.length > 0 && viewMode === 'cards' && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {results.map((result, idx) => (
            <div
              key={result.id}
              style={{
                padding: '1.5rem',
                background: '#f7fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#667eea', color: 'white', borderRadius: '4px' }}>
                  {(result.score * 100).toFixed(0)}% match
                </span>
                <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                  {result.source}
                </span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{result.content}</p>
              {result.tags && result.tags.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {result.tags.map((tag: string) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        background: '#e2e8f0',
                        borderRadius: '4px',
                        color: '#4a5568',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && viewMode === 'meta' && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: '#a78bfa' }}>
            🔍 Meta Analysis: Why These Were Selected
          </h3>
          {results.map((result, idx) => (
            <div
              key={`meta-${result.id}`}
              style={{
                padding: '1.5rem',
                background: 'rgba(0,0,0,0.03)',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>#{idx + 1}</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#667eea', color: 'white', borderRadius: '4px' }}>
                    {(result.score * 100).toFixed(0)}% score
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#718096' }}>{result.source}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.25rem' }}>🎯 Tags</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#667eea' }}>
                    {result.tags?.length || 'N/A'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.25rem' }}>🔗 Hops</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#a78bfa' }}>
                    {result.hop_distance || 0}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.25rem' }}>📅 Date</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#22c55e' }}>
                    {result.timestamp ? new Date(result.timestamp).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.25rem' }}>📊 Length</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    {(result.content?.length || 0).toLocaleString()} chars
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>💡 Why Selected:</div>
                <p style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.6 }}>
                  {result.tags && result.tags.length > 0 && (result.hop_distance || 0) <= 1 ? (
                    <>Direct match via tags <strong>{result.tags.slice(0, 2).join(', ')}</strong> with high semantic gravity.</>
                  ) : (result.hop_distance || 0) > 0 && (result.hop_distance || 0) <= 2 ? (
                    <>Associated via {(result.hop_distance || 0)}-hop graph traversal from anchor atoms.</>
                  ) : (
                    <>Retrieved through associative graph expansion with temporal decay.</>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
