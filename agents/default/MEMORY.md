# Long-Term Memory

## System Architecture

### Multi-Agent Memory Processing Pipeline
- **Purpose**: Extract event chains from JSON session logs across all agent workspaces, write to a single canonical `MEMORY.md`.
- **Location**: `C:\Users\rsbii\.qwenpaw\workspaces\default\.qwenpaw\memory\MEMORY.md`
- **Pipeline**: Processes logs from `sessions\` and `inbox_traces\`, preserving originals.
- **Scheduling**: Runs every 12 hours (morning/night) with MD5-based duplicate tracking.
- **Verification**: Staging files in `staging\` directory; 19 session files processed (13 sessions + 6 inbox traces).

### Centralized Documentation Architecture
- **Problem**: 8 workspaces with 724+ markdown files create navigation and maintenance chaos.
- **Solution**: Single `docs\INDEX.md` mapping all real documentation files across all workspaces.
- **Implementation**: All agent identity files (`SOUL.md`, `AGENTS.md`) reference the central index.
- **Key Insight**: In-use data (`MEMORY.md`, `sessions`, `inbox_traces`) ≠ Documentation for maintainers.
- **Verification**: `verify_docs.py` confirms 100% valid references.

## User Preferences

- **Data Preservation**: Original session logs are never deleted after processing.
- **Incremental Processing**: Prefers systematic, batch-by-batch operations over bulk changes.
- **Verification**: Requires confirmation of file integrity and output correctness before proceeding.
- **Centralized Documentation**: Values a single source of truth for all documentation.
- **Format Separation**: Recognizes the need to clearly distinguish operational data from human-readable docs.
- **Scalability**: Designs systems that work across multiple agents, not just one.

## High-Value Patterns

### Format-Aware Processing
- Different data sources have different JSON structures (`sessions` vs `inbox_traces`).
- Must detect source type first, then extract events accordingly.
- Never assume uniform structure across all inputs.

### Error-First Debugging
- When complex pipelines fail silently, check output files directly.
- Use simple test scripts to verify basic operations before scaling.
- Test incrementally: single file → batch with counter → full pipeline.
- Prefer a simple 5KB Python script over complex bash/PowerShell batch files.

### Cross-Platform File Handling
- Windows console uses cp1252 by default; Unicode checkmarks fail with `'charmap'` codec errors.
- Use ASCII or raw strings for cross-platform reliability in output.
- Path normalization: forward slashes work reliably in Python; Windows batch scripts need proper escaping.
- Silent failures (missing files, zero output) indicate deeper logic issues than surface-level errors.

### Centralized Documentation Maintenance
- Problem: Scattered docs across 8 workspaces (724+ files) are impossible to navigate.
- Solution: Central `INDEX.md` maps all documentation; all agent identity files reference it.
- Scalability: New agents automatically know documentation location via their identity files.
- Verification: Automated scripts maintain link integrity and validity.

### Data vs. Documentation Separation
- **In-use data** (`MEMORY.md`, `SOUL.md`, `sessions`) is operational and read-only for humans.
- **Documentation** (`docs\INDEX.md`, `specs\`, `guides\`) is for maintainers and documentation.
- Clear separation prevents accidental overwrites and improves maintainability.

## Current State

- ✅ Memory pipeline functional and verified.
- ✅ Central documentation system complete and verified (148 lines, ~38 real docs mapped).
- ✅ MCP Server Tools `distill` and `list_distills` implemented in `anchor-engine-node`.
- ✅ All 7 agents reference central documentation index in identity files.
- ✅ 8 agent workspaces (724+ files) now navigable via central index.
- ✅ All original session logs preserved for future distillation.
