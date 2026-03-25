# 📚 Anchor Engine Documentation Inventory

## Overview
Total: ~80+ markdown files across the project

---

## 🌳 Documentation Tree

### 📁 Root Level (Project Root)
```
AEN/
├── README.md                          # Main project README
├── CHANGELOG.md                       # Version history
├── CONTRIBUTING.md                    # Contribution guidelines
├── CODE_OF_CONDUCT.md                 # Community standards
├── FRICTIONLESS_SPEC.md               # Frictionless architecture spec
├── BOLT_MEMORY_GUIDE.md               # Bolt memory integration
├── MCP_AGENT_SETUP.md                 # MCP setup instructions
├── ORCHESTRATOR_SETUP.md              # Orchestrator configuration
├── PAIN_POINTS_DOCUMENTATION.md       # Known issues & pain points
├── QWEN_CODE_INTEGRATION.md           # Qwen Code integration guide
├── RECURSIVE_SEARCH_FALLBACKS.md      # Search fallback strategies
├── .ai-instructions.md                # AI assistant instructions
└── .github/
    └── PULL_REQUEST_TEMPLATE.md       # PR template
```

### 📁 docs/ (Main Documentation)
```
docs/
├── INDEX.md                           # Documentation index
├── API.md                             # API documentation
├── DEPLOYMENT.md                      # Deployment guide
├── STANDARDS.md                       # Coding standards
├── TROUBLESHOOTING.md                 # Troubleshooting guide
├── paper.md                           # Academic paper
├── whitepaper.md                      # Project whitepaper
├── STAR_Whitepaper_Executive.md       # Executive summary
├── code-patterns.md                   # Code patterns & conventions
├── MD_FILES_INVENTORY.md              # (This file)
├── arxiv/
│   ├── joss_response.md               # JOSS review response
│   └── review.md                      # Review comments
├── daily/
│   └── TODAY_SUMMARY.md               # Daily summary
├── guides/
│   ├── BUILDING.md                    # Build instructions
│   ├── INSTALL_NPM.md                 # NPM installation
│   └── NPM_PUBLISH_SUMMARY.md         # NPM publishing
├── project/
│   └── PROJECT_STATE_ASSESSMENT.md    # Project assessment
├── reviews/
│   └── code-review-v4.8.1-decision-record.md
└── testing/
    ├── TESTING.md                     # Testing guide
    ├── TESTING_FRAMEWORK_COMPLETE.md  # Framework status
    └── search-test-report.md          # Search test results
```

### 📁 specs/ (Specifications - MOSTLY ARCHIVED)
```
specs/
├── plan.md                            # Project plan
├── spec.md                            # Main specification
├── tasks.md                           # Task list
├── current-standards/                 # ✅ ACTIVE (20 standards)
│   ├── 001-memory-safe-ingestion.md
│   ├── 002-reproducible-benchmarking.md
│   ├── 003-mcp-tool-interface.md
│   ├── 004-streaming-search.md
│   ├── 005-adaptive-concurrency-control.md
│   ├── 006-mobile-search-optimization.md
│   ├── 007-pglite-memory-optimization.md
│   ├── 008-radial-distillation.md
│   ├── 009-illuminate-bfs-traversal.md
│   ├── 010-radial-distillation-v2.md
│   ├── 011-security-hardening.md
│   ├── 012-data-integrity.md
│   ├── 013-wasm-fallback.md
│   ├── 014-operational-visibility.md
│   ├── 015-configuration-management.md
│   ├── 016-mcp-integration-testing.md
│   ├── 017-dependency-validation.md
│   ├── 018-configuration-validation.md
│   ├── 019-code-analysis.md
│   └── 020-ephemeral-database.md
├── archive-standards/history/         # 📦 ARCHIVED (136 standards!)
│   ├── 059-reliable-ingestion.md
│   ├── 065-graph-associative-retrieval.md
│   ├── 077-benchmark-protocol.md
│   ├── ... (133 more)
│   └── legacy-archive/                # Even older
└── archive-legacy/                    # 📦 LEGACY
    ├── architecture-diagrams.md
    ├── atomizer_native.md
    ├── context_assembly_findings.md
    ├── doc_policy.md
    ├── findings_2026_01_19_cozodb_parser_instability.md
    ├── llama_servers.md
    ├── search_patterns.md
    ├── troubleshooting_cozo_windows.md
    ├── troubleshooting_typescript_esmodules.md
    ├── vscode_integration.md
    └── redundant-2026-03/             # Redundant docs
        ├── 094-smart-search-protocol.md
        ├── 105-api-contracts.md
        ├── 200-deployment_security.md
        ├── ARCHITECTURE_DIAGRAMS.md
        ├── Search_Protocol.md
        ├── System_Architecture.md
        └── TROUBLESHOOTING.md
```

### 📁 benchmarks/
```
benchmarks/
├── README.md                          # Benchmark overview
├── baseline-performance.md            # Baseline metrics
└── metrics-documentation.md           # Metrics guide
```

### 📁 tests/
```
tests/
├── README.md                          # Testing overview
├── STREAMLINED_TESTING.md             # Streamlined approach
└── unit/
    └── CONTEXT_QUALITY_TESTS_README.md
```

### 📁 engine/ (Core Engine)
```
engine/
├── TAXONOMY.md                        # Taxonomy documentation
├── src/
│   ├── README.md                      # Engine source overview
│   └── native/
│       └── README.md                  # Native modules
├── docs/
│   └── TAG_MODULATION.md              # Tag modulation
├── context/context/
│   └── README.md                      # Context system
├── data/
│   └── synonym-ring-summary.md        # Synonym data
└── tests/unit/
    └── GITHUB_INGESTION_TESTING.md    # GitHub ingestion tests
```

### 📁 packages/
```
packages/
├── anchor-core/
│   └── README.md                      # Core package
└── anchor-ui/
    ├── TESTING.md                     # UI testing
    └── TESTING_SUMMARY.md             # Test summary
```

### 📁 Other Components
```
integrations/
└── web-dashboard/
    └── README.md                      # Dashboard

mcp-server/
├── README.md                          # MCP server
└── TEST_RESULTS.md                    # Test results

sample-data/
├── README.md                          # Sample data
└── architecture-overview.md           # Architecture

scripts/
└── README.md                          # Scripts

shared/
└── README.md                          # Shared code
```

---

## 📊 Documentation Analysis

### By Category

| Category | Count | Status |
|----------|-------|--------|
| **Root Level** | 12 | ✅ Active |
| **docs/** | 18 | ✅ Active |
| **specs/current-standards** | 20 | ✅ Active |
| **specs/archive-standards** | 136 | 📦 Archive |
| **specs/archive-legacy** | 15 | 📦 Legacy |
| **benchmarks** | 3 | ✅ Active |
| **tests** | 3 | ✅ Active |
| **engine** | 7 | ✅ Active |
| **packages** | 3 | ✅ Active |
| **Other** | 5 | ✅ Active |
| **TOTAL** | **~222** | |

### Problem Areas

1. **Spec Bloat**: 136 archived standards + 20 current = 156 total
   - Many are outdated (CozoDB, old architectures)
   - Hard to find what's actually current

2. **Duplicate Information**:
   - Multiple TROUBLESHOOTING.md files
   - Multiple architecture docs
   - README.md in every directory

3. **Fragmented Testing Docs**:
   - tests/TESTING.md
   - tests/TESTING_FRAMEWORK_COMPLETE.md
   - packages/anchor-ui/TESTING.md
   - packages/anchor-ui/TESTING_SUMMARY.md
   - engine/tests/unit/GITHUB_INGESTION_TESTING.md

4. **Setup Guides Scattered**:
   - MCP_AGENT_SETUP.md (root)
   - ORCHESTRATOR_SETUP.md (root)
   - docs/guides/BUILDING.md
   - docs/guides/INSTALL_NPM.md

---

## 🎯 Recommendations

### Immediate (Before Token Fix)
1. **Consolidate Setup Guides**: Merge all setup into one docs/SETUP.md
2. **Archive Cleanup**: Move specs/archive-standards to external archive repo
3. **Single Testing Guide**: Merge all testing docs into docs/TESTING.md

### Short-term
4. **Standards Index**: Create specs/README.md with current standards only
5. **Troubleshooting Merge**: Single docs/TROUBLESHOOTING.md
6. **Remove Redundant**: specs/archive-legacy/redundant-2026-03/

### Long-term
7. **Documentation Site**: Generate static site from docs/
8. **Auto-archive**: Standards older than 6 months auto-archive
9. **Validation**: CI check for broken internal links

---

## 🔥 Critical Pain Points from Analysis

1. **Token Variable Disaster**: 198-line fix needed due to undefined variable
2. **API Key Chaos**: 3 different defaults across commits
3. **MCP Integration**: 5 commits over 2 days for basic functionality
4. **Configuration Drift**: user_settings.json modified 8 times in 40 commits
5. **Circular Fixes**: Same issues fixed multiple times

**Next Step**: Address token pain point with proper documentation and tests.
