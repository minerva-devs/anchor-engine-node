# User Experience & UI Recursion Workflow Specification

**Version:** 1.0 | **Status:** Active Testing Protocol | **Created:** May 28, 2026

---

## Overview

This document defines the proper human UX workflow for testing Anchor Engine's search and distillation features through an intuitive interface. This workflow emulates real user interactions to test both basic functionality and recursive behavior (search → create file → distill).

**Goal:** Validate that:
1. Search returns high-quality, contextually relevant results for various query types
2. File creation from search UI saves to correct location (`Users/rsbii/Downloads/`)
3. Distillation without seed words produces coherent knowledge graphs
4. Recursion works: search → file save → distill creates meaningful artifacts
5. All operations complete within expected time budgets (1-2 minutes per operation)

---

## Prerequisites & Setup

### 1. Engine Startup (REQUIRED)

#### Option A: Python Wrapper Script (Recommended for LLM Devs) ✅
**Location:** `scripts/engine_server.py`
**Why use this:** Simple, reliable startup without tool_call formatting issues. Just run the script directly.

```bash
# Run from any directory
python scripts\engine_server.py start

# Expected output:
# ✓ PGlite initialized at: ~/.anchor/context_data
# ✓ Anchor Context Engine running on 0.0.0.0:3160
# Health check available at http://localhost:3160/health
```

**Note:** The old `scripts/run-engine.bat` is deprecated - use the Python wrapper instead.

```bash
# Windows - Run from any directory
scripts\run-engine.bat

# Or Python directly
python scripts\engine_server.py start

# Expected output:
# ✓ PGlite initialized at: ~/.anchor/context_data
# ✓ Anchor Context Engine running on 0.0.0.0:3160
# Health check available at http://localhost:3160/health
```

#### Option B: PowerShell Script (Full Setup)
**Location:** `scripts/start-engine.ps1`  
**Use case:** When you need full dependency installation and build.

```powershell
# Run from project root or any directory
.\scripts\start-engine.ps1

# Quiet mode (skip install/build logs)
.\scripts\start-engine.ps1 -Quiet
```

#### Option C: Direct pnpm Commands
**Location:** `package.json` scripts section  
**Use case:** When already in the project directory.

```bash
pnpm start-with-logging

# Expected output:
# ✓ PGlite initialized at: ~/.anchor/context_data
# ✓ Anchor Context Engine running on 0.0.0.0:3160
# Health check available at http://localhost:3160/health
```

---

## Script Locations Reference

| Script | Path | Purpose |
|--------|------|---------|
| **Python Wrapper (NEW)** | `scripts/engine_server.py` | Simple start/stop for LLM devs ✅ |
| **PowerShell Startup** | `scripts/start-engine.ps1` | Full setup with dependency installation |
| **Batch Stop** | `scripts/stop-engine.bat` | Stop only the engine process on port 3160 |
| **Test Runner** | `tests/e2e/ui-verification.test.ts` | Playwright UI tests |
| **GitHub Clone Test** | `tests/e2e/github-clone-e2e.test.ts` | E2E GitHub clone verification |

---

## Quick Start Commands

```bash
# 1. Start the engine (use Python wrapper for simplicity)
scripts\run-engine.bat

# 2. Verify it's running
curl http://localhost:3160/health

# 3. Run UI tests (requires engine running)
pnpm test:e2e

# 4. Stop the engine
scripts\stop-engine.bat
```

**⚠️ CRITICAL:** All tests in this workflow MUST be run with the live engine started via `pnpm start-with-logging`. Do NOT use mock servers, stubs, or test doubles - real API calls are required to validate search, ingestion, and distillation functionality. The UI tests verify end-to-end behavior that can only be validated against a running instance.

### 2. Repository Cloning (via GitHub Modal)
Using the navbar's GitHub modal feature:
- **Repository:** `https://github.com/RSBalchII/anchor-engine-node`
- **Branch:** `main`
- **Action:** Clone to local development environment for testing

---

## Testing Workflow

### Phase 1: Search UI Exploration & Ingestion
**Goal:** Verify the ingestion watchdog and search interface load correctly

#### Step 1.1: Access Search/Settings UI via Navbar
- Click navbar icon → Settings modal opens
- Observe ingestion watchdog status (idle or processing)
- Ensure UI displays version info (`5.2.0`) and health endpoint

#### Step 1.2: Initial Ingestion Test (Optional but Recommended)
- Navigate to ingestion settings in navbar
- Verify "Start Ingestion Watchdog" button functional
- Confirm watchdog starts monitoring `.anchor/inbox/` directory

### Phase 2: Search Testing with Various Query Types
**Goal:** Test search algorithm across different query patterns

#### Step 2.1: Single Name Entity Queries
**Queries to test (one at a time):**

| # | Query Type | Example Query | Expected Behavior |
|---|------------|---------------|-------------------|
| **S1** | Exact entity match | `"Coda C-001"` | Returns songs, lyrics, related artists with high scores |
| **S2** | Named person | `"Robert Fripp"`
| **S3** | Technical term | `"simhash deduplication"` |

**Expected Results:**
- Fast response (< 1 second)
- Results ranked by relevance (not alphabetical)
- Context snippets display correctly
- Tag metadata visible when applicable

#### Step 2.2: Sentence Queries
**Queries to test:**

| # | Query Type | Example Query | Expected Behavior |
|---|------------|---------------|-------------------|
| **S4** | Descriptive sentence | `"How does the STAR algorithm handle temporal decay?"` |
| **S5** | Technical explanation | `"Explain max-recall search strategy in Anchor Engine"` |
| **S6** | Comparison query | `"What are the differences between standard and max-recall searches?"` |

**Expected Results:**
- Multiple context windows returned
- Related concepts discovered via graph traversal (Moons component)
- Temporal decay applied correctly to older documents
- Results deduplicated (40-50% dedup rate post-v5.2.0)

#### Step 2.3: Question Phrase Queries
**Queries to test:**

| # | Query Type | Example Query | Expected Behavior |
|---|------------|---------------|-------------------|
| **S7** | Open question | `"What is the purpose of radial distillation?"` |
| **S8** | Technical how-to | `"How do I configure the ingestion watchdog in settings?"` |
| **S9** | Concept exploration | `"Tell me about the Phoenix Protocol backup system"` |

**Expected Results:**
- High recall with context inflation (up to 618k chars)
- Related entities discovered via multi-hop graph traversal
- Answers synthesized from multiple sources

#### Step 2.4: Advanced Search Features
**Step 2.4.1: Tag-Based Filtering**
- Add `#tags` filter to query UI
- Verify results filtered correctly by tag intersection
- Test with multiple tags (AND logic) or single tag (OR)

**Step 2.4.2: Byte Offset Verification**
- Query for specific technical terms like `"findAnchors"`
- Ensure content boundaries are correct (no partial sentences)
- Verify byte offset tracking works properly

#### Step 2.5: Search UI Features
**Step 2.5.1: Create File Tool Button**
- Locate "Create File" or equivalent tool button in search results UI
- Click on a high-quality result snippet
- Save file to system Downloads folder (`Users/rsbii/Downloads/`)
- Verify filename is descriptive (includes query context)
- Confirm file opens correctly in default editor

**Step 2.5.2: Result Navigation**
- Scroll through paginated results
- Use "Previous/Next" or infinite scroll if implemented
- Verify loading states and error handling
- Test with empty result set (empty query returns all indexed content)

---

### Phase 3: File Creation & Distillation Workflow
**Goal:** Test the complete search → create file → distill pipeline

#### Step 3.1: Save Search Result via Create Tool Button
**Procedure:**
1. Perform a high-quality search (e.g., `"authentication and authorization in Node.js best practices"`)
2. Click "Create File" or equivalent tool button on a result snippet
3. Choose save location: `Users/rsbii/Downloads/`
4. Wait for file to be saved
5. Verify file exists with appropriate name (e.g., `auth-authorization-nodejs-best-practices.md`)
6. Open downloaded file and confirm it contains searchable content
7. **Wait time:** Give UI and engine 10-20 seconds between each operation to ensure full loading

**Expected Behavior:**
- File saves successfully without errors
- Filename is meaningful (not generic like `snippet.txt`)
- Content includes search context, query terms, and relevant excerpts
- No truncation or corruption of content

#### Step 3.2: Distillation Without Seed Words
**Procedure:**
1. Navigate to distill UI via navbar/modal
2. Locate "Distill Corpus" or equivalent input area
3. **Leave seed word field EMPTY (no prior context)**
4. Click "Distill"
5. Wait for distillation process to complete (~1-2 minutes)
6. Save output to text file in appropriate location
7. Review outputs thoroughly and log all events

**Expected Behavior:**
- Distillation completes without errors despite no seed context
- Output contains coherent knowledge graph representation
- Concepts, relationships, and metadata extracted automatically
- Compression ratio reasonable for corpus size
- No hallucinations or fabrication of source material

---

### Phase 4: Recursion Testing (Search → File → Distill)
**Goal:** Validate that the full recursive workflow functions correctly

#### Step 4.1: Full Workflow Execution
**Procedure:**
1. **Search** for a meaningful query (e.g., `"recursive search fallbacks in Anchor Engine"`)
2. **Create File** from a high-quality result snippet via tool button
3. **Distill** the corpus without seed words
4. **Review** all outputs: search results, created file, distillation output
5. **Log** each step with timestamps and any observations
6. **Repeat** with different queries to ensure consistency

#### Step 4.2: Recursion Validation Criteria
- Search returns relevant, diverse results
- File creation captures complete context (not just snippets)
- Distillation produces meaningful knowledge structures without prior seed
- No degradation in quality across recursive steps
- System maintains state correctly between operations

---

## Test Logging & Reporting

### Required Log Fields
For each test operation, record:
1. **Timestamp** (ISO format: `2026-05-28T15:30:45Z`)
2. **Query/Action** (exact search term or UI action performed)
3. **Latency** (response time in milliseconds)
4. **Results Count** (number of results returned, if applicable)
5. **File Path** (if creating/saving files: `C:/Users/rsbii/Downloads/filename.md`)
6. **Distillation Output Location** (where distill output was saved)
7. **Errors/Observations** (any errors, warnings, or unexpected behavior)
8. **User Experience Notes** (subjective quality assessment of results)

### Log File Locations
- Engine logs: `.anchor/logs/search.log`
- Distillation outputs: `.anchor/notebook/distills/`
- Test audit files: `.anchor/logs/.<hash>-audit.json`

---

## Failure Scenarios & Expected Responses

| Scenario | Expected Behavior |
|----------|-------------------|
| **No results for query** | Return empty set or fallback to all-indexed content with appropriate message |
| **Search timeout (>30s)** | Display loading state, then return partial results or retry |
| **File save fails** | Show error dialog with suggested file paths and permissions info |
| **Distillation hangs** | Graceful shutdown with progress indicator showing last completed step |
| **Corrupt download** | File opens in default editor but shows warning about potential issues |

---

## Success Criteria

A test is considered successful when:
1. All queries return results within expected time budget (<30 seconds)
2. Created files contain complete, non-truncated context
3. Distillation outputs are coherent and well-structured
4. Recursion workflow completes without data loss or quality degradation
5. No critical errors appear in `.anchor/logs/` during test execution
6. User experience is smooth and intuitive (no jarring failures)

---

**Last Updated:** May 28, 2026 | **Version:** 1.0 | **Status:** Active Testing Protocol