import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface GithubModalProps {
    onClose: () => void;
}

export const GithubModal: React.FC<GithubModalProps> = ({ onClose }) => {
    const [repoUrl, setRepoUrl] = useState('');
    const [bucket, setBucket] = useState('');
    const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        // Fetch available buckets to populate the dropdown
        api.getBuckets()
            .then(buckets => {
                if (Array.isArray(buckets)) {
                    setAvailableBuckets(buckets);
                    if (buckets.length > 0) {
                        setBucket(buckets[0]);
                    }
                }
            })
            .catch(err => console.error("Failed to load buckets", err));
    }, []);

    const handleIngest = async () => {
        if (!repoUrl.trim()) {
            setStatusMessage("Error: Repository URL is required.");
            return;
        }

        if (!bucket.trim()) {
            setStatusMessage("Error: Target Bucket is required.");
            return;
        }

        setLoading(true);
        setStatusMessage("Initiating ingestion...");

        try {
            const data = await api.ingestGithubRepo(repoUrl, bucket);
            if (data.status === 'ingesting' || data.id) {
                setStatusMessage(`Success! Started ingestion for ${repoUrl}. You can close this window.`);
                setRepoUrl(''); // Clear input on success
            } else {
                setStatusMessage(`Error: ${data.error || "Unknown error occurred"}`);
            }
        } catch (e: any) {
            setStatusMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <GlassPanel style={{ width: '500px', padding: '1.5rem', background: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>GitHub Repository Ingestion</h3>
                    <Button variant="icon" onClick={onClose} style={{ fontSize: '1.2rem', color: 'white' }}>✕</Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="github-url" style={{ fontSize: '0.9rem', color: '#ccc' }}>Repository URL</label>
                    <Input
                        id="github-url"
                        placeholder="https://github.com/owner/repo"
                        value={repoUrl}
                        onChange={e => setRepoUrl(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="target-bucket" style={{ fontSize: '0.9rem', color: '#ccc' }}>Target Bucket</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                            id="target-bucket"
                            value={bucket}
                            onChange={e => setBucket(e.target.value)}
                            style={{ flex: 1, padding: '0.5rem', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                        >
                            <option value="">Select a bucket...</option>
                            {availableBuckets.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                    {availableBuckets.length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Warning: No buckets available. Ensure the backend is running.</div>
                    )}
                </div>

                {statusMessage && (
                    <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        background: statusMessage.startsWith('Error') ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)',
                        border: `1px solid ${statusMessage.startsWith('Error') ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)'}`,
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        color: statusMessage.startsWith('Error') ? '#ff6b6b' : '#51cf66'
                    }}>
                        {statusMessage}
                    </div>
                )}

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleIngest} disabled={loading || !repoUrl || !bucket}>
                        {loading ? 'Ingesting...' : 'Fetch & Ingest'}
                    </Button>
                </div>
            </GlassPanel>
        </div>
    );
};
