# Anchor Engine — Documentation Index

**Version:** 5.2.0 | **Updated:** June 5, 2026 | **Status:** ✅ Production Ready

---

## 📚 Quick Navigation

### Getting Started
- **[README.md](../README.md)** — Quick start, installation, usage guide
- **[CHANGELOG.md](../CHANGELOG.md)** — Version history (latest: v5.2.0)
- **[-settings-configs.md](-settings-configs.md)** — Consolidated settings and configurations

### Core Documentation (`docs/`)
| File | Purpose |
|------|---------|
| **[whitepaper.md](whitepaper.md)** | STAR Algorithm whitepaper — theoretical foundation |
| **[paper.md](paper.md)** | Academic paper (JOSS/TechArxiv submission) |
| **[-settings-configs.md](-settings-configs.md)** | Unified configuration reference |

### Architecture & Standards (`specs/`)
| File | Purpose |
|------|---------|
| **[specs/spec.md](../specs/spec.md)** | System specification with architecture diagrams |
| **[specs/plan.md](../specs/plan.md)** | Development roadmap and phased implementation |
| **[specs/tasks.md](../specs/tasks.md)** | Current implementation tasks and priorities |
| **[specs/doc_policy.md](../specs/doc_policy.md)** | Documentation policy — single source of truth for file locations |
| **[specs/ARCHITECTURE.md](../specs/ARCHITECTURE.md)** | Detailed architecture overview |
| **[specs/DATA-MODEL.md](../specs/DATA-MODEL.md)** | Data model: Compound → Molecule → Atom → Tag hierarchy |
| **[specs/ux-ui-recursion-workflow.md](../specs/ux-ui-recursion-workflow.md)** | UX/UI testing workflow |

**Standards:** 34 active architecture standards in **[specs/current-standards/](../specs/current-standards/)**, organized by category:
- Database & Memory (5) · Security (4) · Configuration & Paths (3) · Search & Retrieval (5)
- Distillation (6) · Operations & Logging (3) · Testing (2) · Documentation (1)
- Dependencies (1) · Analysis (1) · Performance (1) · Robustness (1) · Data Integrity (1)

### Source Code (`engine/`)
- **[engine/src/README.md](../engine/src/README.md)** — Source code overview, technology stack (Rust WASM + PGlite)
- **[engine/tests/](../engine/tests/)** — Integration, live-fire, and unit test suites

---

## 🎯 Documentation by Use Case

### "I want to install and run Anchor Engine"
→ Start with **[README.md](../README.md)** — Quick Start section

### "I need API documentation"
→ The API surface is documented in **[specs/spec.md](../specs/spec.md)** and the route files in `engine/src/routes/v1/`

### "Something's not working"
→ Check **[specs/plan.md](../specs/plan.md)** for known risks and mitigations. Runtime logs live in `$HOME/.anchor/logs/`.

### "I need to understand the system architecture"
→ Study **[specs/spec.md](../specs/spec.md)** and **[specs/ARCHITECTURE.md](../specs/ARCHITECTURE.md)**

### "I'm researching the theory behind Anchor Engine"
→ Read **[whitepaper.md](whitepaper.md)** and **[paper.md](paper.md)**

### "I want to understand the search algorithm (STAR)"
→ See **[specs/spec.md](../specs/spec.md#star-search-algorithm)** and the search standards in `specs/current-standards/search-retrieval/`

### "How does distillation work?"
→ Read **[specs/current-standards/distillation/010-radial-distillation-v2.md](../specs/current-standards/distillation/010-radial-distillation-v2.md)**

### "I want to contribute code"
→ Start with **[specs/doc_policy.md](../specs/doc_policy.md)** for conventions, then **[engine/src/README.md](../engine/src/README.md)** for source structure

### "I want to explore standards"
→ Browse **[specs/current-standards/](../specs/current-standards/)** — 34 active standards with full implementation details

---

## 📊 Key Metrics (v5.2.0)

| Metric | Value | Status |
|--------|-------|--------|
| **Context Retrieval** | 618k chars | ✅ +18% vs whitepaper |
| **Memory Peak** | 510MB (idle) | ✅ -70% vs whitepaper |
| **Search Latency** | <200ms (p95, standard queries) | ✅ Optimized |
| **Ingestion Throughput** | 1,200 mol/sec | ✅ Verified |
| **Deduplication Rate** | 40–50% | ✅ With SimHash |
| **Active Standards** | 34 | ✅ Organized by category |
| **WASM Module Size** | ~1.4 MB (4 packages) | ✅ 90% smaller than C++ DLLs |

---

## 🗂️ Document Structure

```
anchor-engine-node/
├── README.md                          # Start here — quick start & usage
├── CHANGELOG.md                       # Version history (v5.2.0)
├── LICENSE                            # AGPL-3.0
├── user_settings.json.template        # Configuration template → $HOME/.anchor/
│
├── docs/                              # User-facing documentation
│   ├── INDEX.md                       # This file
│   ├── whitepaper.md                  # STAR algorithm whitepaper
│   ├── paper.md                       # Academic paper
│   └── -settings-configs.md           # Consolidated configuration reference
│
├── specs/                             # Technical specifications
│   ├── spec.md                        # System specification
│   ├── plan.md                        # Development roadmap
│   ├── tasks.md                       # Current tasks
│   ├── doc_policy.md                  # Documentation policy
│   ├── ARCHITECTURE.md                # Architecture overview
│   ├── DATA-MODEL.md                  # Data model
│   ├── ux-ui-recursion-workflow.md    # Testing workflow
│   ├── current-standards/             # 34 active standards (by category)
│   ├── decisions/                     # Architecture decision records
│   └── INTEGRATIONS/                  # Integration specs
│
├── engine/                            # Anchor Engine implementation
│   ├── package.json                   # WASM dependencies (@rbalchii/*-wasm)
│   ├── src/                           # TypeScript source
│   │   └── README.md                  # Source code overview
│   └── tests/                         # Test suites
│       ├── integration/               # Integration tests
│       ├── live-fire/                 # Live-fire test scripts
│       └── unit/                      # Unit tests
│
├── scripts/                           # Build and operational scripts
│   ├── build.ts                       # TypeScript compilation
│   ├── start-engine-bg.mjs            # Background engine startup
│   └── stop-engine-bg.mjs             # Background engine shutdown
│
└── test-wasm/                         # WASM tree-sitter test harness
    └── README.md
```

---

## 🔬 Recent Updates (v5.2.0)

### Documentation Consolidation
- **Flattened docs/**: Reduced `docs/` to 4 essential files (whitepaper, paper, settings, index)
- **Removed legacy docs**: Deleted 25+ stale .md files that had been superseded by specs or standards
- **Standards consolidation**: All active standards live in `specs/current-standards/` (34 total)

### WASM-Native Architecture (v4.3.0+)
- All performance-critical operations use **Rust-compiled WebAssembly** (`@rbalchii/*-wasm` packages)
- **Zero native compilation** required — runs on Windows ARM64, macOS, Linux without C++ toolchains
- Old C++ N-API modules (`engine/src/native/`) fully removed

### Security Hardening
- Path Traversal Prevention (Standard 025)
- Auth Bypass Prevention (Standard 024)
- API Key Strength Validation (Standard 024)
- Zero-Copy Deduplication (Standard 026)

---

## 🔗 External Resources

- **GitHub Repository:** https://github.com/RSBalchII/anchor-engine-node
- **License:** AGPL-3.0
- **NPM Packages:** @rbalchii/* (Rust WASM modules)
- **DOI:** https://doi.org/10.5281/zenodo.18841399

---

**Last Updated:** June 5, 2026
**Version:** 5.2.0
**Status:** ✅ Production Ready
