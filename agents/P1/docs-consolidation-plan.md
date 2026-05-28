# Docs Consolidation Plan

**Date:** May 25, 2026  
**Policy Reference:** specs/doc_policy.md Section 2.3 (Docs Directory Core Focus Areas)

---

## Current State Analysis

| Location | Files | Compliance Status |
|----------|-------|------------------|
| **docs root** | 26 files + 2 .bat scripts + 1 bib + 1 tex + 1 json | ⚠️ Mixed - Several violations |
| **docs/guides/** | 1 file (compounds-migration.md) | ✅ Good |
| **docs/integrations/** | 2 files (CODE_OF_CONDUCT.md, CONTRIBUTING.md) | ✅ Correct |
| **docs/testing/** | 2 files (API-SURFACE.md, LIVE-FIRE-TEST-SUITE.md) | ✅ Correct |

---

## Violations Identified

### 1. **Prohibited File Types (Section 4)**
- ❌ `CLEANUP_REPORT.md` - Implementation update report (prohibited)

### 2. **Academic Papers in Root (Section 2.3)**
- ⚠️ `BIBLIOGRAPHY.bib`, `RELATED_WORK.tex`, `star-whitepaper.tex`, `compile.bat`, `prepare-submission.bat` - Should be in `docs/arxiv/`
- ⚠️ `paper.md`, `STAR_Whitepaper_Executive.md` - Duplicate content with `whitepaper.md` - consolidate
- ⚠️ `joss_response.md` - Academic correspondence, should be in `docs/arxiv/` or deleted

### 3. **Duplicate MCP Documentation (Redundancy)**
- ⚠️ `mcp-agent.md` AND `mcp-setup.md` - Same topic, different names
- **Action:** Keep one file (`mcp-setup.md` as primary), archive or delete the other

### 4. **Testing Documentation Misplacement**
- ⚠️ `TEST-COVERAGE-GAPS.md` - Should be in `docs/testing/` with a clear naming convention
- ⚠️ `test-logging-guide.md` - Should be in `docs/testing/` with a clear naming convention
- ⚠️ `streamlined-testing.md` - Should be in `docs/testing/` with a clear naming convention

### 5. **Technical Architecture Documentation**
- ⚠️ `STRUCTURE.md`, `TAXONOMY.md` - Should be in `docs/technical/` (not defined in policy but logical extension)
- ⚠️ `code-patterns.md`, `design-patterns.md` - Internal reference docs, should be in `docs/technical/` or `docs/architecture/`

### 6. **Quick Reference & Installation Docs**
- ⚠️ `pglite-quick-reference.md`, `star-algebra-reference.md` - Should be in `docs/reference/` or consolidated into main whitepaper
- ⚠️ `QUICK_START.md`, `INSTALL.md` - Installation docs should be in `docs/INSTALLATION.md` or integrated into README

### 7. **Whitepaper Consolidation Needed**
- ⚠️ Multiple whitepaper files scattered across root
- **Action:** Consolidate into one primary location with versioned sub-files

---

## Consolidation Actions

### Phase 1: Immediate (Delete Prohibited Files)

**Priority: CRITICAL**

1. **DELETE `docs/CLEANUP_REPORT.md`**
   - Reason: Violates Section 4 (Prohibited Documentation Patterns)
   - Impact: Removes a policy violation, but content is already in git history
   - Alternative: If audit trail needed, use `.anchor/logs/` or git commit message

2. **DELETE `docs/BIBLIOGRAPHY.bib`** (move to arxiv/)
   - Reason: Not in docs root (Section 2.3)
   - Action: Move to `docs/arxiv/BIBLIOGRAPHY.bib`

3. **DELETE `docs/RELATED_WORK.tex`** (move to arxiv/)
   - Reason: Not in docs root (Section 2.3)
   - Action: Move to `docs/arxiv/RELATED_WORK.tex`

4. **DELETE `docs/star-whitepaper.tex`** (consolidate)
   - Reason: Duplicate of `whitepaper.md`
   - Action: Merge into `whitepaper.md`, delete this file

5. **DELETE `docs/compile.bat`** (move to arxiv/)
   - Reason: Not in docs root (Section 2.3)
   - Action: Move to `docs/arxiv/compile.bat`

6. **DELETE `docs/prepare-submission.bat`** (move to arxiv/)
   - Reason: Not in docs root (Section 2.3)
   - Action: Move to `docs/arxiv/prepare-submission.bat`

7. **DELETE `docs/joss_response.md`** (move to arxiv/)
   - Reason: Academic correspondence, not a general guide
   - Action: Move to `docs/arxiv/joss_response.md`

8. **DELETE `docs/paper.md`** (consolidate)
   - Reason: Duplicate of `whitepaper.md`
   - Action: Merge content into `whitepaper.md`, delete this file

### Phase 2: Consolidation & Standardization

**Priority: HIGH**

#### MCP Integration
**Keep:** `docs/mcp-setup.md` (rename to `mcp-integration.md` for clarity)
**Archive/Delete:** `docs/mcp-agent.md`

**Action:**
```bash
# Rename primary file
mv docs/mcp-setup.md docs/mcp-integration.md

# Delete duplicate (after verifying no external links)
rm docs/mcp-agent.md

# Update INDEX.md to reflect new name
```

#### Testing Documentation
**Consolidate into:** `docs/testing/` subdirectory

**Action:**
```bash
# Create standardized filenames
mv docs/TEST-COVERAGE-GAPS.md docs/testing/COVERAGE-GAPS.md
mv docs/test-logging-guide.md docs/testing/TEST-LOGGING-GUIDE.md
mv docs/streamlined-testing.md docs/testing/STREAMLINED-TESTING.md

# Delete duplicate from root
rm docs/TEST-COVERAGE-GAPS.md
```

#### Whitepaper Consolidation
**Primary file:** `docs/whitepaper.md` (keep)
**Archive:** `docs/STAR_Whitepaper_Executive.md`

**Action:**
- Merge executive summary from `STAR_Whitepaper_Executive.md` into `docs/whitepaper.md`
- Move `STAR_Whitepaper_Executive.md` to `docs/arxiv/` as a supplementary document
- Or delete entirely if content is redundant

#### Quick References & Technical Docs
**Create new directories (not in policy but logical extension):**

```bash
mkdir docs/reference
docs/technical
```

**Move files:**
```bash
mv docs/STRUCTURE.md docs/technical/ARCHITECTURE.md
mv docs/TAXONOMY.md docs/technical/DATA-MODEL.md
mv docs/code-patterns.md docs/technical/CODE-PATTERNS.md
mv docs/design-patterns.md docs/technical/DESIGN-PATTERNS.md
mv docs/pglite-quick-reference.md docs/reference/PGlite-REFERENCE.md
mv docs/star-algebra-reference.md docs/reference/STAR-ALGEBRA-REFERENCE.md
```

#### Installation & Quick Start
**Option A:** Create `docs/INSTALLATION.md`  
**Option B:** Integrate into README.md

**Action (Option A - creates dedicated guide):**
```bash
# Combine QUICK_START.md and INSTALL.md
cat docs/QUICK_START.md docs/INSTALL.md > docs/INSTALLATION.md

# Delete originals
rm docs/QUICK_START.md
rm docs/INSTALL.md
```

### Phase 3: Final Cleanup & Verification

1. **Delete empty directories** (if any created)
2. **Verify no markdown files in root** (except allowed list)
3. **Verify docs root matches policy**
4. **Update INDEX.md** to reflect new structure

---

## Target State (After Consolidation)

### docs/root/
```
INDEX.md                                    # Main documentation index
whitepaper.md                               # Primary academic paper
mcp-integration.md                          # MCP setup guide
INSTALLATION.md                             # Installation guide (optionally in root per policy)
```

### docs/arxiv/
```
BIBLIOGRAPHY.bib
RELATED_WORK.tex
star-whitepaper.tex (versioned)
compile.bat
prepare-submission.bat
joss_response.md
STAR_Whitepaper_Executive.md
```

### docs/technical/
```
ARCHITECTURE.md (was STRUCTURE.md)
DATA-MODEL.md (was TAXONOMY.md)
CODE-PATTERNS.md
DESIGN-PATTERNS.md
```

### docs/reference/
```
PGlite-REFERENCE.md
STAR-ALGEBRA-REFERENCE.md
```

### docs/testing/
```
COVERAGE-GAPS.md
TEST-LOGGING-GUIDE.md
STREAMLINED-TESTING.md
API-SURFACE.md
LIVE-FIRE-TEST-SUITE.md
```

### docs/guides/
```
compounds-migration.md
```

### docs/integrations/
```
CODE_OF_CONDUCT.md
CONTRIBUTING.md
```

---

## Verification Checklist

- [ ] **docs root has only:** INDEX.md, whitepaper.md, mcp-integration.md (and optionally INSTALLATION.md)
- [ ] **No prohibited files:** CLEANUP_REPORT.md, phase reports, git operation logs, etc.
- [ ] **Arxiv files properly isolated** in `docs/arxiv/`
- [ ] **Technical docs** in `docs/technical/`
- [ ] **Testing docs** in `docs/testing/`
- [ ] **Quick references** in `docs/reference/`
- [ ] **Duplicate MCP docs** removed (keep only mcp-integration.md)
- [ ] **Whitepaper content consolidated** into single primary file
- [ ] **INDEX.md updated** with new structure
- [ ] **No markdown files in project root** (except allowed list)
- [ ] **All existing links in README.md, CHANGELOG.md** updated

---

## Estimated Timeline

- **Phase 1 (Critical):** 30 minutes
- **Phase 2 (Standardization):** 1 hour
- **Phase 3 (Final cleanup):** 30 minutes
- **Total:** 2 hours (can be done in one session)

---

## Rollback Plan

If any issues arise:
1. **Git commit message** documenting the consolidation
2. **Git branch** before making changes
3. **File listing** before and after for audit trail

```bash
# Create backup branch
git branch consolidate-docs-20260525

# Run consolidation
# ...

# If rollback needed:
git checkout consolidate-docs-20260525
```

---

**Document Status:** Draft  
**Action Required:** Review and execute  
**Approver:** Architecture Team  
**ETA:** May 25, 2026 (same day)
