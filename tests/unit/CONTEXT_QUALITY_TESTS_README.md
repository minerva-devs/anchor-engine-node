# Context Quality Improvements Test Suite

This test suite verifies the context quality improvements implemented in the anchor-engine-node project.

## Features Tested

1. **Snippet Coalescing**: Merges nearby atoms from same file into coherent snippets (500-1000 chars)
2. **Metadata Headers**: Each snippet has file, range, timestamp, atom count metadata
3. **PhysicsWalker High-Budget Mode**: Auto-tunes parameters for queries > 50k chars
4. **Progressive Inflation**: Top 10% results get 2x radius, next 40% get 1.5x
5. **Compression Ratio**: 40+ atoms should coalesce to < 15 snippets

## Test File Location

- `tests/unit/test_context_quality_improvements.ts`

## Running the Tests

### Option 1: From the engine directory (recommended)

```bash
cd engine
npm run test:context-quality
```

Or using the alias:

```bash
cd engine
npm run test:unit
```

### Option 2: Using ts-node directly

```bash
cd engine
npx ts-node ../tests/unit/test_context_quality_improvements.ts
```

### Option 3: From the project root

```bash
cd anchor-engine-node
cd engine && npx ts-node ../tests/unit/test_context_quality_improvements.ts
```

## Test Categories

### Coalescing Tests (8 tests)
- Atoms within 500 bytes merge into single snippet
- Atoms > 500 bytes apart stay separate
- Partial merging with mixed gaps
- Atoms from different files never merge
- Empty input handling
- Single atom handling
- Compression ratio (40+ atoms -> < 15 snippets)
- Overlapping atoms merge correctly

### Metadata Headers Tests (8 tests)
- Output includes [GROUP:N] headers
- Output includes [File:...] headers
- Output includes [Range:0x...] headers
- Output includes [Time:...] headers (ISO format)
- Output includes [Atoms:N] headers
- Output includes [Chars:N] headers
- Result metadata includes coalescing stats
- Results are XML-wrapped

### Progressive Inflation Tests (5 tests)
- Top 10% results get 2x radius
- Next 40% results get 1.5x radius
- Remaining 50% get 1x radius
- Single result gets 2x (edge case)
- 10 results distribution

### PhysicsWalker High-Budget Tests (5 tests)
- High-budget mode activates for maxChars > 50000
- Standard mode for maxChars <= 50000
- Constructor accepts custom config for high-recall mode
- Default configuration values
- Handles empty anchor results

### Integration Tests (5 tests)
- Coalescing + formatting pipeline
- Coalescing disabled path works
- Budget utilization is tracked
- Results sorted chronologically
- Temporal weighting is applied

### Edge Case Tests (8 tests)
- Atoms without compound_id are handled
- Atoms without byte offsets are handled
- Very large proximity threshold merges everything
- Zero proximity threshold only merges overlapping
- Negative byte offsets handled gracefully
- Very long content is handled
- Special characters in file paths
- Unicode content is handled

## CI Integration

For CI environments, the tests can run without a database connection. The tests use mock data and verify:
- Function signatures and parameter handling
- Algorithm logic (coalescing, inflation calculations)
- Output format and metadata presence
- Edge case handling

### Example CI Script

```yaml
# .github/workflows/test-context-quality.yml
name: Context Quality Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g pnpm
      - run: pnpm install
      - name: Run Context Quality Tests
        run: |
          cd engine
          npm run test:context-quality
```

## Expected Output

```
╔════════════════════════════════════════════════════════╗
║     CONTEXT QUALITY IMPROVEMENTS TEST SUITE            ║
║     Testing: Coalescing, Metadata, Inflation, Walker   ║
╚════════════════════════════════════════════════════════╝

╔════════════════════════════════════════╗
║     COALESCING TESTS                   ║
╚════════════════════════════════════════╝

  Coalescing: Atoms within 500 bytes merge into single snippet... ✅ PASS
  Coalescing: Atoms > 500 bytes apart stay separate... ✅ PASS
  ...

╔════════════════════════════════════════╗
║  TEST SUMMARY                          ║
║  Passed: 39                            ║
║  Failed: 0                             ║
║  Duration: XXXms                       ║
╚════════════════════════════════════════╝
```

## Troubleshooting

### "Cannot find module" errors
Ensure you're running from the `engine` directory where the TypeScript configuration is set up correctly.

### Database connection errors
These tests are designed to run without a database. If you see database-related errors, they should be caught and handled gracefully by the tests.

### TypeScript compilation errors
The project uses `ts-node` for runtime TypeScript execution. Pre-existing TypeScript errors in the source files may appear but should not affect test execution.

## Adding New Tests

To add new tests, follow the existing pattern:

```typescript
await test('Test name describing the behavior', async () => {
    // Arrange: Set up test data
    const atoms = createAtomsFromSameFile(5, 0, 100, 80);
    
    // Act: Call the function being tested
    const coalesced = await coalesceByProximity(atoms, 500);
    
    // Assert: Verify the expected behavior
    assertEqual(coalesced.length, 1, 'All atoms should merge');
});
```

## Key Functions Tested

| Function | File | Description |
|----------|------|-------------|
| `coalesceByProximity()` | `engine/src/services/search/search-utils.ts` | Merges nearby atoms |
| `formatResults()` | `engine/src/services/search/search-utils.ts` | Formats results with metadata |
| `applyPhysicsWeighting()` | `engine/src/services/search/physics-tag-walker.ts` | Physics-based weighting |
| `ContextInflator.inflate()` | `engine/src/services/search/context-inflator.ts` | Progressive inflation |

## Performance Benchmarks

| Test Category | Expected Duration |
|---------------|-------------------|
| Coalescing Tests | < 100ms |
| Metadata Tests | < 100ms |
| Progressive Inflation | < 50ms |
| PhysicsWalker Tests | < 200ms |
| Integration Tests | < 200ms |
| Edge Case Tests | < 100ms |
| **Total** | **< 1 second** |
