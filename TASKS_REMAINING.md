# Remaining Work Tasks - Sequential Agent Breakdown

**Date:** 2026-05-23  
**Project:** Anchor Engine (v5.1.0 Prep)  
**Current Session:** Codebase Audit & Dead Code Removal  
**Previous Work:** Stats endpoint implemented, API surface audit complete

---

## 📋 Task Breakdown Overview

| Phase | Task | Description | Complexity | Time Estimate |
|-------|------|-------------|------------|---------------|
| **1** | Orphaned File Review | Investigate `ingest-updated.ts` - decide keep/remove/merge | Medium | 30-45 min |
| **2** | Documentation Cleanup | Remove stale bright-nodes reference from `docs/design-patterns.md` | Easy | 10 min |
| **3** | Stale Config Cleanup | Review and remove dream_cron from agent.json if needed | Easy | 10 min |
| **4** | API Documentation | Create comprehensive `docs/testing/API-SURFACE.md` | Medium | 1-2 hours |
| **5** | Live Testing | Test `/v1/stats` endpoint, document any issues | Easy | 15 min |
| **6** | Final Verification | Cross-check all routes, verify no new dead code | Easy | 20 min |

---

## 🔄 Task 1: Orphaned File Review - `ingest-updated.ts`

**Goal:** Determine whether to keep, remove, or merge the orphaned file.

### Sub-tasks:
- [ ] **Read both files:**
  - `engine/src/routes/v1/ingest.ts` (current production)
  - `engine/src/routes/v1/ingest-updated.ts` (orphaned)
  - `engine/src/services/ingest/ingest-atomic.js` (production)
  - `engine/src/services/ingest/ingest-atomic-updated.js` (orphaned)

- [ ] **Compare functionality:**
  - What does each file do?
  - Are there new features in `updated` versions?
  - Are there breaking changes?

- [ ] **Check git history:**
  - When was `ingest-updated.ts` created?
  - What was the commit message?
  - Was it ever imported in production?

- [ ] **Make decision:**
  - [ ] **Keep both:** If they serve different purposes (e.g., feature flag)
  - [ ] **Remove `ingest-updated.ts`:** If it's a duplicate/accident
  - [ ] **Merge into ingest.ts:** If `updated` has better features

### Output Required:
- Decision (keep/remove/merge)
- Git history summary
- Feature comparison table
- Recommended action in `MIGRATION_CLEANUP.md`

**Agent Notes:**
- This is the most important technical decision of this session
- Don't rush - careful review is needed
- Consider future maintainability

**Estimated Time:** 30-45 min  
**Priority:** High - affects codebase structure

---

## 📝 Task 2: Documentation Cleanup - Remove Stale Reference

**Goal:** Clean up the bright-nodes reference in documentation.

### Sub-tasks:
- [ ] **Read current `docs/design-patterns.md`:**
  - Locate the bright-nodes code example (around line 272-276)
  - Understand context - is it in a list of examples?

- [ ] **Decide on removal strategy:**
  - Option A: Comment out and add "DEPRECATED" notice
  - Option B: Remove entirely (if it's just an orphaned example)
  - Option C: Replace with current architecture diagram

- [ ] **Edit the file:**
  - Remove or modify the bright-nodes example
  - Update surrounding context if needed
  - Add a note in changelog about the architecture shift

- [ ] **Verify no other references:**
  - Search for "bright-nodes" in all docs
  - Check if any other files reference this

### Output Required:
- Modified `docs/design-patterns.md` (or git diff showing changes)
- Brief note about why the reference was removed

**Agent Notes:**
- This is a documentation-only task - no code impact
- Be careful not to accidentally remove real code
- This file is for architectural documentation, so clarity is key

**Estimated Time:** 10 min  
**Priority:** Medium - affects documentation quality

---

## 🔧 Task 3: Stale Config Cleanup - Review dream_cron Reference

**Goal:** Review and clean up stale configuration references.

### Sub-tasks:
- [ ] **Verify the file path exists:**
  - `.anchor/notebook/external-inbox/anchor-engine-node/agent.json`
  - Does this file actually exist?
  - If it does, read its contents

- [ ] **Find the dream_cron reference:**
  - Search for "dream_cron" in the file
  - Understand what it's supposed to do

- [ ] **Determine if it's a user config or system config:**
  - If user config → safe to remove
  - If system config → needs more investigation

- [ ] **Make removal decision:**
  - [ ] **Remove:** If it's clearly orphaned
  - [ ] **Keep:** If it might be re-enabled in future (unlikely)

### Output Required:
- Status of dream_cron reference
- Whether it was removed or kept
- Reason for decision

**Agent Notes:**
- If the file doesn't exist, this task is already complete
- If it exists and is user-specific, removal is safe
- Add a note to `MIGRATION_CLEANUP.md` about the cleanup

**Estimated Time:** 10 min  
**Priority:** Low - minor cleanup

---

## 📄 Task 4: API Documentation - Create API-SURFACE.md

**Goal:** Write comprehensive API surface documentation for the Anchor Engine API.

### Sub-tasks:
- [ ] **Gather all route information:**
  - List all 15 route files in `engine/src/routes/v1/`
  - Extract method + path for each route
  - Note any special requirements (rate limiting, auth, etc.)

- [ ] **Structure the documentation:**
  ```markdown
  # API Surface Documentation
  
  ## Overview
  
  ## Authentication & Rate Limiting
  
  ## Endpoint Categories
  
  ### System Management
  - /health
  - /v1/system/*
  - /v1/terminal/*
  
  ### Data Operations
  - /v1/atoms/*
  - /v1/memory/*
  - /v1/ingest/*
  - /v1/search/*
  
  ### Content Management
  - /v1/backup/*
  - /v1/distills/*
  - /v1/encryption/*
  - /v1/buckets/*
  
  ### Integration
  - /v1/github/*
  - /v1/research/*
  
  ## MCP Tools & Resources
  - anchor_list_sources
  - anchor://sources
  
  ## Statistics
  - /v1/stats
  ```

- [ ] **Write detailed descriptions** for each endpoint
  - Request/response schemas (where available)
  - Error codes
  - Examples

- [ ] **Add diagrams** (if possible)
  - Flowchart of typical request paths
  - Data model relationships

- [ ] **Review and refine:**
  - Check against actual behavior
  - Ensure consistency with existing docs
  - Add examples for common use cases

### Output Required:
- Complete `docs/testing/API-SURFACE.md` file
- Optional: PDF/PNG versions of diagrams

**Agent Notes:**
- This is a creative writing task
- Use the route audit data already collected
- Make it useful for both developers and API consumers
- Consider adding a "Quick Start" section

**Estimated Time:** 1-2 hours  
**Priority:** High - affects developer experience

---

## 🔬 Task 5: Live Testing - Verify Stats Endpoint

**Goal:** Test the new `/v1/stats` endpoint and document findings.

### Sub-tasks:
- [ ] **Verify server is running:**
  - Check that `http://localhost:3160/health` responds
  - Confirm port 3160 is in use

- [ ] **Test basic endpoint:**
  ```bash
  curl http://localhost:3160/v1/stats
  ```
  - Verify expected JSON structure
  - Check uptime calculation is reasonable
  - Verify memory RSS is positive

- [ ] **Test database queries:**
  - Confirm db_rows counts are reasonable
  - Check that queries don't time out

- [ ] **Test counters:**
  - Make multiple requests to `/v1/memory/search`
  - Confirm search_count increments
  - Verify the same for /v1/ingest

- [ ] **Document edge cases:**
  - What happens when database is empty?
  - Are there any timeout issues?
  - Any error handling needed?

### Output Required:
- Test results summary
- Any bug reports (if found)
- Suggestions for improvements

**Agent Notes:**
- This is a verification task
- No changes should be made unless critical bugs are found
- Document any edge cases discovered

**Estimated Time:** 15 min  
**Priority:** Medium - verification

---

## ✅ Task 6: Final Verification - Cross-Check All Routes

**Goal:** Ensure no new dead code was introduced during this session.

### Sub-tasks:
- [ ] **Re-scan route files:**
  - Verify all 15 route files still exist
  - Check for any new orphaned files
  - Confirm `ingest-updated.ts` decision is implemented

- [ ] **Check imports:**
  - Verify `api.ts` imports match actual route files
  - Look for any circular imports
  - Check that stats.ts is properly imported

- [ ] **Search for dead code:**
  - Use grep to search for references to deleted endpoints
  - Check for any TODO comments referencing old features
  - Verify no stray console.log statements

- [ ] **Verify documentation consistency:**
  - Cross-check MIGRATION_DEAD_CODE.md with actual state
  - Confirm API-SURFACE.md (when created) matches reality
  - Update MIGRATION_CLEANUP.md with final decisions

### Output Required:
- Final status report
- Updated MIGRATION_CLEANUP.md with all decisions
- Any new documentation needed

**Agent Notes:**
- This is the wrap-up task
- Take time to be thorough
- Celebrate the clean codebase!

**Estimated Time:** 20 min  
**Priority:** Low - verification

---

## 📊 Task Priority Matrix

| Task | Priority | Dependencies | Can Run Before? |
|------|----------|--------------|-----------------|
| 1. Orphaned File Review | High | None | No |
| 4. API Documentation | High | None | No |
| 2. Documentation Cleanup | Medium | None | Yes |
| 3. Stale Config Cleanup | Low | Depends on file existence | Yes |
| 5. Live Testing | Medium | Server running | Yes |
| 6. Final Verification | Low | All others | No |

**Recommended Order:** 1 → 4 → 2 → 3 → 5 → 6  
(This order respects dependencies and minimizes context switching)

---

## 🎯 Handoff Protocol

When handing off a task to a new agent:

1. **Provide context:**
   - What was already done in previous tasks?
   - What files have been modified?
   - Any decisions that were made?

2. **Clear deliverable:**
   - What file should be produced?
   - What quality standard is expected?
   - Any specific format or template to follow?

3. **Known issues:**
   - Any open questions or uncertainties?
   - Things the next agent should be aware of?
   - Risks or time-sensitive considerations?

**Example Handoff Message:**
```
[Task Handoff: Orphaned File Review]

Previous work:
- Stats endpoint implemented
- API surface audited
- MIGRATION_CLEANUP.md created with pending tasks

Task 1: Orphaned File Review

Goal: Decide whether to keep, remove, or merge ingest-updated.ts

Files to read:
- engine/src/routes/v1/ingest.ts
- engine/src/routes/v1/ingest-updated.ts
- engine/src/services/ingest/ingest-atomic.js
- engine/src/services/ingest/ingest-atomic-updated.js

Deliverable:
- Update MIGRATION_CLEANUP.md with decision
- Brief note in team chat

Known issues:
- api.ts currently imports BOTH files with try-catch
- Need to understand why both exist
- Time-sensitive: should decide before next sprint
```

---

## 📝 Next Steps (Immediate)

Based on current session:
1. **Task 1** (Orphaned File Review) should be tackled first - it's the most critical decision
2. **Task 4** (API Documentation) can run in parallel if you have an agent for documentation
3. **Task 5** (Live Testing) can be done anytime the server is running

**Recommendation:** Start with Task 1, then do Task 4 while Task 1 is being investigated.

---

*Generated by Agent AEN-0 for multi-agent collaboration.*  
*Last updated: 2026-05-23*
