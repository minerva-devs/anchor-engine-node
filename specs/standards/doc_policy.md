# Documentation Policy

**Status:** ✅ Active | **Version:** 2.0 | **Date:** February 23, 2026

---

## Philosophy

Documentation is **executable specification**. It should be:

1. **Discoverable**: Find it in `specs/`, not scattered
2. **Actionable**: Tells you exactly what to do
3. **Living**: Updated with every code change
4. **Minimal**: No duplication, single source of truth
5. **Aligned**: Follows anchor-engine-node structure

---

## Directory Structure

```
anchor-engine-node/
├── docs/                    # Human-readable documentation
│   ├── whitepaper.md        # STAR Algorithm whitepaper
│   ├── ARCHITECTURE_DIAGRAMS.md  # Visual architecture (Mermaid)
│   ├── INDEX.md             # Documentation navigation
│   ├── BIBLIOGRAPHY.bib     # Citation database (project-wide)
│   └── arxiv/               # LaTeX source (arXiv submission)
│       ├── star-whitepaper.tex
│       ├── BIBLIOGRAPHY.bib  # Citation database (LaTeX source)
│       ├── compile.bat
│       └── prepare-submission.bat
├── specs/                   # Technical specifications
│   ├── spec.md              # System specification (LLM-optimized)
│   ├── tasks.md             # Implementation tasks
│   ├── plan.md              # Project timeline
│   └── standards/           # Architecture standards
│       ├── README.md        # Standards index
│       ├── 086-dual_strategy_search.md  # Dual-Strategy Search
│       ├── 113-automatic_max_recall.md  # Automatic Max-Recall
│       ├── 116-phoenix-protocol.md  # Phoenix Protocol
│       ├── 117-arxiv_submission.md  # arXiv Submission
│       ├── RESEARCH_LANDSCAPE.md  # Related work analysis
│       ├── code_style.md    # Coding standards
│       ├── doc_policy.md    # This file
│       └── testing.md       # Testing standards
└── CHANGELOG.md             # Version history (root level)
```

---

## LLM Developer Orientation 🤖

**If you are an LLM being asked to work on this codebase, read these files first in order:**

### 1. `specs/standards/Database_Schema.md` — READ THIS FIRST for any DB work
The database has a **three-tier atoms model** that causes non-obvious bugs if misunderstood:

| Tier | ID prefix | source_path | What it is |
|---|---|---|---|
| Tag stub | `atom_xxx` | `'atom_source'` | Tag vocabulary node — NOT content |
| **Content** | `mol_xxx` | real file path | **The content you want** |
| Document body | `mem_xxx` | real file path | Full doc — too large for results |

The `tags` table only indexes tag stubs. Content atom tags live in `atoms.tags` (JSONB).  
Edges connect `mem_` → `atom_` only. To get content from a hub, use `atoms.compound_id`.

**If your query returns 0 results, tag stubs, or full documents:** re-read `Database_Schema.md`.

### 2. `specs/standards/Search_Protocol.md` — for search and illuminate work
Defines the explore/illuminate semantic split, BFS traversal strategy, and prefix routing.

### 3. `specs/standards/128-illuminate-bfs-traversal.md` — for explore/illuminate specifically
Full three-phase illuminate architecture, PGlite WASM chunk limits, and query patterns.

### 4. `specs/standards/105-api-contracts.md` — for API work
All endpoint contracts with request/response shapes.

### 5. `specs/spec.md` — for overall system understanding
LLM-optimized system overview, architecture, and component map.

---


### 1. Whitepaper (docs/whitepaper.md)

**Purpose:** Academic/research paper for arXiv submission

**Audience:** Researchers, academics, technical evaluators

**Content:**
- Abstract
- Mathematical foundation
- System architecture
- Benchmarks
- Related work
- Conclusion

**Update Rule:** Update BEFORE arXiv submission

---

### 2. Architecture Diagrams (docs/ARCHITECTURE_DIAGRAMS.md)

**Purpose:** Visual system understanding for humans

**Audience:** Developers, users, contributors

**Content:**
- Mermaid diagrams
- Component relationships
- Data flow visualization
- Performance benchmarks

**Update Rule:** Update when architecture changes

---

### 3. Technical Specification (specs/spec.md)

**Purpose:** Authoritative system description (LLM-optimized)

**Audience:** LLM developers, implementers

**Content:**
- Architecture diagrams (code-friendly)
- Data models (structs, schemas)
- Algorithm descriptions
- API contracts
- Performance targets

**Update Rule:** Change spec BEFORE changing code

---

### 4. Standards (specs/standards/*.md)

**Purpose:** Enforce consistency across project

**Audience:** All contributors

**Content:**
- Algorithm specifications (086, 113, 116, 117)
- Code style rules
- Documentation templates
- Testing requirements

**Update Rule:** Change when pain point discovered

---

### 5. Research Landscape (specs/standards/RESEARCH_LANDSCAPE.md)

**Purpose:** Position project in research landscape

**Audience:** Researchers, authors, citation managers

**Content:**
- Related work analysis
- Competitive positioning
- Citation guide
- Bibliography references

**Update Rule:** Update when new related work published

---

### 6. arXiv Submission (specs/standards/117-arxiv_submission.md)

**Purpose:** Define arXiv submission workflow

**Audience:** Authors, submitters

**Content:**
- Compilation workflow
- Submission steps
- Metadata requirements
- Post-submission actions

**Update Rule:** Update after each submission

---

### 7. Changelog (CHANGELOG.md)

**Purpose:** User-facing change log

**Audience:** End users, deployers

**Content:**
- New features
- Breaking changes
- Bug fixes
- Performance improvements

**Style:** [Keep a Changelog](https://keepachangelog.com/) format

**Update Rule:** Update WITH each PR/release

---

### 8. Build Process Documentation

**Purpose:** Document build and deployment procedures

**Audience:** Developers, deployers, CI/CD systems

**Content:**
- Build commands and scripts
- Clean build procedures
- Environment-specific configurations
- Deployment checklists

**Build Command:**
```bash
# pnpm build automatically cleans dist folder before compilation
pnpm build
```

**Implementation:** The build script (`package.json`):
```json
{
  "scripts": {
    "build": "pnpm --filter anchor-engine build"
  }
}
```

**Engine build (engine/package.json):**
```json
{
  "scripts": {
    "build": "node -e \"require('fs').rmSync('dist', {recursive:true, force:true})\" && tsc"
  }
}
```

**Key Point:** The `pnpm build` command automatically removes the `dist` folder before TypeScript compilation, ensuring a clean build state. This prevents stale compiled code from causing issues.

**Update Rule:** Update when build process changes

---

## Relationship: arxiv/ vs specs/

### arxiv/ Directory (LaTeX Source)

**Purpose:** arXiv submission materials

**Contents:**
- `star-whitepaper.tex` - LaTeX manuscript
- `BIBLIOGRAPHY.bib` - Citation database (LaTeX source)
- `compile.bat` - Build script
- `prepare-submission.bat` - Package prep

**When to Use:**
- Compiling LaTeX for arXiv
- Submitting to arXiv
- Managing LaTeX-specific concerns

### specs/ Directory (Developer Documentation)

**Purpose:** Developer-accessible knowledge

**Contents:**
- `spec.md` - System specification
- `standards/` - Architecture standards
- `RESEARCH_LANDSCAPE.md` - Related work

**When to Use:**
- Implementing features
- Understanding architecture
- Citing related work
- Following standards

### docs/ Directory (Human Documentation)

**Purpose:** Human-readable documentation

**Contents:**
- `whitepaper.md` - Whitepaper (Markdown version)
- `ARCHITECTURE_DIAGRAMS.md` - Visual diagrams
- `INDEX.md` - Navigation hub
- `BIBLIOGRAPHY.bib` - Project-wide citations

**When to Use:**
- Learning the system
- Visual understanding
- Quick reference
- Citation management

---

## Writing Guidelines

### Tone

- **Direct**: "The function returns..." not "The function should return..."
- **Active voice**: "The system validates..." not "Validation is performed..."
- **Confident**: State requirements, don't hedge

### Formatting

```markdown
# Use ATX headings (# not ##)

**Bold** for emphasis, not italics

`inline code` for:
  - Function names
  - File paths
  - Configuration keys

```rust
// Code blocks with language
pub fn example() -> Result<()> {
    Ok(())
}
```

| Tables | For | Comparisons |
|--------|-----|-------------|

- Bullet lists for non-sequential items
- Numbered lists for steps
```

### Cross-Referencing

```markdown
See [STAR Algorithm](../docs/whitepaper.md#sec:math)
Refer to [Task 1.4](../specs/tasks.md#task-14)
As defined in [Standard 086](086-dual_strategy_search.md)
```

---

## arXiv Workflow

### Step 1: Write in LaTeX

**Location:** `docs/arxiv/star-whitepaper.tex`

**Process:**
1. Write manuscript in LaTeX
2. Compile with `compile.bat`
3. Verify citations, bibliography

### Step 2: Synthesize to specs/

**After arXiv submission:**
1. Create `RESEARCH_LANDSCAPE.md` from Related Work section
2. Create `117-arxiv_submission.md` from submission experience
3. Update `CHANGELOG.md` with arXiv ID

### Step 3: Maintain Consistency

**LaTeX → Markdown:**
- Keep mathematical notation consistent
- Preserve citations
- Update both when major changes occur

**Markdown → LaTeX:**
- Use Markdown for developer docs
- Use LaTeX for formal papers
- Cross-reference between both

---

## Review Checklist

Before merging documentation PR:

- [ ] spec.md updated (if architecture changed)
- [ ] CHANGELOG.md entry added
- [ ] All public APIs documented
- [ ] Code examples compile
- [ ] No TODO comments in released docs
- [ ] Cross-references valid
- [ ] Citations added to BIBLIOGRAPHY.bib

---

## Tools

### Automated Checks

```bash
# LaTeX compilation
cd docs/arxiv
compile.bat

# Check for broken links
# (Manual for now)

# Verify bibliography
cd docs
grep -c "@" BIBLIOGRAPHY.bib
```

### Recommended VS Code Extensions

- rust-analyzer (for Rust code)
- LaTeX Workshop (for LaTeX)
- Markdown Preview Enhanced
- BibTeX Citation Manager

---

## Anti-Patterns

### ❌ Don't Do This

```markdown
# Scattered docs
project/
├── docs/
├── README.md
├── INSTALL.md
├── ARCHITECTURE.md
└── TODO.md
```

```markdown
# Duplicate content
docs/whitepaper.md  # Full paper
specs/spec.md       # Same content again
```

### ✅ Do This

```markdown
# Centralized docs
anchor-engine-node/
├── docs/           # Human-readable
├── specs/          # Technical specs
└── docs/arxiv/     # LaTeX source
```

```markdown
# Single source of truth
docs/arxiv/star-whitepaper.tex  # LaTeX (arXiv)
docs/whitepaper.md              # Markdown (developers)
specs/spec.md                   # LLM-optimized
```

---

## Versioning

**Single source of truth:** root `package.json`

To release a new version run `npm version patch|minor|major` from the repository root. The `postversion` hook (`scripts/sync-version.mjs`) automatically propagates the new version to:

- `engine/package.json`
- `README.md` (**Version:** badge line)

**Never manually edit** the version in `engine/package.json` or `README.md`.

| Document | Version Strategy |
|----------|------------------|
| `package.json` (root) | **Authoritative source** — bump with `npm version` |
| `engine/package.json` | Auto-synced by `postversion` hook |
| `README.md` | Auto-synced by `postversion` hook |
| `CHANGELOG.md` | Per-release, manually authored |
| `standards/*` | Updated as needed |
| `whitepaper.md` | Updated every arXiv release |

---

## Related Standards

- **Database_Schema.md:** Full ERD, three-tier atoms model, query patterns ← **start here for DB work**
- **Standard 086:** Dual-Strategy Search
- **Standard 113:** Automatic Max-Recall
- **Standard 116:** Phoenix Protocol
- **Standard 117:** arXiv Submission
- **Standard 128:** Illuminate/Explore BFS traversal

---

**Maintained by:** Anchor Engine Team  
**Last Updated:** 2026-03-08  
**Next Review:** After arXiv submission
