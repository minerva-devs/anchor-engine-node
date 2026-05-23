# 🔍 Task 1: Orphaned File Review - Complete Investigation Guide

**Task Name:** Orphaned File Review - `ingest-updated.ts` Investigation  
**Priority:** HIGH - Critical decision needed before next sprint  
**Estimate:** 30-45 minutes  
**Deliverable:** Decision in `MIGRATION_CLEANUP.md`

---

## 🎯 Your Mission

You are investigating an orphaned route file: `ingest-updated.ts`  
Your goal: Determine whether to keep it, remove it, or merge its contents.

**The file exists but is NOT imported in `api.ts`** - meaning it's currently doing nothing in production.

---

## 📂 Files You Need to Examine

### Primary Files:
- `engine/src/routes/v1/ingest.ts` - Current production ingestion route (IMPORTED in api.ts)
- `engine/src/routes/v1/ingest-updated.ts` - Orphaned file (NOT imported)
- `engine/src/services/ingest/ingest-atomic.js` - Production service
- `engine/src/services/ingest/ingest-atomic-updated.js` - Orphaned service

### Supporting Files:
- `engine/src/routes/api.ts` - Main route registration (check what's imported)
- `.git` directory - If available, use `git log` to find history
- `MIGRATION_CLEANUP.md` - Your report file
- `TASKS_REMAINING.md` - Full task breakdown (reference if needed)

---

## 🔬 Investigation Steps

### Step 1: Read All Four Files (15 minutes)

#### A. Read Production Files:
1. **ingest.ts** (production route)
   - Note: What endpoints it exposes?
   - What validation/middleware is applied?
   - How does it handle errors?
   - Does it have any special features?

2. **ingest-atomic.js** (production service)
   - Note: The ingestion logic
   - Any batch processing?
   - What atomic operations?
   - Any new features or fixes?

#### B. Read Orphaned Files:
3. **ingest-updated.ts** (orphaned route)
   - Compare line-by-line with `ingest.ts`
   - What's different?
   - Are there new fields, parameters, or features?
   - Any breaking changes?

4. **ingest-atomic-updated.js** (orphaned service)
   - Compare with `ingest-atomic.js`
   - What's new or changed?
   - Is it a fix? A feature? A bug fix?
   - Does it have better performance?

**Pro Tip:** Use `diff -u ingest.ts ingest-updated.ts` if diff is available, or manually compare in your editor.

---

### Step 2: Check Git History (10 minutes)

#### If git is available:
```bash
git log --oneline -20 -- engine/src/routes/v1/ingest*.ts
```

Look for:
- When was `ingest-updated.ts` created? (commit date)
- What was the commit message? (key to understanding why)
- Was it ever imported? (check for old imports in git history)
- Were there related commits? (look for migrations, fixes, etc.)

#### If git is NOT available:
- Look at file modification dates (use `ls -la` or `dir` in Explorer)
- Check the file size difference
- Note any obvious code differences

**Document your findings:**
- Creation date of orphaned files
- Git commit hash (if available)
- Summary of what changed

---

### Step 3: Understand the Business Context (10 minutes)

#### Ask Yourself:
- **Why does `api.ts` import BOTH files?** Look at the import statement in `api.ts`:
  ```typescript
  import { setupIngestRoutes } from './v1/ingest.js';
  // Does it also import ingest-updated? Or is there a try-catch fallback?
  ```

- **Is this a feature flag?** Are there environment variables or config that might toggle between them?

- **Is this for rollback?** Is there a deployment pipeline that might need to revert?

- **Is this a versioned API?** Is there any indication of versioning strategy?

- **Did something break?** Look for comments, TODOs, or error handling that might hint at why both exist.

#### Look For:
- `// TODO` or `// FIXME` comments
- `// DEPRECATED` markers
- `// V2` or `// NEXT` annotations
- Feature flag code (e.g., process.env.USE_INGEST_V2)

**Document your findings:**
- Reason for dual existence (if discoverable)
- Any related environment variables
- Comments or markers in the code

---

### Step 4: Evaluate Decision Options (15 minutes)

#### Option A: KEEP BOTH
**When to choose:**
- There's a clear, documented reason (e.g., feature flag, rollback version)
- `ingest-updated.ts` has new, tested features not in production
- Team explicitly decided to keep both (e.g., for gradual migration)

**Questions to answer:**
- Can I find a clear reason in the code or git history?
- Is `ingest-updated.ts` actively maintained?
- Is there a clear plan to merge or deprecate later?

**If YES to all:** Keep both, but add a note in `MIGRATION_CLEANUP.md` explaining why.

#### Option B: REMOVE `ingest-updated.ts`
**When to choose:**
- It's a duplicate with no clear reason
- No active maintenance or recent commits
- `api.ts` imports BOTH with try-catch (suggests it was never meant to be used)
- Git history shows it was orphaned by accident
- No migration plan or documentation exists

**Questions to answer:**
- Is this an accidental duplicate?
- Does it have any new features worth keeping?
- Can I safely delete it?

**If YES to most:** Remove it, but document the reason.

#### Option C: MERGE INTO `ingest.ts`
**When to choose:**
- `ingest-updated.ts` has better/new features
- `ingest.ts` is missing important functionality
- Team wants to consolidate but hasn't done it yet
- Merging is straightforward (not a complete rewrite)

**Questions to answer:**
- Is the merge effort reasonable?
- Will it break existing functionality?
- Is there a clear plan for testing?

**If YES:** Create a merge PR, document the changes.

**Recommendation:** For most cases, Option B (remove) is safest unless there's a documented reason to keep both.

---

## 📝 Your Deliverable

Update `MIGRATION_CLEANUP.md` with a complete investigation report:

### Required Sections:

1. **Investigation Summary**
   - Files read (with timestamps if possible)
   - Key differences found
   - Git history findings (or alternative)

2. **Feature Comparison Table**
   | Feature | ingest.ts | ingest-updated.ts | Notes |
   |---------|-----------|-------------------|-------|
   | Rate limiting | ✓ | ✓ | Same |
   | Atomic operations | ✓ | ✓ | Same |
   | New fields | N/A | N/A | See below |
   | Performance | N/A | N/A | See below |

3. **Decision & Rationale**
   - Chosen action (keep/remove/merge)
   - Justification (2-3 sentences)
   - Risk assessment

4. **Updated MIGRATION_CLEANUP.md Entry**
   ```markdown
   ### 1. Orphaned Route File: `ingest-updated.ts` ✅ **COMPLETE**
   
   **Investigation Findings:**
   - Created: [date if known]
   - Git commit: [hash if available]
   - Reason for existence: [accidental? feature flag? rollback?]
   - Key differences: [list 2-3 major differences]
   
   **Decision:** [Keep/Remove/Merge]
   - **Reason:** [Your justification]
   - **Risk:** [Low/Medium/High]
   - **Action Required:** [Delete file? Update imports? Merge code?]
   
   **Files Affected:**
   - `engine/src/routes/v1/ingest-updated.ts` [DELETE/KEEP/UPDATE]
   ```

---

## 🚨 Important Notes

### ⚠️ DO NOT DELETE YET!

**NEVER** delete a file until you've documented your decision. The deletion step should be in `MIGRATION_CLEANUP.md`, not in the code itself.

### ✅ Safe Practices:
- Read BOTH files thoroughly
- Compare with git history if available
- Check for any runtime dependencies
- Look for feature flags or config toggles
- Document EVERYTHING before making changes

### 🧪 Testing Considerations:
- Is there a test suite? Does it test `ingest-updated.ts`?
- Would deleting it break any tests?
- Are there integration tests that might fail?

### 📦 Deployment Considerations:
- If you remove it, do you need to recompile?
- Are there any compiled artifacts?
- Is this a static file or dynamic?

---

## 🎯 Success Criteria

You successfully complete this task if:

- [x] All four files are read and compared
- [x] Git history is consulted (or alternative investigation)
- [x] A clear decision is made (keep/remove/merge)
- [x] `MIGRATION_CLEANUP.md` is updated with full justification
- [x] The file is either deleted (if removal) or left as-is (if keep/merge)
- [x] No new dead code or dead imports are introduced

---

## 🔗 Related Resources

- **Previous Audit:** `engine/tests/live-fire/route-audit.txt`  
- **Dead Code Report:** `MIGRATION_DEAD_CODE.md`  
- **Task List:** `TASKS_REMAINING.md`  
- **Cleanup Checklist:** `MIGRATION_CLEANUP.md`

---

**Ready to investigate?** Start with Step 1 (read all files). The rest will follow!  

*Task generated by Agent AEN-0. Last updated: 2026-05-23* 
