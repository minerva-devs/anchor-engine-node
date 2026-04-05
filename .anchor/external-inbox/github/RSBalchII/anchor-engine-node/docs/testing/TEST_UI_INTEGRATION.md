# Test UI Integration Guide

## Overview

The Test UI provides a comprehensive frontend interface for running all tests from the `/tests` directory directly from the browser. Results are displayed in expandable containers with full output, making it easy to share test results with AI models.

## Features

### Frontend (`/test` route)
- **Test Categories**: Organized by test type (Unit, Integration, E2E, Emulation, API)
- **Run Controls**: 
  - Run individual tests
  - Run entire categories
  - Run all tests at once
- **Results Display**:
  - Expandable output containers with full test logs
  - Status indicators (✅ pass, ❌ fail, ⚠️ error)
  - Duration tracking
  - Exit codes for file-based tests
- **Export Options**:
  - JSON format for programmatic access
  - Markdown format for sharing with models
  - Copy to clipboard for individual tests
- **Summary Dashboard**: Real-time pass/fail/error counts per category

### Backend API Endpoints

#### `GET /v1/test/categories`
Returns all test categories and their definitions.

**Response:**
```json
{
  "categories": [
    {
      "name": "Unit Tests",
      "icon": "circle-help",
      "tests": [...]
    }
  ]
}
```

#### `POST /v1/test/run-file`
Execute a test file from the `/tests` directory.

**Request:**
```json
{
  "file": "tests/test_parser.ts"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "name": "test_parser.ts",
    "status": "pass",
    "duration": 1234,
    "message": "All tests passed",
    "output": "✅ Parser › Test basic parsing (123ms)\n...",
    "exitCode": 0,
    "data": {
      "stdout": "...",
      "stderr": ""
    }
  }
}
```

#### `POST /v1/test/run`
Run API endpoint tests (health checks, search, etc.)

**Request:**
```json
{
  "categoryId": 0,
  "testId": "health-check"
}
```

## Test Categories

### 1. Unit Tests
- `test_parser.ts` - Content parser functionality
- `test_atomizer_limit.ts` - Atomizer boundary detection
- `test_runtime_events.ts` - Event system and listeners
- `test-token-utilization.js` - Token counting and budgeting
- `verification_search.ts` - Search algorithm correctness
- `whitepaper-verification.js` - Whitepaper implementation claims

### 2. Integration Tests
- `test-pglite.ts` - PGlite database integration
- `minimal-pglite-test.ts` - Minimal PGlite functionality
- `minimal-framework.mjs` - Zero-dependency test framework
- `streamlined-test.mjs` - Streamlined testing approach

### 3. E2E Tests
- `full-stack.test.ts` - Complete end-to-end workflows

### 4. Emulation Tests
- `emulate-frontend.mjs` - Frontend behavior emulation
- `emulate-mcp.mjs` - MCP protocol emulation

### 5. Core API Tests
- Health check
- Statistics retrieval
- Bucket listing

### 6. Memory & Search Tests
- Empty query search
- Tag-based search

### 7. System Management Tests
- Watch path listing
- Watchdog status

## Usage

### Running Tests from UI

1. Navigate to `http://localhost:3160/test`
2. Expand a test category
3. Click "Run" next to individual tests or "Run {Category Name}" for all tests in a category
4. Click "Run All Tests" to execute everything
5. View results in expandable output containers
6. Export results using the Export dropdown (JSON or Markdown)

### Running Tests via API

```bash
# Run a specific test file
curl -X POST http://localhost:3160/v1/test/run-file \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file": "tests/test_parser.ts"}'

# Get all test categories
curl http://localhost:3160/v1/test/categories \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Exporting Results for AI Models

1. Run your tests from the UI
2. Select export format (JSON or Markdown)
3. Click "📥 Export"
4. Attach the downloaded file to your AI model conversation

**Markdown format is recommended for AI models** as it's more readable and includes formatted code blocks for test output.

## Architecture

### Frontend Components
- `TestPage` - Main test runner UI component
- Category panels with expand/collapse
- Individual test rows with run buttons
- Expandable results containers with syntax highlighting

### Backend Components
- `test-ui.ts` - Route registration and test execution
- `runFileTest()` - Spawns child processes to run test files
- `runTest()` - Runs API endpoint tests
- Timeout protection (5 minute limit per test)

## Adding New Tests

### File-Based Tests

1. Add your test file to `/tests` directory
2. Update `testCategories` in `engine/src/routes/test-ui.ts`:

```typescript
{
  name: 'My New Test',
  description: 'Description of what this tests',
  endpoint: '/v1/test/run-file',
  method: 'POST',
  body: { file: 'tests/my-new-test.ts' },
  validate: (res) => ({ pass: res.success === true })
}
```

### API Endpoint Tests

```typescript
{
  name: 'My API Test',
  description: 'Tests the new endpoint',
  endpoint: '/v1/my-endpoint',
  method: 'GET',
  validate: (res) => ({ pass: res.status === 'ok' })
}
```

## Troubleshooting

### Tests Not Running
- Ensure the server is running on the correct port
- Check that test files exist in the `/tests` directory
- Verify file permissions

### Timeout Errors
- Tests have a 5-minute timeout
- Long-running tests may need optimization
- Consider splitting large test suites

### Output Not Showing
- Click "Show Output" button to expand results container
- Check browser console for errors
- Verify the test produces stdout/stderr output

## Next Steps: anchor-engine-rust Integration

To integrate this Test UI into the anchor-engine-rust project:

1. **Backend**: Create equivalent Rust endpoints in the Rust project
2. **Test Execution**: Adapt to run `cargo test` instead of Node.js tests
3. **Frontend**: Reuse the same React component from `index.html`
4. **Output Mapping**: Format Rust test output to match the expected result structure

See `TEST_UI_RUST_INTEGRATION.md` for detailed Rust integration plan.

## Example Export (Markdown)

```markdown
# Test Results - 2026-04-02T12:34:56.789Z

## Summary
- Total: 15
- Passed: 12
- Failed: 2
- Errors: 1

## Unit Tests

### Parser Tests
- Status: pass
- Duration: 234ms
- Message: All tests passed

```
✅ Parser › Test basic parsing (23ms)
✅ Parser › Test edge cases (45ms)
...
```

### Atomizer Limit Tests
- Status: fail
- Duration: 567ms
- Message: Tests failed with code 1

```
❌ Atomizer › Test boundary detection (123ms)
   Expected boundary at position 450
...
```
```
