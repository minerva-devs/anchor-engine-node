# Refactoring Guide for Large Files

**Version:** 4.9.5 | **Last Updated:** 2026-03-25

Guidelines and patterns for refactoring large files in the Anchor Engine codebase.

---

## Table of Contents

- [Overview](#overview)
- [File Size Limits](#file-size-limits)
- [Refactoring Patterns](#refactoring-patterns)
- [Module Extraction](#module-extraction)
- [Class Decomposition](#class-decomposition)
- [Function Extraction](#function-extraction)
- [Configuration Management](#configuration-management)
- [Testing Refactored Code](#testing-refactored-code)
- [Tools and Automation](#tools-and-automation)

---

## Overview

Large files are harder to:
- **Understand** - Too much cognitive load
- **Test** - Complex dependencies and side effects
- **Maintain** - Change risk increases with size
- **Review** - PRs become unmanageable

This guide provides patterns for safely refactoring large files while maintaining functionality.

---

## File Size Limits

### Anchor Engine Standards

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Lines of Code** | >500 | Consider splitting |
| **Lines of Code** | >1000 | Should split |
| **Functions** | >50 lines | Extract sub-functions |
| **Classes** | >300 lines | Decompose |
| **Imports** | >20 | Consider module grouping |
| **Exports** | >15 | Consider interface segregation |

### Standard 001: Memory-Safe Ingestion

For ingestion-related files, additional limits apply:

| Limit | Value | Rationale |
|-------|-------|-----------|
| **File Size** | 10 MB max | Prevents OOM during ingestion |
| **Molecule Count** | 10,000 max | Prevents memory spikes |

---

## Refactoring Patterns

### Pattern 1: Extract Module

**Before:**
```typescript
// engine/src/services/search.ts (800 lines)
import { Database } from '../core/db';
import { Config } from '../config';
// ... 15 more imports

export class SearchService {
  // 50 methods, 800 lines
}
```

**After:**
```typescript
// engine/src/services/search/index.ts
export { SearchService } from './search-service';
export { SearchStrategy } from './search-strategy';
export { SearchResults } from './search-results';

// engine/src/services/search/search-service.ts (200 lines)
export class SearchService {
  // Core service logic only
}

// engine/src/services/search/search-strategy.ts (150 lines)
export class SearchStrategy {
  // Strategy patterns
}

// engine/src/services/search/search-results.ts (100 lines)
export class SearchResults {
  // Result handling
}
```

---

### Pattern 2: Extract Helper Functions

**Before:**
```typescript
// engine/src/services/ingest.ts
export async function ingestFile(path: string) {
  // 50 lines: read file
  const content = await fs.readFile(path, 'utf-8');
  // ...
  
  // 100 lines: parse content
  const molecules = [];
  for (const line of content.split('\n')) {
    // complex parsing logic
  }
  // ...
  
  // 75 lines: validate molecules
  const valid = molecules.filter(m => {
    // complex validation
  });
  // ...
  
  // 80 lines: store in database
  for (const molecule of valid) {
    // database operations
  }
  // ...
}
```

**After:**
```typescript
// engine/src/services/ingest.ts
export async function ingestFile(path: string) {
  const content = await readFileContent(path);
  const molecules = parseContent(content);
  const valid = validateMolecules(molecules);
  await storeMolecules(valid);
}

// engine/src/services/ingest/read-file.ts
export async function readFileContent(path: string): Promise<string> {
  return fs.readFile(path, 'utf-8');
}

// engine/src/services/ingest/parse-content.ts
export function parseContent(content: string): Molecule[] {
  const molecules = [];
  for (const line of content.split('\n')) {
    // parsing logic
  }
  return molecules;
}

// engine/src/services/ingest/validate-molecules.ts
export function validateMolecules(molecules: Molecule[]): Molecule[] {
  return molecules.filter(m => {
    // validation logic
  });
}

// engine/src/services/ingest/store-molecules.ts
export async function storeMolecules(molecules: Molecule[]): Promise<void> {
  // database operations
}
```

---

### Pattern 3: Extract Configuration

**Before:**
```typescript
// engine/src/services/search.ts
export class SearchService {
  private readonly TOKEN_BUDGET_DEFAULT = 2048;
  private readonly MAX_CHARS_DEFAULT = 8192;
  private readonly MAX_RESULTS_DEFAULT = 50;
  private readonly STRATEGY_STANDARD = 'standard';
  private readonly STRATEGY_MAX_RECALL = 'max-recall';
  private readonly STRATEGY_EXACT = 'exact';
  private readonly GAMMA = 0.85;
  private readonly LAMBDA = 0.001;
  // ... 20 more constants
  
  search(query: string, options: SearchOptions) {
    // uses constants throughout
  }
}
```

**After:**
```typescript
// engine/src/services/search/search-config.ts
export const SEARCH_CONFIG = {
  defaults: {
    tokenBudget: 2048,
    maxChars: 8192,
    maxResults: 50,
  },
  strategies: {
    STANDARD: 'standard',
    MAX_RECALL: 'max-recall',
    EXACT: 'exact',
  },
  physics: {
    GAMMA: 0.85,
    LAMBDA: 0.001,
  },
} as const;

// engine/src/services/search/search-service.ts
import { SEARCH_CONFIG } from './search-config';

export class SearchService {
  search(query: string, options: SearchOptions) {
    const budget = options.tokenBudget ?? SEARCH_CONFIG.defaults.tokenBudget;
    // ...
  }
}
```

---

## Module Extraction

### Step-by-Step Process

1. **Identify Cohesive Units**
   - Look for groups of related functions
   - Find clusters of constants
   - Identify self-contained logic blocks

2. **Create New Module File**
   ```bash
   # Create directory structure
   mkdir -p engine/src/services/search
   
   # Move related code
   mv engine/src/services/search.ts engine/src/services/search/search-service.ts
   ```

3. **Update Imports**
   ```typescript
   // Before
   import { SearchService } from './services/search';
   
   // After
   import { SearchService } from './services/search/search-service';
   ```

4. **Create Index File**
   ```typescript
   // engine/src/services/search/index.ts
   export { SearchService } from './search-service';
   export { SearchStrategy } from './search-strategy';
   export { SEARCH_CONFIG } from './search-config';
   ```

5. **Run Tests**
   ```bash
   pnpm test -- --testPathPattern=search
   ```

---

### Module Boundaries

**Good Boundaries:**
- ✅ By feature (search, ingest, distill)
- ✅ By layer (services, core, utils)
- ✅ By responsibility (parsing, validation, storage)

**Bad Boundaries:**
- ❌ Arbitrary line counts
- ❌ By file type (all interfaces together)
- ❌ Circular dependencies

---

## Class Decomposition

### Strategy Pattern

**Before:**
```typescript
// engine/src/services/search.ts
export class SearchService {
  search(query: string, strategy: string) {
    if (strategy === 'standard') {
      // 100 lines: standard search
    } else if (strategy === 'max-recall') {
      // 150 lines: max-recall search
    } else if (strategy === 'exact') {
      // 75 lines: exact search
    }
  }
}
```

**After:**
```typescript
// engine/src/services/search/strategies/search-strategy.ts
export interface SearchStrategy {
  search(query: string, options: SearchOptions): Promise<SearchResults>;
}

// engine/src/services/search/strategies/standard-strategy.ts
export class StandardStrategy implements SearchStrategy {
  search(query: string, options: SearchOptions): Promise<SearchResults> {
    // Standard search implementation
  }
}

// engine/src/services/search/strategies/max-recall-strategy.ts
export class MaxRecallStrategy implements SearchStrategy {
  search(query: string, options: SearchOptions): Promise<SearchResults> {
    // Max-recall implementation
  }
}

// engine/src/services/search/strategies/exact-strategy.ts
export class ExactStrategy implements SearchStrategy {
  search(query: string, options: SearchOptions): Promise<SearchResults> {
    // Exact search implementation
  }
}

// engine/src/services/search/search-service.ts
export class SearchService {
  private strategies: Record<string, SearchStrategy>;
  
  constructor() {
    this.strategies = {
      standard: new StandardStrategy(),
      'max-recall': new MaxRecallStrategy(),
      exact: new ExactStrategy(),
    };
  }
  
  search(query: string, strategy: string) {
    return this.strategies[strategy].search(query, {});
  }
}
```

---

### Composition Over Inheritance

**Before:**
```typescript
// engine/src/core/database.ts (500 lines)
export class Database {
  // 50 methods for different operations
  async connect() { /* 20 lines */ }
  async disconnect() { /* 15 lines */ }
  async ingest() { /* 40 lines */ }
  async search() { /* 50 lines */ }
  async distill() { /* 60 lines */ }
  async illuminate() { /* 45 lines */ }
  // ... 44 more methods
}
```

**After:**
```typescript
// engine/src/core/database.ts
export class Database {
  private connection: ConnectionManager;
  private ingestion: IngestionManager;
  private search: SearchManager;
  private distillation: DistillationManager;
  
  constructor(config: DatabaseConfig) {
    this.connection = new ConnectionManager(config);
    this.ingestion = new IngestionManager(config);
    this.search = new SearchManager(config);
    this.distillation = new DistillationManager(config);
  }
  
  // Delegate to managers
  async connect() { return this.connection.connect(); }
  async ingest(data: Data) { return this.ingestion.ingest(data); }
  async search(query: string) { return this.search.search(query); }
}

// engine/src/core/connection-manager.ts
export class ConnectionManager {
  async connect() { /* connection logic */ }
  async disconnect() { /* disconnect logic */ }
}

// engine/src/core/ingestion-manager.ts
export class IngestionManager {
  async ingest(data: Data) { /* ingestion logic */ }
}
```

---

## Function Extraction

### Identify Extraction Candidates

**Signs a function needs extraction:**

1. **Too Long:**
   ```typescript
   // ❌ Bad: 100+ lines
   export async function processIngestion(data: any) {
     // Step 1: validate (30 lines)
     // Step 2: parse (40 lines)
     // Step 3: transform (50 lines)
     // Step 4: store (30 lines)
   }
   ```

2. **Deep Nesting:**
   ```typescript
   // ❌ Bad: 5+ levels of nesting
   export function process(data: any) {
     if (condition1) {
       for (const item of data) {
         if (condition2) {
           switch (type) {
             case 'a':
               // 20 lines
           }
         }
       }
     }
   }
   ```

3. **Multiple Responsibilities:**
   ```typescript
   // ❌ Bad: does too much
   export async function handleRequest(req: Request) {
     // Parse request (15 lines)
     // Validate input (20 lines)
     // Query database (30 lines)
     // Format response (15 lines)
     // Log metrics (10 lines)
   }
   ```

---

### Extraction Process

**Before:**
```typescript
export async function ingestAndIndexFile(
  path: string,
  bucket: string,
  options: IngestOptions
): Promise<IngestResult> {
  // Validate file exists
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  
  // Check file size
  const stats = fs.statSync(path);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${stats.size} bytes`);
  }
  
  // Read file content
  const content = await fs.promises.readFile(path, 'utf-8');
  
  // Parse into molecules
  const molecules = content
    .split('\n')
    .filter(line => line.trim())
    .map((line, index) => ({
      id: `mol_${Date.now()}_${index}`,
      content: line,
      source: path,
      bucket,
      timestamp: new Date().toISOString()
    }));
  
  // Validate molecules
  const validMolecules = molecules.filter(m => {
    return m.content.length > 0 && 
           m.content.length < MAX_MOLECULE_SIZE &&
           isValidUtf8(m.content);
  });
  
  // Store in database
  const inserted = await db.transaction(async (tx) => {
    const results = [];
    for (const molecule of validMolecules) {
      const result = await tx.query(
        'INSERT INTO molecules (...) VALUES (...)',
        [molecule.id, molecule.content, molecule.source]
      );
      results.push(result);
    }
    return results;
  });
  
  // Log metrics
  logger.info('Ingestion complete', {
    path,
    molecules: validMolecules.length,
    inserted: inserted.length
  });
  
  return {
    success: true,
    moleculesIngested: validMolecules.length,
    path
  };
}
```

**After:**
```typescript
// engine/src/services/ingest/ingest-file.ts
export async function ingestAndIndexFile(
  path: string,
  bucket: string,
  options: IngestOptions
): Promise<IngestResult> {
  validateFile(path);
  const content = await readFileContent(path);
  const molecules = parseMolecules(content, path, bucket);
  const validMolecules = validateMolecules(molecules);
  const inserted = await storeMolecules(validMolecules);
  logIngestionMetrics(path, validMolecules.length, inserted.length);
  
  return {
    success: true,
    moleculesIngested: validMolecules.length,
    path
  };
}

// engine/src/services/ingest/validate-file.ts
export function validateFile(path: string): void {
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  
  const stats = fs.statSync(path);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${stats.size} bytes`);
  }
}

// engine/src/services/ingest/read-file.ts
export async function readFileContent(path: string): Promise<string> {
  return fs.promises.readFile(path, 'utf-8');
}

// engine/src/services/ingest/parse-molecules.ts
export function parseMolecules(
  content: string,
  source: string,
  bucket: string
): Molecule[] {
  return content
    .split('\n')
    .filter(line => line.trim())
    .map((line, index) => createMolecule(line, source, bucket, index));
}

function createMolecule(
  content: string,
  source: string,
  bucket: string,
  index: number
): Molecule {
  return {
    id: `mol_${Date.now()}_${index}`,
    content,
    source,
    bucket,
    timestamp: new Date().toISOString()
  };
}

// engine/src/services/ingest/validate-molecules.ts
export function validateMolecules(molecules: Molecule[]): Molecule[] {
  return molecules.filter(m => {
    return m.content.length > 0 && 
           m.content.length < MAX_MOLECULE_SIZE &&
           isValidUtf8(m.content);
  });
}

// engine/src/services/ingest/store-molecules.ts
export async function storeMolecules(molecules: Molecule[]): Promise<InsertResult[]> {
  return db.transaction(async (tx) => {
    const results = [];
    for (const molecule of molecules) {
      const result = await tx.query(
        'INSERT INTO molecules (...) VALUES (...)',
        [molecule.id, molecule.content, molecule.source]
      );
      results.push(result);
    }
    return results;
  });
}

// engine/src/services/ingest/metrics.ts
export function logIngestionMetrics(
  path: string,
  moleculeCount: number,
  insertedCount: number
): void {
  logger.info('Ingestion complete', {
    path,
    molecules: moleculeCount,
    inserted: insertedCount
  });
}
```

---

## Configuration Management

### Extract Constants

**Before:**
```typescript
// engine/src/services/search.ts
export class SearchService {
  private readonly DEFAULT_TOKEN_BUDGET = 2048;
  private readonly DEFAULT_MAX_CHARS = 8192;
  private readonly DEFAULT_MAX_RESULTS = 50;
  private readonly GAMMA = 0.85;
  private readonly LAMBDA = 0.001;
  private readonly HALF_LIFE_MS = 6900000;
  // ... 20 more constants
}
```

**After:**
```typescript
// engine/src/config/search-config.ts
export const searchConfig = {
  defaults: {
    tokenBudget: 2048,
    maxChars: 8192,
    maxResults: 50,
  },
  physics: {
    gamma: 0.85,
    lambda: 0.001,
    halfLifeMs: 6900000,
  },
} as const;

// engine/src/services/search/search-service.ts
import { searchConfig } from '../../config/search-config';

export class SearchService {
  search(query: string, options: SearchOptions) {
    const budget = options.tokenBudget ?? searchConfig.defaults.tokenBudget;
    // ...
  }
}
```

---

### Extract Types

**Before:**
```typescript
// engine/src/services/search.ts
export class SearchService {
  search(
    query: string,
    tokenBudget: number,
    maxChars: number,
    maxResults: number,
    provenance: 'all' | 'minimal' | 'none',
    buckets: string[],
    tags: string[],
    strategy: 'standard' | 'max-recall' | 'exact'
  ): Promise<{
    results: Array<{
      id: string;
      content: string;
      source: string;
      score: number;
      timestamp: string;
      bucket: string;
      tags: string[];
      byteOffset: number;
      byteLength: number;
      provenance?: {
        sharedTags: string[];
        hopDistance: number;
        recencyScore: number;
        structuralSimilarity: number;
      };
    }>;
    metadata: {
      atomCount: number;
      filledPercent: number;
      tokenCount: number;
      searchTimeMs: number;
      strategy: string;
    };
  }> {
    // implementation
  }
}
```

**After:**
```typescript
// engine/src/types/search-types.ts
export interface SearchOptions {
  tokenBudget?: number;
  maxChars?: number;
  maxResults?: number;
  provenance?: ProvenanceLevel;
  buckets?: string[];
  tags?: string[];
  strategy?: SearchStrategy;
}

export type ProvenanceLevel = 'all' | 'minimal' | 'none';
export type SearchStrategy = 'standard' | 'max-recall' | 'exact';

export interface SearchResult {
  id: string;
  content: string;
  source: string;
  sourcePath?: string;
  score: number;
  timestamp: string;
  bucket: string;
  tags: string[];
  byteOffset?: number;
  byteLength?: number;
  provenance?: Provenance;
}

export interface Provenance {
  sharedTags: string[];
  hopDistance: number;
  recencyScore: number;
  structuralSimilarity: number;
}

export interface SearchMetadata {
  atomCount: number;
  filledPercent: number;
  tokenCount: number;
  searchTimeMs: number;
  strategy: string;
}

export interface SearchResponse {
  results: SearchResult[];
  metadata: SearchMetadata;
}

// engine/src/services/search/search-service.ts
import { SearchOptions, SearchResponse } from '../../types/search-types';

export class SearchService {
  async search(query: string, options: SearchOptions): Promise<SearchResponse> {
    // implementation
  }
}
```

---

## Testing Refactored Code

### Unit Tests for Extracted Functions

**Before:**
```typescript
// tests/unit/search.test.ts
describe('SearchService', () => {
  it('should search with default options', async () => {
    const service = new SearchService();
    const result = await service.search('test', 2048, 8192, 50, 'all', [], [], 'standard');
    expect(result.results.length).toBeGreaterThan(0);
  });
});
```

**After:**
```typescript
// tests/unit/search/search-service.test.ts
describe('SearchService', () => {
  it('should search with default options', async () => {
    const service = new SearchService();
    const result = await service.search('test', {});
    expect(result.results.length).toBeGreaterThan(0);
  });
});

// tests/unit/search/validate-file.test.ts
describe('validateFile', () => {
  it('should throw for non-existent file', () => {
    expect(() => validateFile('/nonexistent')).toThrow('File not found');
  });
  
  it('should throw for oversized file', () => {
    // Mock large file
    expect(() => validateFile('/large-file')).toThrow('File too large');
  });
});

// tests/unit/search/parse-molecules.test.ts
describe('parseMolecules', () => {
  it('should split content into molecules', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    const molecules = parseMolecules(content, 'test.md', 'inbox');
    expect(molecules).toHaveLength(3);
  });
});
```

---

### Integration Tests

```typescript
// tests/integration/ingest-file.test.ts
describe('Ingest File Integration', () => {
  let db: Database;
  
  beforeAll(async () => {
    db = await createTestDatabase();
  });
  
  afterAll(async () => {
    await db.shutdown();
  });
  
  it('should ingest complete file workflow', async () => {
    const result = await ingestAndIndexFile(
      'tests/fixtures/test-file.md',
      'inbox',
      {}
    );
    
    expect(result.success).toBe(true);
    expect(result.moleculesIngested).toBeGreaterThan(0);
    
    // Verify in database
    const molecules = await db.query('SELECT * FROM molecules');
    expect(molecules.rows.length).toBe(result.moleculesIngested);
  });
});
```

---

## Tools and Automation

### ESLint Rules

Configure in `.eslintrc.cjs`:

```javascript
module.exports = {
  rules: {
    // Function complexity
    complexity: ['error', { max: 20 }],
    
    // Function length
    'max-lines-per-function': ['error', { max: 50 }],
    
    // File length
    'max-lines': ['error', { max: 500 }],
    
    // Function parameters
    'max-params': ['error', { max: 5 }],
    
    // Nesting depth
    'max-depth': ['error', { max: 4 }],
    
    // Cyclomatic complexity
    'complexity': ['error', 20]
  }
};
```

### TypeScript Configuration

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Automated Refactoring Tools

**1. TypeScript Language Server:**
```bash
# In VS Code, use:
# - Extract Method (Ctrl+.)
# - Move to File (Ctrl+.)
# - Organize Imports (Shift+Alt+O)
```

**2. ts-prune (Find Unused Exports):**
```bash
pnpm exec ts-prune
```

**3. dependency-cruiser (Check Dependencies):**
```bash
pnpm exec depcruise --validate engine/src
```

**4. jscpd (Find Duplicates):**
```bash
pnpm exec jscpd engine/src
```

---

## Checklist for Safe Refactoring

### Before Refactoring

- [ ] All tests passing
- [ ] Coverage baseline recorded
- [ ] Git branch created
- [ ] Dependencies mapped

### During Refactoring

- [ ] Small, incremental changes
- [ ] Tests updated after each change
- [ ] No circular dependencies introduced
- [ ] Import paths updated correctly

### After Refactoring

- [ ] All tests passing
- [ ] Coverage maintained or improved
- [ ] No new ESLint errors
- [ ] Documentation updated
- [ ] TypeScript compiles without errors
- [ ] Manual testing completed

---

## Related Documentation

- [Decision Record 001: Test Strategy](../../specs/decisions/001-test-strategy.md)
- [Standard 001: Memory-Safe Ingestion](../../specs/current-standards/001-memory-safe-ingestion.md)
- [Testing Guide](../../tests/README.md)

---

## Appendix: Before/After Examples

### Large Service File

**Before:** `engine/src/services/search.ts` (850 lines)

**After:**
```
engine/src/services/search/
├── index.ts                    # Exports
├── search-service.ts           # Main service (180 lines)
├── search-strategy.ts          # Strategy interface (40 lines)
├── strategies/
│   ├── standard-strategy.ts    # Standard implementation (120 lines)
│   ├── max-recall-strategy.ts  # Max-recall implementation (150 lines)
│   └── exact-strategy.ts       # Exact implementation (80 lines)
├── search-config.ts            # Configuration (60 lines)
├── search-types.ts             # Type definitions (100 lines)
└── utils/
    ├── scoring.ts              # Scoring functions (90 lines)
    ├── filtering.ts            # Result filtering (70 lines)
    └── provenance.ts           # Provenance tracking (85 lines)
```

**Total:** 875 lines split into 9 focused files

---

### Large Class

**Before:** `Database` class (520 lines, 52 methods)

**After:**
```
engine/src/core/
├── database.ts                 # Main class, delegates to managers (80 lines)
├── connection-manager.ts       # Connection handling (95 lines)
├── ingestion-manager.ts        # Ingestion operations (110 lines)
├── search-manager.ts           # Search operations (100 lines)
├── distillation-manager.ts     # Distillation operations (95 lines)
└── query-builder.ts            # SQL query building (75 lines)
```

**Total:** 555 lines with better separation of concerns
