import { useState } from 'react';
import { SearchPage } from './pages/SearchPage';
import { IngestPage } from './pages/IngestPage';
import { DistillPage } from './pages/DistillPage';
import { SettingsPage } from './pages/SettingsPage';

type Page = 'search' | 'ingest' | 'distill' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('search');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>⚓ Anchor Dashboard</h1>
          <p className="subtitle">Semantic Memory for LLMs</p>
        </div>
        <nav className="app-nav">
          <button
            className={currentPage === 'search' ? 'active' : ''}
            onClick={() => setCurrentPage('search')}
          >
            🔍 Search
          </button>
          <button
            className={currentPage === 'ingest' ? 'active' : ''}
            onClick={() => setCurrentPage('ingest')}
          >
            📥 Ingest
          </button>
          <button
            className={currentPage === 'distill' ? 'active' : ''}
            onClick={() => setCurrentPage('distill')}
          >
            💎 Distill
          </button>
          <button
            className={currentPage === 'settings' ? 'active' : ''}
            onClick={() => setCurrentPage('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentPage === 'search' && <SearchPage />}
        {currentPage === 'ingest' && <IngestPage />}
        {currentPage === 'distill' && <DistillPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>

      <footer className="app-footer">
        <p>
          Powered by <a href="https://github.com/RSBalchII/anchor-engine-node" target="_blank">Anchor Engine v4.8.2</a>
          {' '}• <a href="https://github.com/RSBalchII/anchor-engine-node/tree/main/integrations/web-dashboard" target="_blank">Source</a>
        </p>
      </footer>
    </div>
  );
}
