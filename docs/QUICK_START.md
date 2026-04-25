# Quick Start: Simplified Install Workflow

## The Simple Command (v5.0+)

```bash
pnpm install && pnpm build && pnpm start
```

Or just `pnpm i` if you've already run it once (postinstall runs the build automatically).

## What Changed in v5.0+

**Before**: Needed complex validation scripts (`scripts/validate-and-start.mjs`)  
**Now**: Direct engine launch with proper path handling built-in

### Key Fix: ES Module Path Resolution

TypeScript files using `import.meta.url` need proper path construction:

```typescript
// ✅ CORRECT - Works in all environments
const getDirname = () => {
  try {
    return fileURLToPath(new URL('.', import.meta.url).pathname);
  } catch (e) {
    return process.cwd(); // Fallback
  }
};
```

This prevents the "Invalid URL" error that occurred when running from certain directories.

## Test Run

After starting, test these endpoints:

| Endpoint | Method | Expected Response |
|----------|--------|-------------------|
| `GET /health` | GET | `{ "status": "healthy" }` |
| `GET /v1/stats` | GET | Object with atom counts |
| `GET /v1/buckets` | GET | Array of bucket names |

## Example: Start the Engine

```bash
# 1. Install & build (first time only)
pnpm install && pnpm build

# 2. Configure settings (edit user_settings.json with your api_key)

# 3. Start
pnpm start

# Output should show:
# ✅ Database: fresh (ready for ingestion)
# ✅ MCP server: ready on stdio
# ✅ API key: set (...)
# ✅ Health: http://localhost:3160/health
```

## Notes

- The engine will auto-generate a database directory on first start
- WASM modules load automatically (~5 seconds total startup time)
- Synonym generation runs in background after startup

---

*For more details, see [INSTALL.md](./INSTALL.md)*