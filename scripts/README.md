# GitHub Repository Ingester

Fetches a GitHub repository with full metadata and packages it for Anchor Engine ingestion.

## Features

✅ **Full Repository Capture**
- All code files
- Commit history
- Issues with comments
- Pull requests with stats
- Contributors
- Releases

✅ **Smart Updates**
- Incremental ingestion (only new commits)
- Branch selection
- Automatic deduplication

✅ **MCP Server Ready**
- Tarball format for efficient storage
- YAML context files for LLM consumption
- Drop-in for `external-inbox/` or `inbox/`

## Installation

```bash
cd scripts
npm install
```

## Usage

### Basic Ingestion

```bash
# Ingest main branch to external-inbox/
node github-ingester.js --repo RSBalchII/anchor-engine-node
```

### Advanced Options

```bash
# Specific branch
node github-ingester.js --repo RSBalchII/anchor-engine-node --branch develop

# Output to inbox/ instead
node github-ingester.js --repo RSBalchII/anchor-engine-node --output inbox

# Incremental update (only new commits)
node github-ingester.js --repo RSBalchII/anchor-engine-node --incremental

# Private repo or higher rate limits
node github-ingester.js --repo owner/private-repo --token ghp_xxx
```

### Command Line Options

```
--repo         GitHub repository (e.g., RSBalchII/anchor-engine-node) [required]
--branch       Branch to fetch (default: main)
--output       Output directory: 'external-inbox' or 'inbox' (default: external-inbox)
--token        GitHub personal access token (for private repos, higher rate limits)
--incremental  Only fetch new commits since last ingestion
--help         Show help message
```

## Output

The ingester creates:

1. **Tarball** (`external-inbox/<repo>-<branch>-<date>.tar.gz`)
   - All repository files
   - Compressed with gzip
   - Ready for Watchdog auto-ingestion

2. **YAML Context** (inside tarball)
   - Repository metadata
   - Issues, PRs, contributors
   - Commit information
   - Statistics

3. **Summary** (`external-inbox/INGEST_SUMMARY.json`)
   - Last ingestion timestamp
   - Commit hash
   - Metadata counts

## MCP Server Integration

Once ingested, the repository is available for MCP servers:

```javascript
// The Watchdog service will automatically:
// 1. Detect the tarball in external-inbox/
// 2. Extract and atomize all files
// 3. Index with FTS5
// 4. Make searchable via search API

// Query via MCP:
const results = await mcp.search({
  query: "How does the physics walker work?",
  buckets: ["anchor-engine-node"]
});
```

## Automated Updates

### Cron Job (Linux/Mac)

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * cd /path/to/anchor-engine-node/scripts && \
    node github-ingester.js --repo RSBalchII/anchor-engine-node --incremental
```

### Task Scheduler (Windows)

```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "node" `
  -Argument "github-ingester.js --repo RSBalchII/anchor-engine-node --incremental" `
  -WorkingDirectory "C:\Projects\anchor-engine-node\scripts"

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -TaskName "Anchor GitHub Ingester" `
  -Action $action -Trigger $trigger -RunLevel Highest
```

## Rate Limits

| Auth Type | Requests/Hour |
|-----------|---------------|
| Anonymous | 60 |
| Token     | 5,000 |

For large repos or frequent updates, use `--token`:

```bash
# Generate token at: https://github.com/settings/tokens
# Scopes needed: repo (for private repos), read:org
node github-ingester.js --repo owner/repo --token ghp_xxx
```

## Example Output

```
🚀 GitHub Repository Ingester

============================================================
Repository: RSBalchII/anchor-engine-node
Branch: main
Output: external-inbox
Incremental: No
============================================================

📦 Cloning RSBalchII/anchor-engine-node (main)...
✅ Cloned: 8d3f35a by Robert Balch II on 2026-02-24

📊 Fetching GitHub metadata...
  - Issues...
    ✅ 47 issues
  - Pull Requests...
    ✅ 23 pull requests
  - Contributors...
    ✅ 5 contributors
  - Releases...
    ✅ 12 releases

📝 Generating YAML context...
✅ Generated: anchor-engine-node-github.yaml

📦 Creating compressed tarball...
✅ Created: anchor-engine-node-main-2026-02-25.tar.gz (342 files, 12.5MB)

============================================================
✅ Ingestion complete!
============================================================

📦 Tarball: external-inbox/anchor-engine-node-main-2026-02-25.tar.gz
📄 Summary: external-inbox/INGEST_SUMMARY.json

💡 Next steps:
   The tarball will be automatically ingested by the Watchdog service.
   Or manually move it to inbox/ for immediate processing.
```

## Troubleshooting

### "Repository not found"
- Check repo name (owner/repo format)
- For private repos, use `--token`

### "Rate limit exceeded"
- Use `--token` for higher limits
- Wait 1 hour for anonymous limits to reset

### "Tarball not ingesting"
- Check Watchdog logs: `pnpm start`
- Ensure tarball is in `external-inbox/` or `inbox/`
- Verify file extension is `.tar.gz`

## License

MIT
