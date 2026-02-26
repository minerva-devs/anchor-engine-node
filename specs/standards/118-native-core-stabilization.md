# Standard 118: Native Core Stabilization & N-API Migration

**Date:** February 2026
**Status:** ✅ ACTIVE
**Applies To:** Core Engine, N-API Bindings, C++ Physics Walker, SQLite Integration

---

## 1. Context & Pain Points

In early 2026, the Anchor Engine underwent a significant architectural shift from a PGlite-hosted recursive SQL CTE graph walker to a dedicated C++ Physics Walker accessed via N-API. This migration addressed several crippling performance and stability bottlenecks identified in the legacy architecture.

### Major Pain Points Identified in Recent Commits
1.  **N+1 Query Overhead in Graph Traversal:** 
    The initial C++ `PhysicsWalker` implementation queried the SQLite database for edges one node at a time (`db.getEdgesFrom(current_id)`). In deep or wide semantic graphs, an N+1 query problem emerged, resulting in thousands of individual SQL queries per search request and immense I/O lag.
2.  **SimHash Serialization Costs:** 
    64-bit SimHash values were initially stored as `TEXT` (hex strings) in SQLite and parsed back to integers in C++. This constant string serialization/deserialization bloated the database index and incurred a massive CPU overhead during geometric deduplication and traversal.
3.  **FFI Threading and V8 Crash Instability:** 
    Early N-API bindings silently swallowed C++ exceptions, causing memory leaks or unpredictable V8 Node.js crashes. Furthermore, returning dynamically allocated FFI strings back to Node.js without proper memory boundaries or `thread_local` thread safety caused race conditions during parallelized context inflation.
4.  **Prepared Statement Latency:**
    Continuous instantiation and destruction (`sqlite3_prepare_v2` / `sqlite3_finalize`) of SQL statements for high-frequency methods (like fetching atom metadata) drastically slowed down the ingestion and search pipelines.

---

## 2. Enshrined Solutions & Architectural Standards

To prevent these regressions, the following structural patterns are now MANDATORY for all C++ and N-API code within the Anchor Core.

### 2.1. Batched N+1 Query Alleviation
**Standard:** Never execute iterative SQL queries inside loops for graph resolution.
*   **Implementation:** The C++ `PhysicsWalker` uses dynamic, variable-length `IN (...)` SQLite clauses. Edge relationships and structural Atom metadata are bulk-fetched level-by-level during the Breadth-First Search (BFS).
*   **Result:** A massive reduction in the gross number of SQLite executions per graph walk, compounding speed linearly with semantic depth.

### 2.2. Native Type Preservation (SimHash as INTEGER)
**Standard:** All numeric identifiers and bitwise hashes MUST be stored natively.
*   **Implementation:** SQLite `INTEGER` fields seamlessly map to C++ `uint64_t`/`int64_t`. SimHashes are now stored directly as `INTEGER`, dropping the `TEXT` hex-string representation.
*   **Result:** Smaller disk footprint, faster index traversal, and zero parse overhead in C++.

### 2.3. C++ FFI Safety Boundaries
**Standard:** All N-API (FFI) bindings must exhibit strict boundary safety.
*   **Implementation:** 
    1.  **Explicit Exception Catching:** Every FFI wrapper must enclose C++ logic in `try { ... } catch (const std::exception& e)` blocks. Errors must be serialized to JSON and returned as strings to Node.js, not allowed to crash V8.
    2.  **Thread Local Returns:** FFI methods returning structs or serialized JSON strings must use `thread_local` memory buffers to avoid multi-threading race conditions on the V8 engine heap when accessed asynchronously.

### 2.4. SQLite Prepared Statement Caching
**Standard:** Frequently executed CRUD operations must use cached prepared statements.
*   **Implementation:** the C++ `Database` wrapper utilizes an internal `std::unordered_map<std::string, sqlite3_stmt*>` for statement pooling. 
*   **Rules:** Statements are cached during the first execution and subsequently reused via `sqlite3_reset()` and `sqlite3_clear_bindings()`. Memory must be released via `sqlite3_finalize` strictly during the database destructor.

### 2.5. Parallel Context Assembly 
**Standard:** High-throughput CPU-bound workloads (like string parsing and search radius inflation) must be asynchronous and parallelized.
*   **Implementation:** The search loop optimizes repeated lowercasing and defers Context/Radial Inflation to background `Promise.all` streams via N-API to prevent Node.js main-thread blocking.

---

These stabilization patterns embody the core requirements for the Native Engine transition, validating the "Iron Lung" approach of passing intensive graph mathematics strictly to C++ while retaining Node.js as the V8 coordination mesh.
