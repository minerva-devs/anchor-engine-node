# Anchor Engine — Automated Testing Quick Reference

**Version:** 5.2.0 | **Updated:** June 5, 2026

---

## Quick Test Commands

```bash
# Run all tests (Vitest)
pnpm test

# Run integration tests
pnpm --filter anchor-engine test:vitest

# Run live-fire tests (requires running engine)
node engine/tests/live-fire/run-tests.js

# Run a specific test file
npx vitest run engine/tests/unit/paths-config.test.ts
```

## Test Categories

| Category | Location | Framework | Description |
|----------|----------|-----------|-------------|
| **Unit Tests** | `engine/tests/unit/` | Vitest | Core logic, utilities, config validation |
| **Integration Tests** | `engine/tests/integration/` | Vitest | End-to-end pipeline: search, ingest, distill |
| **Live-Fire Tests** | `engine/tests/live-fire/` | Node.js scripts | Real engine testing with live HTTP requests |
| **E2E UI Tests** | `tests/e2e/` | Playwright + Vitest | Browser-based UI verification |

## Test Architecture

The three-tier testing strategy (documented in `specs/ux-ui-recursion-workflow.md`):

1. **Tier 1: Automated API Tests** — Vitest-based, run `pnpm test`. Covers all routes, services, and data integrity.
2. **Tier 2: Manual UI Testing** — Playwright for browser-based verification.
3. **Tier 3: Operational Verification** — Runtime health checks via `/health` endpoints.

## Prerequisites

- Node.js 18+ and PNPM
- Running engine on port 3160 (for live-fire and e2e tests):
  ```bash
  pnpm start
  ```

## See Also

- **[specs/ux-ui-recursion-workflow.md](specs/ux-ui-recursion-workflow.md)** — Full testing strategy
- **[specs/current-standards/testing/](specs/current-standards/testing/)** — Testing standards
- **[engine/tests/](../engine/tests/)** — All test suites
