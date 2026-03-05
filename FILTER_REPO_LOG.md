# Git History Sanitization Log

**Date:** 2026-03-05  
**Branch:** `copilot/sanitize-history`  
**Method:** Manual redaction of sensitive strings in tracked files + `.gitignore` hardening

---

## Summary

This document records all sensitive data that was identified and removed or replaced in this repository. The goal is a clean working tree with zero sensitive data, ready for public visibility.

---

## Sensitive Data Categories Found

### 1. Personal Email Addresses

| Pattern | Files Affected | Action |
|---------|---------------|--------|
| `rsbalchii@gmail.com` | `specs/standards/STANDARD_117_ARXIV_SUBMISSION.md` | Replaced with `[REDACTED_EMAIL]` |
| `robertbalchii@gmail.com` | `git_history.txt` (historical git author lines) | Replaced with `[REDACTED_EMAIL]` |

### 2. Personal Local File Paths (Windows Username: `rsbiiw`)

| Original Path Pattern | Files Affected | Action |
|----------------------|---------------|--------|
| `C:/Users/rsbiiw/Projects/science_notes.md` | `tests/unit/test_atomic_ingest.ts`, `tests/unit/test_atomic_ingest.js` | Replaced with `/path/to/projects/science_notes.md` |
| `C:/Users/rsbiiw/Projects/pipeline_test.md` | `tests/unit/test_pipeline_integrity.ts`, `tests/unit/test_pipeline_integrity.js` | Replaced with `/path/to/projects/pipeline_test.md` |
| `C:/Users/rsbiiw/Projects/MyProject/src/utils/helper.ts` | `tests/unit/test_atomizer_logic.ts`, `tests/unit/test_atomizer_logic.js` | Replaced with `/path/to/projects/MyProject/src/utils/helper.ts` |
| `c:/Users/rsbiiw/Projects/anchor-engine-sync/engine/context_data` | `tests/verification_search.ts` | Replaced with `/path/to/projects/anchor-engine-sync/engine/context_data` |
| `C:\\Users\\rsbiiw\\Projects\\Coding-Notes\\...` | `user_settings.json` (watcher `extra_paths`) | Replaced with `C:\\Users\\[USERNAME]\\Projects\\...` |
| `C:\\Users\\rsbiiw\\Projects\\models\\[model].gguf` | `.vscode/settings.json` (Cline model path) | Replaced with `C:\\Users\\[USERNAME]\\Projects\\models\\[MODEL_FILENAME].gguf` |
| `c:\Users\rsbiiw\Projects\anchor-engine-node\backups\` | `specs/standards/STANDARD_116_PHOENIX_PROTOCOL.md` | Replaced with `[LOCAL_PROJECT_ROOT]\backups\` |
| `C:\Users\rsbii\Projects\anchor-engine-node\...` | `specs/security-guide.md` | Replaced with `[LOCAL_PROJECT_ROOT]\...` |

### 3. Internal / VPN IP Address

| Pattern | Files Affected | Action |
|---------|---------------|--------|
| `100.74.174.76` (Tailscale/VPN LLM server) | `user_settings.json`, `engine/user_settings.json`, `specs/standards/102-centralized-configuration-management.md` | Replaced with `localhost` |

### 4. Possibly Sensitive Installation Paths

| Pattern | Files Affected | Action |
|---------|---------------|--------|
| `C:\Users\ECE_Core\...` (old project username path) | `specs/archive-legacy/troubleshooting_cozo_windows.md` | Replaced with `C:\Users\[USERNAME]\...` |

---

## Files Modified

| File | Sensitive Data Removed |
|------|----------------------|
| `specs/standards/STANDARD_117_ARXIV_SUBMISSION.md` | Personal email |
| `specs/standards/STANDARD_116_PHOENIX_PROTOCOL.md` | Personal local path |
| `specs/security-guide.md` | Personal local path |
| `specs/standards/102-centralized-configuration-management.md` | Internal IP address |
| `specs/archive-legacy/troubleshooting_cozo_windows.md` | Old installation path |
| `tests/unit/test_atomic_ingest.ts` | Personal local path |
| `tests/unit/test_atomic_ingest.js` | Personal local path |
| `tests/unit/test_pipeline_integrity.ts` | Personal local path |
| `tests/unit/test_pipeline_integrity.js` | Personal local path |
| `tests/unit/test_atomizer_logic.ts` | Personal local path |
| `tests/unit/test_atomizer_logic.js` | Personal local path |
| `tests/verification_search.ts` | Personal local path |
| `user_settings.json` | Personal local paths + internal IP |
| `engine/user_settings.json` | Internal IP address |
| `.vscode/settings.json` | Personal model file path |
| `git_history.txt` | Personal email in historical git author lines |
| `.gitignore` | Added patterns to prevent future commits of sensitive data |

---

## .gitignore Updates

The following patterns were added to `.gitignore` to prevent sensitive data from being re-committed:

```
# Additional sensitive data patterns
**/context_data/
**/databases/
**/personal_contacts/
*secret*
*token*
*credential*
```

These supplement the existing entries already present:
```
.env
.env.*
*.env
user_settings.json
.vscode/
```

---

## Full History Rewrite Instructions

> ⚠️ **CRITICAL WARNING**: These steps permanently rewrite git history. Once force-pushed, **all collaborators must re-clone**. Old clones still contain the original sensitive history.

The current branch (`copilot/sanitize-history`) contains sanitized file contents in the working tree. To also remove sensitive data from **all historical commits**, the repository owner must perform a complete history rewrite using `git filter-repo` locally after merging this PR.

### Step 1: Install git-filter-repo

```bash
pip install git-filter-repo
# or: brew install git-filter-repo
```

### Step 2: Clone a fresh copy for rewriting

```bash
git clone --mirror https://github.com/RSBalchII/anchor-engine-node anchor-engine-node-mirror
cd anchor-engine-node-mirror
```

### Step 3: Create a replacements file

Create a file `/tmp/replacements.txt` with the following content:

```
rsbalchii@gmail.com==>>[REDACTED_EMAIL]
robertbalchii@gmail.com==>>[REDACTED_EMAIL]
rsbiiw==>>[REDACTED_USERNAME]
100.74.174.76==>>[REDACTED_HOST]
```

### Step 4: Run git filter-repo

```bash
git filter-repo --replace-text /tmp/replacements.txt --force
```

This rewrites every commit in the entire history, replacing the sensitive strings with placeholders.

### Step 5: Remove accidentally committed files (if any)

If `.env` files or `user_settings.json` with sensitive data were ever committed, remove them entirely:

```bash
git filter-repo --path .env --invert-paths --force
git filter-repo --path user_settings.json --invert-paths --force
```

### Step 6: Force-push the rewritten history

```bash
git push --force --all
git push --force --tags
```

### Step 7: Collaborator instructions

After force-pushing, **every collaborator must**:

1. **Delete their local clone** — the old clone still has the sensitive history
2. **Re-clone the repository** fresh:
   ```bash
   git clone https://github.com/RSBalchII/anchor-engine-node
   ```
3. Any open pull requests based on the old history will need to be rebased or re-opened against the new base

### Step 8: Rotate any exposed credentials

If any API keys, tokens, or passwords were committed to history, **rotate them immediately** regardless of history rewrite. Treat any committed secret as compromised.

---

## Notes

- The repository currently has a **shallow/grafted history** (2 commits visible in the working environment). The full original history is preserved in `git_history.txt` as a reference for the sanitization scope.
- The `git_history.txt` file itself has been sanitized to replace personal email addresses with `[REDACTED_EMAIL]`.
- `user_settings.json` and `.vscode/settings.json` are already listed in `.gitignore` but were previously tracked. They have been sanitized in-place. Consider running `git rm --cached user_settings.json .vscode/settings.json` after merging to stop tracking these files.
