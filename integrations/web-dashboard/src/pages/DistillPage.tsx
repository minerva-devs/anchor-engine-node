import { useState } from 'react';
import { AnchorClient, type DecisionRecord } from '@rbalchii/anchor-client';

const client = new AnchorClient('http://localhost:3160');

export function DistillPage() {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(3);
  const [maxNodes, setMaxNodes] = useState(500);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<DecisionRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDistill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await client.distill({
        query,
        radius,
        max_nodes: maxNodes,
        output_format: 'json',
      });
      
      setRecords(response.output.records || []);
      setStats(response.stats);
    } catch (err: any) {
      setError(err.message || 'Distillation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>💎 Distill Knowledge</h2>
      <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
        Compress your knowledge into Decision Records (problem/solution/rationale)
      </p>

      <form onSubmit={handleDistill}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Seed topic (e.g., 'career planning', 'OAuth setup')"
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label htmlFor="radius" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568' }}>
              Graph Radius: <strong>{radius}</strong> hops
            </label>
            <input
              id="radius"
              type="range"
              min="1"
              max="5"
              step="1"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="maxNodes" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568' }}>
              Max Nodes: <strong>{maxNodes}</strong>
            </label>
            <input
              id="maxNodes"
              type="range"
              min="100"
              max="2000"
              step="100"
              value={maxNodes}
              onChange={(e) => setMaxNodes(parseInt(e.target.value))}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
          {loading ? '⏳ Distilling...' : '💎 Run Distillation'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {stats && (
        <div className="stats-bar" style={{ marginTop: '2rem' }}>
          <div className="stat">
            <div className="stat-value">{stats.compounds_processed}</div>
            <div className="stat-label">Compounds</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.blocks_total}</div>
            <div className="stat-label">Total Blocks</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.blocks_unique}</div>
            <div className="stat-label">Unique Blocks</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.compression_ratio}</div>
            <div className="stat-label">Compression</div>
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: '#a78bfa' }}>
            📋 Decision Records ({records.length})
          </h3>
          {records.map((record, idx) => (
            <div
              key={record.id || idx}
              style={{
                padding: '1.5rem',
                background: '#f7fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    background: record.status === 'accepted' ? '#22c55e' : record.status === 'proposed' ? '#f59e0b' : '#ef4444',
                    color: 'white',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}
                >
                  {record.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                  {record.sources?.[0]?.source || 'Unknown source'}
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>🎯 Problem</h4>
                <p style={{ lineHeight: 1.6 }}>{record.problem}</p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>✅ Solution</h4>
                <p style={{ lineHeight: 1.6 }}>{record.solution}</p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>💡 Rationale</h4>
                <p style={{ lineHeight: 1.6 }}>{record.rationale}</p>
              </div>

              {record.alternatives && record.alternatives.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>🔄 Alternatives Considered</h4>
                  <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8 }}>
                    {record.alternatives.map((alt, i) => (
                      <li key={i}>{alt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {record.tags && record.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {record.tags.map((tag) => (
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

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f7fafc', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#4a5568' }}>💡 What is Distillation?</h4>
        <p style={{ fontSize: '0.875rem', color: '#718096', lineHeight: 1.6 }}>
          Distillation compresses your knowledge graph into structured Decision Records.
          Instead of raw text, you get problem/solution/rationale triplets—perfect for
          LLM context, documentation, or decision tracking. It removes redundancy while
          preserving semantic meaning.
        </p>
      </div>
    </div>
  );
}
