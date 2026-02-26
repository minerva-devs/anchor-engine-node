# C++ Backend Tests

Test suite for the Anchor Core C++ backend with FTS5 search.

## Test Files

- `simple.test.js` - Basic operation tests (search, stats, inflation, dedup, filter)
- `comprehensive.test.js` - Full test suite with context sizes, query styles, multi-hop
- `context-size.test.js` - Context size variation tests

## Running Tests

```bash
# Run comprehensive test suite
npm test

# Run simple operation tests
npm run test:simple

# Run context size tests only
npm run test:context

# Run all tests
npm run test:all
```

## Test Coverage

### Basic Operations
- ✅ Database initialization
- ✅ FTS5 search
- ✅ Statistics retrieval
- ✅ Radial inflation (physics walker)
- ✅ Context inflation
- ✅ 5-layer deduplication
- ✅ Transient content filtering

### Performance Tests
- Context sizes: 1KB → 512KB
- Query styles: single word, multi-word, phrases
- Multi-hop traversal verification

## Requirements

- Node.js 18+
- C++ backend DLL (anchor_core.dll)
- koffi FFI library

## Expected Results

All tests should pass with:
- Search latency < 100ms for empty database
- Search latency < 500ms for populated database
- Memory usage < 50MB for test suite
- No memory leaks (verified with --expose-gc)
