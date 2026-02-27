import { useState, useEffect, useCallback, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import PerformanceMonitor from './components/PerformanceMonitor';
import { api } from './services/api';
import { GlassPanel } from './components/ui/GlassPanel';
import { Button } from './components/ui/Button';
import { SearchColumn } from './components/features/SearchColumn';
import { QuarantinePage } from './components/features/QuarantinePage';
import { ChatInterface } from './components/Chat/ChatInterface';
import { ModelSelector } from './components/Chat/ModelSelector';
import { PathManager } from './components/features/PathManager';
import { Navbar } from './components/layout/Navbar';
import { navigate } from './utils/routing';

// ...



// ... (existing imports)

// ... (existing imports)

// ... (imports)

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

  return (
    <div className="search-page-container" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

      {/* Navbar with all system actions */}
      <Navbar 
        customButtons={
          <Button 
            onClick={() => addColumn()} 
            disabled={columns.length >= 8} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.6rem 1.2rem',
              background: 'rgba(59, 187, 247, 0.1)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(59, 187, 247, 0.2)',
              borderRadius: 'var(--radius-full)',
              fontWeight: 500
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>add</span>
            <span>Add Column</span>
          </Button>
        }
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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

      {/* Navbar for all routes */}
      <Navbar showBackButton />

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