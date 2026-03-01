import { useState, useEffect, useCallback, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import PerformanceMonitor from './components/PerformanceMonitor';
import { api } from './services/api';
import { GlassPanel } from './components/ui/GlassPanel';
import { Button } from './components/ui/Button';
import { SearchColumn } from './components/features/SearchColumn';
import { ResearchModal } from './components/features/ResearchModal';
import { QuarantinePage } from './components/features/QuarantinePage';
import { ChatInterface } from './components/Chat/ChatInterface';
import { ModelSelector } from './components/Chat/ModelSelector';
import { PathManager } from './components/features/PathManager';
import { GithubModal } from './components/features/GithubModal';
import { GitCommandsModal } from './components/features/GitCommandsModal';
import { navigate } from './utils/routing';

// Simple Router
const Dashboard = () => (
  <div className="flex-col-center" style={{ height: '100%', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
    <h1 style={{ fontSize: '3rem', background: 'linear-gradient(to right, #fff, #646cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Sovereign Context Engine
    </h1>
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button onClick={() => navigate('/search')}>
        Search Memories
      </Button>
      <Button onClick={() => navigate('/chat')}>
        Launch Chat
      </Button>

      <Button onClick={() => navigate('/quarantine')}>
        Infection Center
      </Button>
      <Button onClick={() => navigate('/paths')}>
        Manage Paths
      </Button>
    </div>
  </div>
);

// --- SEARCH PAGE CONTAINER ---
const SearchPage = () => {
  const [columns, setColumns] = useState<{ id: number; query?: string }[]>([{ id: 1 }]);

  // Global State
  const [backupStatus, setBackupStatus] = useState('');
  const [showResearch, setShowResearch] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [showGitCommands, setShowGitCommands] = useState(false);
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.getBuckets().catch(() => []),
      api.getTags().catch(() => [])
    ]).then(([buckets, tags]) => {
      setAvailableBuckets(Array.isArray(buckets) ? buckets : []);
      setAvailableTags(Array.isArray(tags) ? tags : []);
    });
  }, []);

  const addColumn = useCallback((initialQuery?: string) => {
    setColumns(prev => {
      if (prev.length >= 8) return prev;
      const newId = (prev.length > 0 ? Math.max(...prev.map(c => c.id)) : 0) + 1;
      return [...prev, { id: newId, query: initialQuery }];
    });
  }, []);

  const removeColumn = useCallback((id: number) => {
    console.log('[SearchPage] removeColumn called for ID:', id);
    setColumns(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleContextUpdate = useCallback((_id: number, _ctx: string) => {
    // Handle context updates if needed
  }, []);

  const handleFullUpdate = useCallback((_id: number, _full: string) => {
    // Handle full text updates if needed
  }, []);

  const handleBackup = async () => {
    setBackupStatus('Saving...');
    try {
      const data = await api.backup();
      setBackupStatus(`Saved: ${data.filename}`);
      setTimeout(() => setBackupStatus(''), 3000);
    } catch { setBackupStatus('Failed'); }
  };

  return (
    <div className="search-page-container" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

      {/* GLOBAL HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glass-shadow)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--bg-primary)' }}>anchor</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Anchor Engine
            </h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>v1.0.0-rc</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Button onClick={() => addColumn()} disabled={columns.length >= 8} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: 'rgba(59, 187, 247, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(59, 187, 247, 0.2)', borderRadius: 'var(--radius-full)', fontWeight: 500, transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>add</span>
            <span>Add Column</span>
          </Button>
          <Button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined">home</span>
          </Button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Instrument Panel (Sidebar) */}
        <aside style={{ width: '280px', background: 'rgba(15, 23, 42, 0.6)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', margin: 0 }}>System Controls</h3>

            <button onClick={handleBackup} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', width: '100%', color: 'var(--text-primary)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)' }}>save</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{backupStatus || 'Backup Output'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>State preservation</div>
              </div>
            </button>

            <button onClick={() => setShowResearch(true)} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', width: '100%', color: 'var(--text-primary)' }}>
              <span className="material-symbols-outlined" style={{ color: '#a78bfa' }}>travel_explore</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>Web Research</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Scrape & Ingest</div>
              </div>
            </button>

            <button onClick={() => setShowGithub(true)} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', width: '100%', color: 'var(--text-primary)' }}>
              <span className="material-symbols-outlined" style={{ color: '#34d399' }}>code_blocks</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>GitHub Ingestion</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Pull repository code</div>
              </div>
            </button>

            <button onClick={() => setShowGitCommands(true)} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', width: '100%', color: 'var(--text-primary)' }}>
              <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>terminal</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>Git Commands</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Manage git repos</div>
              </div>
            </button>

            <button onClick={() => navigate('/quarantine')} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', width: '100%', color: 'var(--text-primary)' }}>
              <span className="material-symbols-outlined" style={{ color: '#f87171' }}>coronavirus</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>Infection Center</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Quarantine atoms</div>
              </div>
            </button>

            <button onClick={() => navigate('/paths')} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', width: '100%', color: 'var(--text-primary)' }}>
              <span className="material-symbols-outlined" style={{ color: '#60a5fa' }}>folder_managed</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>Manage Paths</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Corpus directories</div>
              </div>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'hidden', background: 'radial-gradient(circle at top right, rgba(59, 187, 247, 0.05), transparent 50%)', position: 'relative' }}>
          {/* COLUMNS CONTAINER */}
          <div className="search-grid custom-scrollbar">
            {columns.map(col => (
              <SearchColumn
                key={col.id}
                id={col.id}
                availableBuckets={availableBuckets}
                availableTags={availableTags}
                onContextUpdate={handleContextUpdate}
                onFullUpdate={handleFullUpdate}
                onRemove={removeColumn}
                onAddColumn={addColumn}
                columnCount={columns.length}
                initialQuery={col.query}
              />
            ))}
          </div>
        </main>
      </div>

      {/* Research Modal */}
      {showResearch && <ResearchModal onClose={() => setShowResearch(false)} />}

      {/* Github Modal */}
      {showGithub && <GithubModal onClose={() => setShowGithub(false)} />}

      {/* Git Commands Modal */}
      {showGitCommands && <GitCommandsModal onClose={() => setShowGitCommands(false)} />}
    </div>
  );
};

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('pushstate', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('pushstate', onLocationChange);
    };
  }, []);

  const [selectedModel, setSelectedModel] = useState<string>('Llama-3-8B-Instruct-q4f32_1-MLC');
  const [useInferenceServer, setUseInferenceServer] = useState(false);

  if (currentPath === '/dashboard') return <Dashboard />;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-gray-300" style={{ background: 'var(--bg-primary)' }}>
      <PerformanceMonitor />

      <div style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 1000 }}>
        <Button onClick={() => navigate('/dashboard')} style={{ fontSize: '1.2rem', padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
          ←
        </Button>
      </div>

      {currentPath === '/chat' ? (
        <GlassPanel className="chat-page-container" style={{ margin: '1rem', padding: '1rem', height: 'calc(100% - 2rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Sovereign Agent Chat</h2>
            <div style={{ width: '300px' }}>
              <ModelSelector
                onModelChange={setSelectedModel}
                currentModel={selectedModel}
                isRemote={useInferenceServer}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatInterface
              model={selectedModel}
              useInferenceServer={useInferenceServer}
              setUseInferenceServer={setUseInferenceServer}
            />
          </div>
        </GlassPanel>
      ) : (
        <>
          {currentPath === '/' || currentPath === '/search' ? <SearchPage /> :
            currentPath === '/quarantine' ? <QuarantinePage /> :
              currentPath === '/paths' ? <PathManager /> :
                <div style={{ padding: '4rem 2rem' }}>🚧 Module "{currentPath}" Under Construction</div>}
        </>
      )}
    </div>
  );
}

export default App;

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
