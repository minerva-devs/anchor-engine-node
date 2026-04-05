import { useState } from 'react';
import { AnchorClient } from '@rbalchii/anchor-client';
import yaml from 'js-yaml';

const client = new AnchorClient('http://localhost:3160');

interface DistillLine {
  content: string;
  provenance: string[];
  first_seen: string;
}

const LINES_PER_PAGE = 50;

export function DistillPage() {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<DistillLine[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [outputPath, setOutputPath] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'meta'>('cards');

  const totalPages = Math.ceil(lines.length / LINES_PER_PAGE);
  const startIndex = (currentPage - 1) * LINES_PER_PAGE;
  const endIndex = startIndex + LINES_PER_PAGE;
  const currentLines = lines.slice(startIndex, endIndex);

  const handleDistill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && radius <= 0) return;

    setLoading(true);
    setError(null);
    setCopied(false);
    setCurrentPage(1);
    setLines([]);

    try {
      const response = await fetch('http://localhost:3160/v1/memory/distill?stream=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer anchor-engine-default-key',
        },
        body: JSON.stringify({
          seed: { query: query.trim() || undefined },
          radius,
          output_format: 'json',
        }),
      });

      const data = await response.json();

      setStats(data.stats);
      setOutputPath(data.output?.path || '');

      // Load the lines from the output file
      if (data.output?.path) {
        try {
          const fileResponse = await fetch(`http://localhost:3160/v1/files/read?path=${encodeURIComponent(data.output.path)}`);
          const fileData = await fileResponse.json();
          if (fileData.lines) {
            setLines(fileData.lines);
          }
        } catch (e) {
          console.log('Could not load output file');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Distillation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyYaml = async () => {
    if (lines.length === 0) return;

    const yamlOutput = yaml.dump({
      metadata: {
        source: 'Anchor Engine Radial Distiller',
        distilled_at: new Date().toISOString(),
        line_count: lines.length,
        stats: stats,
      },
      lines: lines.map(l => ({
        content: l.content,
        provenance: l.provenance,
        first_seen: l.first_seen,
      })),
    });

    try {
      await navigator.clipboard.writeText(yamlOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadYaml = () => {
    if (lines.length === 0) return;

    const yamlOutput = yaml.dump({
      metadata: {
        source: 'Anchor Engine Radial Distiller',
        distilled_at: new Date().toISOString(),
        line_count: lines.length,
        stats: stats,
      },
      lines: lines.map(l => ({
        content: l.content,
        provenance: l.provenance,
        first_seen: l.first_seen,
      })),
    });

    const blob = new Blob([yamlOutput], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `distilled-${new Date().toISOString().replace(/[:.]/g, '-')}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="card">
      <h2>💎 Distill Knowledge</h2>
      <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
        Standard 133: Line-level deduplication with radial inflation
      </p>

      <form onSubmit={handleDistill}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Seed query (optional, leave empty for all content)"
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label htmlFor="radius" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568' }}>
              Radius: <strong>{radius}</strong> chars
            </label>
            <input
              id="radius"
              type="range"
              min="500"
              max="10000"
              step="500"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="outputFormat" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568' }}>
              Output Format
            </label>
            <select
              id="outputFormat"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as any)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}
            >
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
              <option value="compound">Markdown</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
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
            <div className="stat-value">{stats.lines_total}</div>
            <div className="stat-label">Total Lines</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.lines_unique}</div>
            <div className="stat-label">Unique Lines</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.compression_ratio}</div>
            <div className="stat-label">Compression</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.duration_ms?.toFixed(0)}</div>
            <div className="stat-label">Duration (ms)</div>
          </div>
        </div>
      )}

      {stats && lines.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopyYaml}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem 1.5rem',
              background: copied ? '#22c55e' : '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {copied ? (
              <>
                <span>✅</span>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copy YAML</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownloadYaml}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>⬇️</span>
            <span>Download YAML</span>
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'cards' ? 'meta' : 'cards')}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem 1.5rem',
            }}
          >
            {viewMode === 'cards' ? '📊 View Meta' : '🃏 View Cards'}
          </button>
          <span style={{ fontSize: '0.875rem', color: '#718096' }}>
            {lines.length} lines • Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      {outputPath && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#edf2f7', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.875rem', color: '#4a5568' }}>
            📄 Output: <code style={{ background: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{outputPath}</code>
          </span>
        </div>
      )}

      {lines.length > 0 && viewMode === 'cards' && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {currentLines.map((line, idx) => (
              <div
                key={startIndex + idx}
                style={{
                  padding: '1.5rem',
                  background: '#f7fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#667eea', color: 'white', borderRadius: '4px' }}>
                    Line {startIndex + idx + 1}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                    {line.provenance?.[0]?.split('/').pop() || 'Unknown source'}
                  </span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: '1rem' }}>{line.content}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#718096', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span>📁 {line.provenance?.[0] || 'Unknown'}</span>
                  <span>🕐 {new Date(line.first_seen).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Previous
              </button>
              <span style={{ color: '#4a5568', fontWeight: 'bold' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {lines.length > 0 && viewMode === 'meta' && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: '#a78bfa' }}>
            📊 Metadata View ({lines.length} lines)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#4a5568' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#4a5568' }}>Content</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#4a5568' }}>Source</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#4a5568' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {currentLines.map((line, idx) => (
                  <tr key={startIndex + idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', color: '#718096' }}>{startIndex + idx + 1}</td>
                    <td style={{ padding: '0.75rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.content.substring(0, 100)}...</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#718096' }}>{line.provenance?.[0]?.split('/').pop() || 'Unknown'}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#718096' }}>{new Date(line.first_seen).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination for meta view */}
          {totalPages > 1 && (
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Previous
              </button>
              <span style={{ color: '#4a5568', fontWeight: 'bold' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f7fafc', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#4a5568' }}>💡 What is Distillation?</h4>
        <p style={{ fontSize: '0.875rem', color: '#718096', lineHeight: 1.6 }}>
          Distillation (Standard 133) compresses your knowledge graph through line-level deduplication.
          It radially inflates content from seed compounds, removes duplicate lines using SimHash,
          and reassembles unique content. Perfect for creating concise documentation or LLM context.
        </p>
      </div>
    </div>
  );
}
