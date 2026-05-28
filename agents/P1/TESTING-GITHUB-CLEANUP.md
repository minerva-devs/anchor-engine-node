# GitHub Ingestion & Cleanup Testing Framework

## Overview
This framework helps you test the GitHub repository ingestion and orphaned data cleanup functionality.

## Configuration
- **Log Directory:** `C:\Users\rsbii\.anchor\logs\`
- **Server URL:** `http://localhost:3160`
- **Test Repository:** `https://github.com/RSBalchII/Coding-Notes`

## Testing Steps

### 1. Start the Server with Logging
```powershell
cd C:\Users\rsbii\Projects\anchor-engine-node
pnpm start-with-logging
```

**Expected Output:** Server starts and logs go to `C:\Users\rsbii\.anchor\logs\anchor_engine.log`

### 2. Open Frontend UI
- Navigate to: `http://localhost:3160/
- Verify the GitHub icon is **WHITE** (not gray) in the navbar

### 3. Trigger GitHub Ingestion
1. Click the GitHub icon in the navbar
2. Enter repository URL: `https://github.com/RSBalchII/Coding-Notes`
3. Click "Ingest Repository"

### 4. Monitor Logs for Cleanup Activity
Watch `C:\Users\rsbii\.anchor\logs\anchor_engine.log` for these key messages:

**Cleanup Warning (if >100 old atoms):**
```
[GitHub] WARNING: X old atoms from previous sync detected - will quarantine and clean up
```

**Cleanup Execution:**
```
[GitHub] Cleaning up orphaned data for RSBalchII/Coding-Notes (bucket: ...)
[GitHub] Deleting sources with path prefix: github:RSBalchII/Coding-Notes/
[GitHub] Deleting X molecules referencing these sources
[GitHub] Deleting X atoms referencing these molecules
[GitHub] ✅ Cleanup complete for RSBalchII/Coding-Notes
```

**Sync Completion:**
```
[GitHub] Syncing RSBalchII/Coding-Notes (bucket: ...)
[GitHub] ✅ Ingestion complete for RSBalchII/Coding-Notes
```

### 5. Verify Cleanup Results

#### A. Check Database via API
```powershell
# Count molecules before cleanup
$before = Invoke-WebRequest -Uri "http://localhost:3160/v1/molecules" | ConvertFrom-Json
Write-Host "Molecules before: $($before.molecules.Count)"

# Trigger cleanup via UI
# ... wait for cleanup to complete ...

# Count molecules after cleanup
$after = Invoke-WebRequest -Uri "http://localhost:3160/v1/molecules" | ConvertFrom-Json
Write-Host "Molecules after: $($after.molecules.Count)"

# Verify orphaned molecules are gone
$githubMolecules = $after.molecules | Where-Object { $_.source_path -like "github:*" }
Write-Host "GitHub molecules remaining: $($githubMolecules.Count)"
```

#### B. Check GitHub Repo Table
```powershell
# List all GitHub repositories
$repos = Invoke-WebRequest -Uri "http://localhost:3160/v1/github/repos" | ConvertFrom-Json
$repos | Format-Table Id, Owner, Repo, LastSyncStatus, LastSyncedAt -AutoSize
```

### 6. Verify New Content is Ingested
```powershell
# Check if new molecules were created
$newGithubMolecules = Invoke-WebRequest -Uri "http://localhost:3160/v1/molecules" | ConvertFrom-Json
$newGithubMolecules = $newGithubMolecules.molecules | Where-Object { $_.source_path -like "github:RSBalchII/Coding-Notes/*" }
Write-Host "New GitHub molecules: $($newGithubMolecules.Count)"

# Verify content is searchable
$searchResult = Invoke-WebRequest -Uri "http://localhost:3160/v1/search?q=coding+notes" | ConvertFrom-Json
Write-Host "Search results: $($searchResult.results.Count)"
```

## Expected Behavior

### When >100 Old Atoms Detected:
1. **Warning logged:** Shows count of old atoms
2. **Auto-quarantine:** All atoms from the failed sync are tagged with `#quarantined`
3. **Orphan cleanup:** All molecules/atoms/sources with GitHub path prefix are deleted
4. **Fresh sync:** New ingestion proceeds without errors

### When <100 Old Atoms (Normal Sync):
1. No cleanup warning
2. Standard ingestion flow
3. No orphan data deletion

## Troubleshooting

### Issue: Logs not appearing in `.anchor/logs/`
- Check if `pnpm start-with-logging` was run (not just `pnpm start`)
- Verify the log file exists: `dir C:\Users\rsbii\.anchor\logs\*.log`
- Check file permissions on the logs directory

### Issue: Cleanup not triggering
- Verify old atom count > 100: Query the database directly
- Check that GitHub icon is white (confirms UI changes applied)
- Ensure the repository URL matches exactly what was in the failed sync

### Issue: Cleanup errors
- Check the last error in `github_repos` table
- Verify GitHub API token has `repo` scope
- Review logs for specific error messages

## Quick Reference

| Action | Command/URL | Expected Output |
|--------|-------------|----------------|
| Start server with logging | `pnpm start-with-logging` | Logs to `.anchor/logs/anchor_engine.log` |
| Open UI | `http://localhost:3160/` | GitHub icon should be white |
| Trigger ingestion | Click GitHub icon → enter URL | API call to `/v1/github/repos` |
| Check cleanup logs | Open `.anchor/logs/anchor_engine.log` | Look for `[GitHub] ✅ Cleanup complete` |
| Query molecules | `GET /v1/molecules` | Array of molecule objects |
| Query GitHub repos | `GET /v1/github/repos` | Array of GitHubRepoRecord objects |

## Testing Checklist
- [ ] Server starts with logging to correct directory
- [ ] GitHub icon is white in navbar
- [ ] UI accepts repository URL and triggers ingestion
- [ ] Logs show cleanup warning (if applicable)
- [ ] Logs show cleanup execution details
- [ ] Logs show cleanup completion
- [ ] Database query confirms orphaned data removed
- [ ] Database query confirms new content ingested
- [ ] Search functionality works with new content
