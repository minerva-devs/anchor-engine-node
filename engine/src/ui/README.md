# Anchor Search UI

Modern, high-performance search UI for Anchor Engine, powered by C++ FFI backend.

## Features

- **Fast C++ Backend**: Direct DLL loading via Koffi FFI
- **Clean Layout**: Results on left (2/3), search panel on right (1/3)
- **Toggleable Buckets**: Click to enable/disable search scopes
- **Tag Dropdown**: Collapsible tag list for filtering
- **Live Counters**: Results, chars, sources displayed in real-time
- **Keyboard Shortcuts**: Enter to search, Shift+Enter for new line

## Installation

```bash
cd engine
npm install
```

This installs:
- `solid-js` - UI framework
- `koffi` - FFI library for calling C++ DLL

## Build C++ Core

Before using the UI, build the C++ core:

```bash
cd cpp
.\build.bat --with-napi
```

This creates `cpp/build/Release/anchor_core.dll`.

## Usage

### Development

```bash
# Start the engine server
npm start

# Open UI in browser
start src/ui/index.html
```

### Programmatic Usage

```typescript
import { anchor } from './core/anchor-core-ffi';

// Initialize
await anchor.init('./context.db');

// Search
const results = anchor.search('quantum computing', 100);

// Get stats
const stats = anchor.getStats();
console.log(`Atoms: ${stats.atom_count}`);

// Cleanup
await anchor.destroy();
```

## Architecture

```
┌─────────────────────────────────────────┐
│          Browser (Solid.js)             │
│  SearchPage Component                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  anchor-core-ffi.ts (Koffi FFI)         │
│  - Load anchor_core.dll                 │
│  - Marshal data (JSON)                  │
│  - Manage resources                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  anchor_core.dll (C++17)                │
│  - Database (SQLite3)                   │
│  - PhysicsWalker                        │
│  - ContextInflator                      │
│  - Deduplicator                         │
│  - TransientFilter                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  context.db (SQLite3)                   │
└─────────────────────────────────────────┘
```

## File Structure

```
engine/src/ui/
├── index.html          # Entry point
├── search-page.tsx     # Solid.js component (integrated with FFI)
├── search-ui.tsx       # Base UI component (standalone)
├── search-demo.html    # Pure HTML/JS demo (no build needed)
└── README.md           # This file

engine/src/core/
├── anchor-core-ffi.ts  # Koffi FFI wrapper
└── sqlite-database.ts  # Alternative SQLite adapter
```

## Layout

```
┌─────────────────────────┬─────────────┐
│                         │  Search     │
│   Results (2/3)         │   Panel     │
│                         │  (1/3)      │
│ ┌─────────────────────┐ │  - Query    │
│ │ Stats               │ │  - Buckets  │
│ │ 3 results | 2.5k    │ │  - Tags     │
│ │ chars | 2 sources   │ │             │
│ └─────────────────────┘ │             │
│                         │             │
│ ┌─────────────────────┐ │             │
│ │ Result Card         │ │             │
│ │ Source: notes.md    │ │             │
│ │ Content...          │ │             │
│ │ [tags]              │ │             │
│ └─────────────────────┘ │             │
└─────────────────────────┴─────────────┘
```

## API Reference

### AnchorCoreFFI

```typescript
class AnchorCoreFFI {
  // Initialize database
  init(dbPath?: string): Promise<void>
  
  // Cleanup
  destroy(): Promise<void>
  
  // Search atoms
  search(query: string, limit?: number): any[]
  
  // Insert atom
  insertAtom(sourceId: string, content: string, ...): number
  
  // Get stats
  getStats(): { atom_count: number, source_count: number, tag_count: number }
  
  // Graph traversal
  radialInflation(anchorIds: number[], limit?: number, threshold?: number): any[]
  
  // Context expansion
  inflateContext(atomIds: number[], maxChars?: number): any[]
  
  // Deduplication
  deduplicate(candidates: any[]): any[]
  
  // Noise filtering
  filterTransient(atoms: any[]): any[]
}
```

## Troubleshooting

### "DLL not found"
```bash
# Rebuild C++ core
cd cpp
.\build.bat --with-napi
```

### "Failed to initialize database"
```bash
# Ensure database directory exists
mkdir engine\context_data
```

### Koffi installation fails
```bash
# Use legacy peer deps
npm install koffi --legacy-peer-deps
```

## Performance

| Operation | Node.js (PGlite) | C++ (SQLite3) | Improvement |
|-----------|------------------|---------------|-------------|
| Search (p95) | 150-200ms | <50ms | 3-4x faster |
| Memory | 900MB RSS | <200MB RSS | 4.5x less |
| Ingestion | 1x | 2x | 2x faster |

## License

AGPL-3.0
