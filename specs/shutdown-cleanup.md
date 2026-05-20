# GitHub Mirror Cleanup on Shutdown

## Overview

This document describes the cleanup process for GitHub repository mirrors when the Anchor Engine shuts down. This prevents duplicate repos from accumulating in the `.anchor` directory.

## Background

When the GitHub ingestion service clones a repository, it:
1. Downloads the tarball from GitHub API
2. Extracts it to a temporary directory
3. Mirrors files to `.anchor/external-inbox/github/{owner}/{repo}/`

This mirror directory serves as a local backup and visible source for users. However, if the engine shuts down without proper cleanup, these directories can accumulate and cause confusion.

## Implementation

### 1. GitHub Mirror Directory Cleanup

The shutdown process now automatically removes the entire `github/` subdirectory from `EXTERNAL_INBOX_DIR`. This includes all cloned repositories.

**Location:** `engine/src/index.ts` (shutdown handler)

**Code:**
```typescript
const githubMirrorDir = path.join(PATHS.EXTERNAL_INBOX_DIR, 'github');
if (existsSync(githubMirrorDir)) {
  rmSync(githubMirrorDir, { recursive: true, force: true });
}
```

### 2. Orphaned Files Cleanup

Any files or directories in `EXTERNAL_INBOX_DIR` that are not part of the `github/` directory are removed. This cleans up:
- Temporary files left behind
- Orphaned directories from failed ingestion attempts
- Any other stray files

**Code:**
```typescript
const externalInboxDir = PATHS.EXTERNAL_INBOX_DIR;
const entries = readdirSync(externalInboxDir);
for (const entry of entries) {
  const entryPath = path.join(externalInboxDir, entry);
  const stat = statSync(entryPath);
  if (stat.isDirectory()) {
    if (path.basename(entry) === 'github') {
      continue; // Keep github directory
    }
    rmSync(entryPath, { recursive: true, force: true });
  } else {
    rmSync(entryPath, { force: true });
  }
}
```

### 3. GitHub Ingest Service Already Handles Replacements

The GitHub ingest service (`engine/src/services/ingest/github-ingest-service.ts`) already removes the old mirror directory before creating a new one:

```typescript
// Remove old mirror if exists (clean slate)
if (fs.existsSync(mirrorDir)) {
  fs.rmSync(mirrorDir, { recursive: true, force: true });
}
```

This ensures that when a repo is re-cloned, the old version is completely replaced.

## Shutdown Order

The cleanup happens in this order during shutdown:

1. **GitHub Mirror Directory** - Remove all cloned repos
2. **Orphaned Files** - Clean up stray files in external-inbox
3. **Synonym Rings** - Clear auto-generated synonym data
4. **Tag Audit Cache** - Clear derived tag audit data

## Testing

To test the shutdown cleanup:

1. Start the Anchor Engine
2. Use the GitHub ingestion API to clone a test repository:
   ```bash
   POST /api/github/sync
   {
     "url": "https://github.com/RSBalchII/test-repo"
   }
   ```
3. Verify the mirror directory exists:
   ```bash
   ls ~/.anchor/external-inbox/github/
   ```
4. Stop the engine (Ctrl+C or SIGTERM)
5. Verify the mirror directory is removed:
   ```bash
   ls ~/.anchor/external-inbox/github/  # Should be empty or not exist
   ```

## Configuration

The cleanup is automatic and does not require any configuration. It runs on every graceful shutdown (SIGINT, SIGTERM, or normal process exit).

## Notes

- The cleanup uses `rmSync` with `force: true` to ensure files are removed even if they're locked
- Errors during cleanup are logged as warnings but do not prevent shutdown
- The source of truth (`inbox/` and `external-inbox/` excluding `github/`) is preserved
- On restart, the system regenerates mirrors and indexes from the inbox

## Related Files

- `engine/src/index.ts` - Shutdown handler with cleanup logic
- `engine/src/services/ingest/github-ingest-service.ts` - GitHub ingestion service
- `engine/src/config/paths.ts` - Path configuration