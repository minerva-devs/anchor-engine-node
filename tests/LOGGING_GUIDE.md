# Test Logging System

Centralized test logging for A/B testing and performance comparison.

## Overview

All test output is captured to a single log file per test run, stored in `/logs/tests/`. Logs are automatically truncated to the last 10,000 lines to prevent unbounded growth.

## File Structure

```
logs/tests/
├── search-unit-20260410-143022-abc123.log     # Test run logs
├── distillation-v2-20260410-143500-def456.log # Test run logs
├── search-metadata-20260410-143022-abc123.log # Search metadata
├── distillation-metadata-20260410-143500-def456.log # Distillation metadata
└── comparison-20260410.md                     # A/B comparison reports
```

## Usage

### Running Tests with Centralized Logging

```bash
# Run all tests
node tests/run-tests-with-logger.js

# Run only unit tests
node tests/run-tests-with-logger.js --unit

# Run only integration tests
node tests/run-tests-with-logger.js --integration

# Run with grep filter
node tests/run-tests-with-logger.js --grep="search"
```

### Logging Search Events

In your test files, import and use the metadata logger:

```javascript
import { logSearchEvent } from '../tests/test-metadata.js';

// During your test
const searchResult = await engine.search(query);
const duration = Date.now() - startTime;

// Log with full metadata
logSearchEvent({
  query,
  results: searchResult,
  duration,
  strategy: 'standard',
  contextSize: searchResult.context.length,
  resultCount: searchResult.results.length,
});
```

### Logging Distillation Events

```javascript
import { logDistillationEvent } from '../tests/test-metadata.js';

const distillationResult = await engine.distill();
const duration = Date.now() - startTime;

logDistillationEvent({
  type: 'radial',
  results: distillationResult,
  duration,
  settings: { threshold: 0.5, maxResults: 100 },
});
```

### Comparing Test Runs (A/B Testing)

```bash
# Compare two specific log files
node scripts/compare-tests.ts logs/tests/search-20260410-143022.log logs/tests/search-20260410-144000.log

# Compare by pattern (auto-selects first two matching files)
node scripts/compare-tests.ts --pattern "search-*.log"
```

## Log File Format

Each log file contains:

1. **Header**: Test name, timestamp, duration, exit code
2. **Results Summary**: Pass/fail/skip counts
3. **Custom Metadata**: Any additional data logged
4. **Log Entries**: All console output with timestamps
5. **Footer**: End marker

Example:
```
================================================================================
TEST RUN LOG
================================================================================
Test Name: search-unit-tests
Test Path: tests/unit/search.test.ts
Timestamp: 2026-04-10T14:30:22.123Z
Duration:  1234ms
Exit Code: 0

RESULTS:
  Passed:  15
  Failed:  0
  Skipped: 0
  Total:   15

LOG ENTRIES:
--------------------------------------------------------------------------------
14:30:22.100 [INFO] Test logger initialized
14:30:22.150 [INFO] Running search tests
14:30:22.200 [INFO] Test: should handle basic queries
14:30:22.250 [INFO] Query: "test query"
14:30:22.300 [INFO] Results: 5 matches found
...
================================================================================
END OF LOG
================================================================================
```

## Metadata Files

Search and distillation events are logged separately as JSON lines files for easy programmatic access:

```bash
# Read all search events
cat logs/tests/search-metadata-*.log | jq -r '.'
```

## Best Practices

1. **Use descriptive test names**: `search-unit-tests` instead of `test-1`
2. **Include relevant metadata**: Query parameters, strategy, configuration
3. **Log at appropriate levels**: Use `info` for normal flow, `error` for failures
4. **Keep logs focused**: Don't log entire large objects, use summaries
5. **Review logs regularly**: Delete old logs or archive them

## Troubleshooting

### Logs not being created
- Ensure `/logs/tests/` directory exists
- Check file permissions
- Verify you're running from project root

### Logs too large
- Logs are automatically truncated to 10,000 lines
- Adjust `MAX_LOG_LINES` in `tests/test-logger.ts` if needed

### Metadata not showing up
- Ensure you're importing from `tests/test-metadata.js`
- Check that the metadata is being logged with `logSearchEvent()` or `logDistillationEvent()`
