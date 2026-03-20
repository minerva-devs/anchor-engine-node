import { useState } from 'react';
import { AnchorClient } from '@rbalchii/anchor-client';

const client = new AnchorClient('http://localhost:3160');

export function IngestPage() {
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('');
  const [bucket, setBucket] = useState<'inbox' | 'external-inbox'>('external-inbox');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePasteIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !filename.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await client.ingestText(content, filename, bucket);
      setSuccess(`✅ Successfully ingested "${filename}" (${content.length.toLocaleString()} chars)`);
      setContent('');
      setFilename('');
    } catch (err: any) {
      setError(err.message || 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await client.ingestFile(filename, bucket);
      setSuccess(`✅ Successfully ingested file: ${filename}`);
      setFilename('');
    } catch (err: any) {
      setError(err.message || 'File ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>📥 Ingest Data</h2>
      <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
        Add content to your knowledge graph
      </p>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <button
          className={mode === 'paste' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setMode('paste')}
        >
          📋 Paste Text
        </button>
        <button
          className={mode === 'file' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setMode('file')}
        >
          📁 File Path
        </button>
      </div>

      {/* Bucket Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="bucket" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568' }}>
          Bucket:
        </label>
        <select
          id="bucket"
          value={bucket}
          onChange={(e) => setBucket(e.target.value as 'inbox' | 'external-inbox')}
        >
          <option value="inbox">👑 inbox (my content - 3.0x retrieval boost)</option>
          <option value="external-inbox">🌐 external-inbox (external content)</option>
        </select>
        <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
          Use <strong>inbox</strong> for content you created (notes, thoughts, code).
          Use <strong>external-inbox</strong> for external content (articles, imports).
        </p>
      </div>

      {mode === 'paste' ? (
        <form onSubmit={handlePasteIngest}>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Filename (e.g., meeting-notes.md)"
            style={{ marginBottom: '1rem' }}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your text here... (supports markdown, plain text, code, etc.)"
            rows={12}
            style={{ marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.9rem' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !content.trim() || !filename.trim()}>
            {loading ? '⏳ Ingesting...' : '✅ Ingest Content'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleFileIngest}>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Absolute file path (e.g., /home/user/documents/notes.md)"
            style={{ marginBottom: '1rem' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !filename.trim()}>
            {loading ? '⏳ Ingesting...' : '✅ Ingest File'}
          </button>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '1rem' }}>
            ⚠️ Note: File ingestion only works when the engine is running locally.
            The file must exist on the same machine as the engine.
          </p>
        </form>
      )}

      {success && <div className="success">{success}</div>}
      {error && <div className="error">{error}</div>}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f7fafc', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#4a5568' }}>💡 Tips:</h4>
        <ul style={{ fontSize: '0.875rem', color: '#718096', paddingLeft: '1.5rem', lineHeight: 1.8 }}>
          <li>Use descriptive filenames for easier retrieval</li>
          <li>Break large documents into smaller chunks for better atomization</li>
          <li>Markdown formatting is preserved</li>
          <li>Code blocks are automatically detected and tagged</li>
        </ul>
      </div>
    </div>
  );
}
