# Anchor Engine Test Tasks

## Completed Work

### 1. Created Text Flow Verification Tests
- **File**: `tests/text-flow-verification.test.ts`
- **Purpose**: Verify that actual text flows through the Anchor Engine pipeline
- **Tests included**:
  1. Search returns actual text content (not undefined)
  2. YAML distillation output validation
  3. JSON distillation output validation
  4. Decision-records format validation
  5. Search log activity verification
  6. Distillation log activity verification
  7. End-to-end pipeline test

### 2. Created Test Specification Document
- **File**: `tests/verify-text-flow-prompt.md`
- Contains detailed instructions for testing the system

### 3. Engine Status
The Anchor Engine is currently running:
- Health status: degraded (database query returned unexpected results)
- Port: localhost:3160
- Logs are being written to `.anchor/logs/`

## Next Steps

1. **Run the text-flow verification tests** - The engine needs to be restarted with a clean database for proper testing
2. **Verify log output** - Check that logs contain actual query/distillation activity
3. **Document findings** - Update the test specification with results

## How to Run Tests

### Option A: Using Test Runner Script (Recommended)
```bash
node tests/run-tests-with-logger.js --grep "text-flow"
```

### Option B: Direct Vitest Execution
```bash
cd C:\Users\rsbiiw\Projects\anchor-engine-node
node --no-warnings engine\node_modules\vitest\vitest.mjs run --config engine/vitest.config.ts tests/text-flow-verification.test.ts
```

### Option C: Using pnpm (if configured)
```bash
pnpm test -- text-flow-verification.test.ts
```

## Notes

- The engine logs to `.anchor/logs/` directory
- Test output includes both stdio and logger output
- Database state may affect test results - a clean restart may be needed