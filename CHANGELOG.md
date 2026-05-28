# Changelog

All notable changes to Anchor Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-05-28

### Added
- New radial distillation v2 with semantic aggregation across sources
- Memory typing system for better context management
- Temporal cascade for improved search relevance
- New output formats for distillation summaries

### Changed
- Updated path configuration to `.anchor` structure
- Simplified version loading mechanism
- Worker-based GitHub sync for better concurrency

### Fixed
- OOM hardening with better memory management
- Critical bug fixes in search pipeline
- Performance improvements in tag discovery

### Security
- Added API key strength validation (Standard 132)
- Fixed auth bypass vulnerability in `/v1/test/*` endpoints (Standard 131)
- SQL injection fix via parameterized LIMIT clauses (Standard 130)
- Path traversal prevention (Standard 129)

---

## [4.9.5] - 2026-05-24

### Added
- Streaming distillation with real-time output
- UI improvements for search results
- Watchdog process for memory management

### Fixed
- Stability fixes and performance optimizations
- Search cache improvements
- Ephemeral database standard implementation

---

## [4.9.0] - 2026-05-15

### Added
- Agent Discovery service
- Graph Export functionality  
- Ingestion Status API endpoint

---

## [4.8.0] - 2026-03-15

### Added
- MCP server as first-class binary entry point
- Comprehensive Zod validation for all routes
- API documentation with OpenAPI specs

### Changed
- Major reliability and observability improvements
- Performance optimizations for search queries

---

## [4.7.0] - 2026-02-28

### Added
- Streaming search results with incremental delivery
- UI enhancements for better user experience

---

## [4.5.0] - 2026-02-14

### Added
- WASM-based AST parser for code analysis
- Geometric deduplication algorithm
- Buckets system for efficient storage

---

## [4.3.0] - 2026-02-01

### Changed
- Migrated to PGlite-first architecture for ARM64 Windows support
- Removed deprecated native modules

---

## [4.2.2] - 2026-01-28

### Fixed
- License update to AGPLv3 (Dual Licensing Model)

---

## [Previous Versions]

See git history for earlier releases.
