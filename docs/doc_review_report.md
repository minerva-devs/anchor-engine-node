# Documentation Policy Review Report

**Date:** 2026-05-18  
**Policy Version:** 2.0 (doc_policy.md)  
**Status:** In Progress

---

## Executive Summary

The documentation structure has been reviewed against the doc_policy.md requirements. Several issues were identified:

1. **Root directory** contains files outside the allowed list
2. **Specs directory** has an implementation plan file that should be relocated
3. **Docs directory** is properly structured and compliant

---

## 1. Root Directory Analysis

### ✅ Allowed Files (Compliant)
| File | Status |
|------|--------|
| `README.md` | ✅ Present |
| `CHANGELOG.md` | ✅ Present |
| `LICENSE` | ✅ Present |
| `.gitignore` | ✅ Present |
| `package.json` | ✅ Present |
| `user_settings.json` | ✅ Present |

### ⚠️ System Files (Exempt from policy)
These are runtime/system files that should remain in root:
| File | Notes |
|------|-------|
| `AGENTS.md` | Agent configuration - exempt |
| `HEARTBEAT.md` | Heartbeat configuration - exempt |
| `MEMORY.md` | Memory index - exempt |
| `PROFILE.md` | User profile - exempt |
| `agent.json` | Agent state - exempt |
| `chats.json` | Chat history - exempt |
| `skill.json` | Skill config - exempt |
| `jobs.json` | Job scheduler - exempt |

### ❌ Prohibited Files (Need Removal)
| File | Action |
|------|--------|
| `BOOTSTRAP.md` | Move to `docs/guides/bootstrap.md` |
| `CROSS_PLATFORM_SETUP.md` | Move to `docs/guides/cross-platform.md` |
| `SOUL.md` | Review content, likely move to `docs/` |
| `tasks.md` | Move to `specs/tasks.md` (already exists there) |

### ⚠️ Temporary/Build Files (Should Be Cleaned)
| File | Recommendation |
|------|----------------|
| `test-output.txt` | Remove (test artifact) |
| `test_results.txt` | Remove (test artifact) |
| `test-wasm/` | Remove (test directory) |
| `logs/` | Remove or archive (log directory) |
| `temp_*.txt` | Remove (temporary files) |
| `temp_*.py` | Remove (temporary scripts) |
| `verify_*.py` | Remove (verification scripts) |
| `fix_*.py` | Remove (temporary fix scripts) |
| `user_settings.json.template` | Remove or move to `docs/` |
| `setup-user-config.mjs` | Remove or move to `docs/` |
| `sample-data/` | Move to `docs/samples/` |
| `install.sh` | Move to `docs/installation/` |
| `install-macos.sh` | Move to `docs/installation/` |
| `install.ps1` | Move to `docs/installation/` |
| `paper.bib` | Move to `docs/whitepaper/` |

---

## 2. Specs Directory Analysis

### ✅ Core Files (Compliant)
| File | Status |
|------|--------|
| `spec.md` | ✅ Present |
| `plan.md` | ✅ Present |
| `tasks.md` | ✅ Present |
| `doc_policy.md` | ✅ Present |

### ❌ Prohibited Files
| File | Issue | Action |
|------|-------|--------|
| `security-update-plan.md` | Implementation plan, not architecture spec | Move to `docs/guides/security-updates.md` |

### ✅ Subdirectories (Compliant)
- `current-standards/` - 26 active standards (001-026)
- `archive-legacy/` - Historical standards
- `decisions/` - Architecture decision records

---

## 3. Docs Directory Analysis

### ✅ Structure (Compliant)
The docs directory contains:
- **Whitepaper:** `whitepaper.md`, `paper.md`, `star-whitepaper.tex`
- **API Reference:** `mcp-setup.md`, `mcp-agent.md`
- **Guides:** `QUICK_START.md`, `INSTALL.md`, `code-patterns.md`
- **Testing:** `streamlined-testing.md`, `test-logging-guide.md`
- **Integration:** `github-ingestion-testing.md`

### ⚠️ Files to Review
| File | Note |
|------|------|
| `INDEX.md` | Verify it's a proper index file |
| `RELATED_WORK.tex` | Academic reference, ensure it's archived |
| `joss_response.md` | Journal response, may need archiving |
| `compile.bat` | Build script, verify location |
| `prepare-submission.bat` | Submission script, verify location |

---

## 4. Required Actions

### High Priority (Immediate)
1. **Remove prohibited files from root:**
   - Delete `test-output.txt`, `test_results.txt`
   - Remove `test-wasm/` directory
   - Clear `logs/` directory
   - Remove all `temp_*` files

2. **Move `tasks.md` from root to `specs/`:**
   - Ensure only one copy exists

3. **Move `security-update-plan.md` from `specs/` to `docs/`:**
   - Rename to `security-updates.md` or integrate into `plan.md`

### Medium Priority (This Week)
1. Move `BOOTSTRAP.md` → `docs/guides/bootstrap.md`
2. Move `CROSS_PLATFORM_SETUP.md` → `docs/guides/cross-platform.md`
3. Review `SOUL.md` and move to appropriate location
4. Move `sample-data/` → `docs/samples/`
5. Move installation scripts to `docs/installation/`

### Low Priority (Ongoing)
1. Review and archive academic files (`paper.bib`, `RELATED_WORK.tex`, `joss_response.md`)
2. Organize `docs/` subdirectories for better structure
3. Update `README.md` with references to new documentation locations

---

## 5. File Migration Map

| Current Location | Target Location | Priority |
|-----------------|-----------------|----------|
| `BOOTSTRAP.md` | `docs/guides/bootstrap.md` | Medium |
| `CROSS_PLATFORM_SETUP.md` | `docs/guides/cross-platform.md` | Medium |
| `SOUL.md` | `docs/` (review first) | Medium |
| `tasks.md` (root) | `specs/tasks.md` (already exists) | High |
| `security-update-plan.md` | `docs/guides/security-updates.md` | High |
| `user_settings.json.template` | `docs/guides/user-settings.md` | Low |
| `setup-user-config.mjs` | `docs/guides/setup-config.md` | Low |
| `sample-data/` | `docs/samples/` | Low |
| `install.sh` | `docs/installation/linux.md` | Low |
| `install-macos.sh` | `docs/installation/macos.md` | Low |
| `install.ps1` | `docs/installation/windows.md` | Low |
| `paper.bib` | `docs/whitepaper/references.bib` | Low |
| `test-output.txt` | **DELETE** | High |
| `test_results.txt` | **DELETE** | High |
| `logs/` | **DELETE** | High |
| `temp_*.txt` | **DELETE** | High |
| `temp_*.py` | **DELETE** | High |
| `verify_*.py` | **DELETE** | High |
| `fix_*.py` | **DELETE** | High |
| `test-wasm/` | **DELETE** | High |

---

## 6. Compliance Checklist

After completing the actions above:

- [ ] Root contains only allowed files + system files
- [ ] No prohibited `.md` files in root
- [ ] All technical specifications in `specs/`
- [ ] All user guides in `docs/`
- [ ] No temporary/build files in root
- [ ] `specs/` contains only core files + subdirectories
- [ ] `docs/` contains user-facing documentation

---

## 7. Notes

- The policy distinguishes between **allowed files** and **system files** (runtime state)
- System files like `MEMORY.md`, `PROFILE.md` are exempt from the policy
- Implementation plans should go to `docs/`, not `specs/`
- Architecture standards belong in `specs/current-standards/`