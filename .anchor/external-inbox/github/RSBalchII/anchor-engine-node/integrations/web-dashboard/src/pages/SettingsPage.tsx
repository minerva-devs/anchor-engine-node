import { useState, useEffect } from 'react';
import { AnchorClient } from '@rbalchii/anchor-client';

const client = new AnchorClient('http://localhost:3160');

interface IngestionConfig {
  concept_density: 'low' | 'medium' | 'high';
  tag_threshold: number;
  dedup_strength: 'light' | 'medium' | 'aggressive';
  token_budget_default: number;
  ingestion_profile: 'code' | 'notes' | 'chat' | 'default';
}

export function SettingsPage() {
  const [config, setConfig] = useState<IngestionConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);

  // Load config on mount
  useEffect(() => {
    loadConfig();
    loadServerInfo();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await client.getIngestionConfig();
      setConfig(response.config);
    } catch (err: any) {
      setError('Failed to load config: ' + err.message);
    }
  };

  const loadServerInfo = async () => {
    try {
      const response = await fetch('http://localhost:3160/v1/system/server-info');
      const data = await response.json();
      setServerInfo(data.server_info);
    } catch (err: any) {
      console.error('Failed to load server info:', err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await client.setIngestionConfig(config);
      setSuccess('✅ Configuration saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to save config: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePresetChange = (preset: IngestionConfig['ingestion_profile']) => {
    if (!config) return;
    
    // Apply preset configurations
    const presets: Record<IngestionConfig['ingestion_profile'], Partial<IngestionConfig>> = {
      'default': {
        concept_density: 'medium',
        tag_threshold: 0.7,
        dedup_strength: 'medium',
        token_budget_default: 2000
      },
      'code': {
        concept_density: 'high',
        tag_threshold: 0.6,
        dedup_strength: 'light',
        token_budget_default: 3000
      },
      'notes': {
        concept_density: 'medium',
        tag_threshold: 0.7,
        dedup_strength: 'medium',
        token_budget_default: 2000
      },
      'chat': {
        concept_density: 'high',
        tag_threshold: 0.7,
        dedup_strength: 'aggressive',
        token_budget_default: 1500
      }
    };

    setConfig({
      ...config,
      ...presets[preset],
      ingestion_profile: preset
    });
  };

  if (!config) {
    return (
      <div className="card">
        <h2>⚙️ Settings</h2>
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>⚙️ Ingestion Settings</h2>
      <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
        Configure how Anchor Engine processes and ingests content
      </p>

      {/* Server Info */}
      {serverInfo && (
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1rem', 
          background: '#f0f9ff', 
          borderRadius: '8px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Server Status:</strong>{' '}
              <span style={{ color: serverInfo.is_running ? '#22c55e' : '#ef4444' }}>
                {serverInfo.is_running ? '● Running' : '○ Stopped'}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              v{serverInfo.version} • Port {serverInfo.port}
              {serverInfo.uptime_seconds > 0 && (
                <span> • Uptime: {formatUptime(serverInfo.uptime_seconds)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Preset Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', color: '#4a5568', fontWeight: '600' }}>
            🎯 Quick Preset:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
            {[
              { value: 'default', label: '📌 Default', desc: 'Balanced settings' },
              { value: 'code', label: '💻 Code', desc: 'High detail' },
              { value: 'notes', label: '📝 Notes', desc: 'Medium detail' },
              { value: 'chat', label: '💬 Chat', desc: 'Aggressive dedup' }
            ].map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={config.ingestion_profile === preset.value ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => handlePresetChange(preset.value as IngestionConfig['ingestion_profile'])}
                style={{ textAlign: 'left', padding: '0.75rem' }}
              >
                <div style={{ fontWeight: 'bold' }}>{preset.label}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Concept Density */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="concept_density" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568', fontWeight: '600' }}>
            📊 Concept Density: <strong style={{ color: '#667eea' }}>{config.concept_density.toUpperCase()}</strong>
          </label>
          <select
            id="concept_density"
            value={config.concept_density}
            onChange={(e) => setConfig({ ...config, concept_density: e.target.value as IngestionConfig['concept_density'] })}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
          >
            <option value="low">Low - Extract fewer concepts (faster, less detailed)</option>
            <option value="medium">Medium - Balanced extraction</option>
            <option value="high">High - Extract maximum concepts (slower, more detailed)</option>
          </select>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
            Controls how many concepts and tags wink-nlp extracts from content
          </p>
        </div>

        {/* Tag Threshold */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="tag_threshold" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568', fontWeight: '600' }}>
            🏷️ Tag Confidence Threshold: <strong style={{ color: '#667eea' }}>{config.tag_threshold.toFixed(2)}</strong>
          </label>
          <input
            id="tag_threshold"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.tag_threshold}
            onChange={(e) => setConfig({ ...config, tag_threshold: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
            <span>0.0 (accept all)</span>
            <span>1.0 (only highest confidence)</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
            Minimum confidence score for tag extraction
          </p>
        </div>

        {/* Dedup Strength */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="dedup_strength" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568', fontWeight: '600' }}>
            🔄 Deduplication Strength: <strong style={{ color: '#667eea' }}>{config.dedup_strength.toUpperCase()}</strong>
          </label>
          <select
            id="dedup_strength"
            value={config.dedup_strength}
            onChange={(e) => setConfig({ ...config, dedup_strength: e.target.value as IngestionConfig['dedup_strength'] })}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
          >
            <option value="light">Light - Minimal deduplication (preserve more content)</option>
            <option value="medium">Medium - Balanced deduplication</option>
            <option value="aggressive">Aggressive - Maximum deduplication (remove redundancy)</option>
          </select>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
            Controls how aggressively similar content is merged during ingestion
          </p>
        </div>

        {/* Token Budget */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="token_budget_default" style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568', fontWeight: '600' }}>
            💰 Default Token Budget: <strong style={{ color: '#667eea' }}>{config.token_budget_default.toLocaleString()}</strong> tokens
          </label>
          <input
            id="token_budget_default"
            type="range"
            min="500"
            max="10000"
            step="100"
            value={config.token_budget_default}
            onChange={(e) => setConfig({ ...config, token_budget_default: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
            <span>500</span>
            <span>10,000</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
            Default maximum tokens returned by search queries
          </p>
        </div>

        {/* Save Button */}
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={saving}
          style={{ width: '100%' }}
        >
          {saving ? '⏳ Saving...' : '💾 Save Configuration'}
        </button>
      </form>

      {success && <div className="success" style={{ marginTop: '1rem' }}>{success}</div>}
      {error && <div className="error" style={{ marginTop: '1rem' }}>{error}</div>}

      {/* Help Section */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f7fafc', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#4a5568' }}>💡 When to Use Each Preset:</h4>
        <ul style={{ fontSize: '0.875rem', color: '#718096', paddingLeft: '1.5rem', lineHeight: 1.8 }}>
          <li><strong>Default:</strong> General-purpose ingestion, good for most use cases</li>
          <li><strong>Code:</strong> Source code, technical documentation, API specs (high concept density, low dedup)</li>
          <li><strong>Notes:</strong> Personal notes, meeting notes, ideas (balanced settings)</li>
          <li><strong>Chat:</strong> Chat logs, conversations (high dedup to remove repetitive messages)</li>
        </ul>
      </div>

      {/* API Reference */}
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#edf2f7', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
        <strong>API Endpoints:</strong>
        <div style={{ marginTop: '0.5rem' }}>
          <div>GET /v1/config/ingestion - Get current config</div>
          <div>POST /v1/config/ingestion - Update config</div>
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
