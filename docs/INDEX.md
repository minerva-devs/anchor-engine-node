# Anchor Engine - Documentation Index

**Version:** 5.2.0 | **Updated:** June 3, 2026 | **Status:** ✅ Production Ready

---

## 📊 Recent Updates (v5.2.0 + Testing Cleanup)

### Documentation Consolidation & Duplicates Removed
- **Testing Standards Merged**: Consolidated `docs/testing/LIVE-FIRE-TEST-SUITE.md` into `specs/current-standards/search-retrieval/014-search-algorithm-testing.md` (v2.0.0)
- **Legacy Tests Removed**: Deleted 15 legacy test files from `tests/legacy/` directory (deprecated testing patterns)
- **Empty Directory Removed**: Cleaned up now-empty `docs/testing/` directory

---

## 📚 Quick Navigation

### Getting Started
- **[README.md](../README.md)** - Quick start, installation, usage guide
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history (latest: v5.2.0)
- **[CONTRIBUTING.md](integrations/CONTRIBUTING.md)** - How to contribute

### Core Documentation
- **[whitepaper.md](whitepaper.md)** - STAR Algorithm whitepaper
- **[paper.md](paper.md)** - Academic paper
- **[STANDARDS.md](../specs/current-standards/INDEX.md)** - Active standards index
- **[FRICTIONLESS_SPEC.md](FRICTIONLESS_SPEC.md)** - Frictionless specification
- **[code-patterns.md](code-patterns.md)** - Code patterns
- **[-settings-configs.md](-settings-configs.md)** - Consolidated settings and configurations
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Troubleshooting guide

### Technical Reference
- **[API.md](API.md)** - Complete API reference
- **[endpoints.md](endpoints.md)** - API endpoints detail
- **[common-issues.md](common-issues.md)** - Common issues
- **[STAR_Whitepaper_Executive.md](STAR_Whitepaper_Executive.md)** - Executive summary

### Architecture & Standards
- **[specs/spec.md](../specs/spec.md)** - System specification with diagrams
- **[specs/plan.md](../specs/plan.md)** - Development roadmap
- **[specs/tasks.md](../specs/tasks.md)** - Current tasks
- **[specs/doc_policy.md](../specs/doc_policy.md)** - Documentation policy
- **[docs/guides/versioning-policy.md]** - Versioning and breaking changes guide
- **[docs/guides/pain-points.md]** - Known setup issues & troubleshooting
- **[specs/current-standards/](../specs/current-standards/)** - Active standards (001-026)
- **[specs/archive-legacy/](../specs/archive-legacy/)** - Historical standards (059-136+)

### Development
- **[ai-assistant.md](ai-assistant.md)** - AI assistant integration
- **[refactoring-guide.md](refactoring-guide.md)** - Refactoring guidelines
- **[test-framework-separation.md](test-framework-separation.md)** - Testing framework
- **[search-strategy.md](search-strategy.md)** - Search strategy
- **[engine/src/README.md](../engine/src/README.md)** - Source code overview
- **[tests/README.md](tests/README.md)** - Testing guide
- **[benchmarks/README.md](benchmarks/README.md)** - Benchmarking framework
- **[mcp-server/README.md](mcp-server/README.md)** - MCP server integration

---

## 🎯 Documentation by Use Case

### "I want to install and run Anchor Engine"
→ Start with **[README.md](../README.md)** - Quick Start section

### "I need API documentation"
→ Read **[API.md](API.md)** and **[endpoints.md](endpoints.md)** - Complete API reference with examples

### "I want to deploy to production"
→ Follow **[DEPLOYMENT.md](DEPLOYMENT.md)** - All deployment options

### "Something's not working"
→ Check **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** and **[common-issues.md](common-issues.md)** - Common issues and fixes

### "I need to understand the system architecture"
→ Study **[specs/spec.md](../specs/spec.md)** - System specification with diagrams

### "I'm researching the theory behind Anchor Engine"
→ Read **[whitepaper.md](whitepaper.md)** and **[paper.md](paper.md)** - Academic papers

### "I want to understand the search algorithm"
→ See **[search-strategy.md](search-strategy.md)** - Search strategy and patterns

### "How does distillation work?"
→ Read **[specs/current-standards/010-radial-distillation-v2.md](../specs/current-standards/010-radial-distillation-v2.md)**

### "I want to contribute code"
→ Start with **[CONTRIBUTING.md](integrations/CONTRIBUTING.md)** and **[refactoring-guide.md](refactoring-guide.md)**

### "I want to connect via MCP"
→ See **[mcp-agent.md](mcp-agent.md)** and **[qwen-code.md](qwen-code.md)** - MCP integration

### "I need to write tests"
→ Follow **[TESTING.md](TESTING.md)** and **[test-framework-separation.md](test-framework-separation.md)**

### "I want to explore security standards?"
→ Explore **[specs/current-standards/](../specs/current-standards/)** - 26 active standards (001-026)

---

## 📊 Key Metrics (v5.2.0)

| Metric | Value | Status |
|--------|-------|-------|
| **Context Retrieval** | 618k chars | ✅ +18% vs whitepaper |
| **Memory Peak** | 510MB | ✅ -70% vs whitepaper |
| **Search Latency** | <200ms (p95) | ✅ Optimized |
| **Ingestion Throughput** | 1,200 mol/sec | ✅ Verified |
| **Deduplication Rate** | 40-50% | ✅ With SimHash |
| **Session Index** | NEW in v4.8.0 | ✅ Two-tier retrieval |
| **MCP Write Ops** | NEW in v4.8.0 | ✅ Opt-in ingest |
| **Active Standards** | 26 (001-026) | ✅ Consolidated |
| **Historical Standards** | 45 (059-136+) | ✅ Merged |
| **Documentation Files** | ~20 .md files | ✅ Flattened structure |

---

## 🗂️ Document Structure

```
anchor-engine-node/
├── README.md                      # Start here - Quick start & usage
├── CHANGELOG.md                   # What's new (v5.2.0)
├── CONTRIBUTING.md                # How to contribute
├── LICENSE                        # AGPL-3.0 license
├── user_settings.json             # Configuration source of truth
│
├── docs/                          # Flattened documentation (~20 .md files)
│   ├── whitepaper.md              # STAR algorithm whitepaper
│   ├── paper.md                   # Academic paper (arXiv)
│   ├── BIBLIOGRAPHY.bib           # Academic bibliography
│   ├── star-whitepaper.tex        # LaTeX whitepaper source
│   ├── RELATED_WORK.tex           # Related work documentation
│   ├── compile.bat                # Build script
│   ├── prepare-submission.bat     # Submission script
│   ├── joss_response.md           # JOSS response
│   ├── review.md                  # Review documentation
│   │
│   ├── API.md                     # API reference
│   ├── endpoints.md               # API endpoints detail
│   ├── DEPLOYMENT.md              # Deployment guide
│   ├── TROUBLESHOOTING.md         # Troubleshooting guide
│   ├── common-issues.md           # Common issues reference
│   ├── STANDARDS.md               # Active standards index
│   ├── FRICTIONLESS_SPEC.md       # Frictionless specification
│   ├── code-patterns.md           # Code patterns
│   │
│   ├── ai-assistant.md            # AI assistant guide
│   ├── refactoring-guide.md       # Refactoring guidelines
│   ├── test-framework-separation.md # Testing framework
│   ├── search-strategy.md         # Search strategy
│   ├── search-test-report.md      # Search testing
│   │
│   ├── mcp-agent.md               # MCP agent integration
│   ├── mcp-setup.md               # MCP setup guide
│   ├── qwen-code.md               # Qwen Code integration
│   ├── CLAW-CODE-INTEGRATION.md   # CLAW integration
│   ├── MCP_SEARCH_FIX.md          # MCP search fixes
│   │
│   ├── BUILDING.md                # Building guide
│   ├── INSTALL_NPM.md             # NPM installation
│   ├── NPM_PUBLISH_SUMMARY.md     # NPM publishing
│   ├── orchestrator.md            # Orchestrator guide
│   ├── pain-points.md             # Pain points
│   │
│   ├── TESTING.md                 # Testing framework
│   ├── TESTING_FRAMEWORK_COMPLETE.md # Complete testing
│   ├── TEST_UI_INTEGRATION.md     # UI integration
│   ├── TEST_UI_RUST_INTEGRATION.md # Rust integration
│   │
│   ├── AGENT_CONTROLLED_ENGINE.md # Agent-controlled engine
│   ├── code-review-v4.8.1-decision-record.md # Code review
│   └── TODAY_SUMMARY.md             # Daily summary
│
├── docs/integrations/             # Integration guidelines
│   ├── CODE_OF_CONDUCT.md         # Community conduct rules
│   └── CONTRIBUTING.md            # Contribution guidelines
│
├── specs/
│   ├── spec.md                    # System specification
│   ├── plan.md                    # Development roadmap
│   ├── tasks.md                   # Current tasks
│   ├── doc_policy.md              # Documentation policy
│   ├── current-standards/         # Active standards (001-026)
│   ├── archive-legacy/            # Historical standards (059-136+)
│   └── decisions/                 # Decision records
│
├── engine/
│   └── src/
│       └── README.md              # Source code overview
│
├── tests/
│   └── README.md                  # Testing guide
│
├── benchmarks/
│   └── README.md                  # Benchmarking framework
│
└── mcp-server/
    └── README.md                  # MCP server integration
```

---

## 🎓 Learning Path

### Beginner (Just Getting Started)
1. **[README.md](../README.md)** - Installation & first query
2. **[API.md](API.md)** - API basics
3. **[CHANGELOG.md](../CHANGELOG.md)** - Recent features

### Intermediate (Understanding the System)
1. **[specs/spec.md](../specs/spec.md)** - Full system specification
2. **[search-strategy.md](search-strategy.md)** - Search algorithm
3. **[specs/current-standards/010-radial-distillation-v2.md](../specs/current-standards/010-radial-distillation-v2.md)** - Distillation v2.0
4. **[engine/src/README.md](../engine/src/README.md)** - Source overview

### Advanced (Deep Dive)
1. **[whitepaper.md](whitepaper.md)** - Theoretical foundation
2. **[paper.md](paper.md)** - Academic paper
3. **[specs/current-standards/](../specs/current-standards/)** - All active standards
4. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment

### Contributor (Writing Code)
1. **[CONTRIBUTING.md](integrations/CONTRIBUTING.md)** - Contribution guidelines
2. **[refactoring-guide.md](refactoring-guide.md)** - Source structure
3. **[TESTING.md](TESTING.md)** - Testing requirements
4. **[specs/current-standards/](../specs/current-standards/)** - Architecture standards

---

## 🔬 Recent Updates (v5.2.0 - May 20, 2026)

### Documentation Consolidation & Cleanup
- **Settings Consolidation:** Merged 5 separate settings files into `docs/-settings-configs.md` for unified configuration reference
- **Moved Integration Docs:** CODE_OF_CONDUCT.md and CONTRIBUTING.md relocated to `docs/integrations/` directory
- **Removed Temporary Files:** Deleted `doc_review_report.md` and `github-ingestion-testing.md` (temporary review artifacts)
- **Flattened Structure:** Removed all subdirectories, consolidated ~20 .md files in `docs/`
- **Updated Standards:** Merged 26 active standards (001-026) into `specs/current-standards/`
- **Historical Archive:** Consolidated 45 historical standards (059-136+) into `specs/archive-legacy/`
- **Updated References:** All documentation links now point to consolidated locations

### New Features
- **Session Index** - Two-tier memory retrieval (index → targeted fetch)
- **MCP Write Operations** - `anchor_ingest_text` and `anchor_ingest_file` tools
- **Paste & Ingest UI** - Quick text ingestion via Web UI
- **Philosophy Documentation** - Core principles embedded throughout docs

### Security Hardening
- **Path Traversal Prevention** - Standard 025
- **Auth Bypass Prevention** - Standard 024
- **API Key Strength** - Standard 024
- **Zero-Copy Deduplication** - Standard 026

---

## 📁 Documentation Categories

### User-Facing
| Document | Purpose |
|----------|---------|
| README.md | Quick start & usage |
| DEPLOYMENT.md | Deployment guide |
| TROUBLESHOOTING.md | Fix common issues |
| FRICTIONLESS_SPEC.md | Frictionless experience |

### Developer-Facing
| Document | Purpose |
|----------|---------|
| API.md | API reference |
| refactoring-guide.md | Development guidelines |
| TESTING.md | Testing framework |
| search-strategy.md | Search implementation |

### Academic/Research
| Document | Purpose |
|----------|---------|
| whitepaper.md | STAR algorithm paper |
| paper.md | Academic paper |
| BIBLIOGRAPHY.bib | Research bibliography |
| star-whitepaper.tex | LaTeX source |

### Integration
| Document | Purpose |
|----------|---------|
| mcp-agent.md | MCP integration |
| qwen-code.md | Qwen Code integration |
| CLAW-CODE-INTEGRATION.md | CLAW integration |
| MCP_SEARCH_FIX.md | Search enhancements |

---

## 🔗 External Resources

- **GitHub Repository:** https://github.com/RSBalchII/anchor-engine-node
- **License:** AGPL-3.0
- **NPM Packages:** @rbalchii/* (native modules)
- **DOI:** https://doi.org/10.5281/zenodo.18841399

---

## 📞 Support & Contribution

### Getting Help
- Check **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for common issues
- Review **[specs/spec.md](../specs/spec.md)** for system understanding
- Read **[CHANGELOG.md](../CHANGELOG.md)** for recent fixes

### Contributing
1. Read **[CONTRIBUTING.md](integrations/CONTRIBUTING.md)** for guidelines
2. Review **[refactoring-guide.md](refactoring-guide.md)** for source structure
3. Follow **[specs/current-standards/](../specs/current-standards/)** for architecture
4. Run **[TESTING.md](TESTING.md)** test suite before submitting

---

**Last Updated:** May 20, 2026
**Version:** 5.2.0
**Status:** ✅ Production Ready
