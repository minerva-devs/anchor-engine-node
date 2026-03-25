import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { navigate } from '../../utils/routing';

export const PathManager = () => {
    const [paths, setPaths] = useState<string[]>([]);
    const [newPath, setNewPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Paste & Ingest state
    const [showPasteIngest, setShowPasteIngest] = useState(false);
    const [pasteContent, setPasteContent] = useState('');
    const [pasteFilename, setPasteFilename] = useState('');
    const [pasteBucket, setPasteBucket] = useState<'inbox' | 'external-inbox'>('external-inbox');
    const [pasteLoading, setPasteLoading] = useState(false);
    const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

    const fetchPaths = async () => {
        try {
            const response = await api.getPaths();
            if (response.paths) {
                setPaths(response.paths);
            }
        } catch (err) {
            console.error('Failed to fetch paths', err);
        }
    };

    useEffect(() => {
        fetchPaths();
    }, []);

    const handleAddPath = async () => {
        if (!newPath.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.addPath(newPath);
            // Handle both success and warning statuses (warning is still a success for external paths)
            if (res.status === 'success' || res.status === 'warning') {
                setNewPath('');
                fetchPaths();
                // Show warning message if present
                if (res.status === 'warning' && res.message) {
                    console.warn('Path added with warning:', res.message);
                }
            } else {
                setError(res.message || 'Failed to add path');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add path');
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePath = async (pathToRemove: string) => {
        if (!confirm(`Are you sure you want to stop watching this path?\n\n${pathToRemove}\n\nNote: Existing data will remain in the database.`)) return;

        setLoading(true);
        setError(null);
        try {
            const res = await api.removePath(pathToRemove);
            if (res.status === 'success') {
                fetchPaths();
            } else {
                setError(res.message || 'Failed to remove path');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to remove path');
        } finally {
            setLoading(false);
        }
    };

    const handlePasteIngest = async () => {
        if (!pasteContent.trim() || !pasteFilename.trim()) return;
        
        setPasteLoading(true);
        setPasteSuccess(null);
        
        try {
            const res = await api.post('/v1/research/upload-raw', {
                content: pasteContent,
                filename: pasteFilename,
                bucket: pasteBucket
            });
            
            if (res.status === 'success') {
                setPasteSuccess(`✅ Successfully ingested "${pasteFilename}" (${pasteContent.length.toLocaleString()} chars)`);
                setPasteContent('');
                setPasteFilename('');
            } else {
                setError(res.message || 'Failed to ingest content');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to ingest content');
        } finally {
            setPasteLoading(false);
            setTimeout(() => setPasteSuccess(null), 5000);
        }
    };

    return (
        <GlassPanel className="path-manager-container" style={{ margin: '1rem', padding: '1rem', height: 'calc(100% - 2rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Corpus Ingestion</h2>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        📁 Manage watch paths OR 📋 Paste text directly
                    </p>
                </div>
                <Button onClick={() => navigate('/dashboard')} style={{ fontSize: '0.8rem', padding: '0.4rem', border: '1px solid var(--border-subtle)' }}>
                    ⬅ Back to Dashboard
                </Button>
            </div>

            {/* Tab Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setShowPasteIngest(false)}
                    style={{
                        padding: '0.5rem 1rem',
                        background: !showPasteIngest ? 'var(--accent-primary)' : 'transparent',
                        color: !showPasteIngest ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500
                    }}
                >
                    📁 Watch Paths
                </button>
                <button
                    onClick={() => setShowPasteIngest(true)}
                    style={{
                        padding: '0.5rem 1rem',
                        background: showPasteIngest ? 'var(--accent-primary)' : 'transparent',
                        color: showPasteIngest ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500
                    }}
                >
                    📋 Paste & Ingest
                </button>
            </div>

            {/* Paste & Ingest Section */}
            {showPasteIngest && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
                    <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>📋 Quick Ingest</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Paste any text (notes, chats, articles) and ingest it directly into your knowledge graph.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={pasteFilename}
                            onChange={(e) => setPasteFilename(e.target.value)}
                            placeholder="Filename (e.g., meeting-notes.md)"
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border-subtle)',
                                color: 'white',
                                borderRadius: '4px'
                            }}
                        />
                        <select
                            value={pasteBucket}
                            onChange={(e) => setPasteBucket(e.target.value as 'inbox' | 'external-inbox')}
                            style={{
                                padding: '0.5rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border-subtle)',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="inbox">👑 inbox (my content)</option>
                            <option value="external-inbox">🌐 external-inbox (external)</option>
                        </select>
                    </div>

                    <textarea
                        value={pasteContent}
                        onChange={(e) => setPasteContent(e.target.value)}
                        placeholder="Paste your text here... (supports markdown, plain text, code, etc.)"
                        style={{
                            flex: 1,
                            minHeight: '300px',
                            padding: '0.8rem',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--border-subtle)',
                            color: 'white',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            resize: 'vertical'
                        }}
                    />

                    {pasteSuccess && (
                        <div style={{ padding: '0.8rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '4px', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            {pasteSuccess}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button 
                            onClick={handlePasteIngest} 
                            disabled={pasteLoading || !pasteContent.trim() || !pasteFilename.trim()}
                            style={{ flex: 1, padding: '0.8rem' }}
                        >
                            {pasteLoading ? '⏳ Ingesting...' : '✅ Ingest Content'}
                        </Button>
                    </div>

                    <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,0,0.05)', borderRadius: '4px', fontSize: '0.85rem', color: '#ccc' }}>
                        ℹ️ <strong>Bucket Guide:</strong> Use <strong>inbox</strong> for content you created (notes, thoughts, code). 
                        Use <strong>external-inbox</strong> for external content (articles, scrapes, imports). 
                        Sovereign content gets a 3.0x retrieval boost.
                    </div>
                </div>
            )}

            {/* Watch Paths Section (Original) */}
            {!showPasteIngest && (
                <>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder="Enter absolute path to watch (e.g. C:\Users\Name\Docs)"
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-subtle)',
                        color: 'white',
                        borderRadius: '4px'
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPath()}
                />
                <Button onClick={handleAddPath} disabled={loading || !newPath}>
                    {loading ? 'Adding...' : 'Add Path'}
                </Button>
            </div>

            {error && <div style={{ color: '#ff6b6b', padding: '0.5rem', background: 'rgba(255,0,0,0.1)', borderRadius: '4px' }}>{error}</div>}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>Active Watchers</h3>
                {paths.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'gray' }}>No paths configured. Defaulting to Internal Notebook.</div>
                ) : (
                    paths.map((path, idx) => (
                        <div key={idx} style={{
                            padding: '0.8rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                📁 <span style={{ fontFamily: 'monospace' }}>{path}</span>
                            </div>

                            {path.includes('notebook') ? (
                                <span style={{ fontSize: '0.7rem', background: 'var(--accent-primary)', padding: '0.2rem 0.4rem', borderRadius: '4px', opacity: 0.8 }}>SYSTEM</span>
                            ) : (
                                <Button
                                    onClick={() => handleRemovePath(path)}
                                    disabled={loading}
                                    style={{
                                        fontSize: '0.7rem',
                                        padding: '0.2rem 0.5rem',
                                        background: 'rgba(255, 100, 100, 0.2)',
                                        border: '1px solid rgba(255, 100, 100, 0.4)',
                                        color: '#ffaaaa'
                                    }}
                                >
                                    Remove
                                </Button>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,0,0.05)', borderRadius: '4px', fontSize: '0.9rem', color: '#ccc' }}>
                ℹ️ <strong>Note:</strong> Adding a path will trigger the Watchdog to scan recursively.
                Files in these directories will be atomized and ingested into the Knowledge Graph.
                The system watches for changes in real-time.
            </div>
                </>
            )}
        </GlassPanel>
    );
};
