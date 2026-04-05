/**
 * Context Quality Improvements Test Suite
 *
 * Tests the following improvements made to enhance LLM context coherence:
 * 1. Snippet Coalescing - Merges nearby atoms from same file into coherent snippets (500-1000 chars)
 * 2. Metadata Headers - Each snippet has file, range, timestamp, atom count metadata
 * 3. PhysicsWalker High-Budget Mode - Auto-tunes parameters for queries > 50k chars
 * 4. Progressive Inflation - Top 10% results get 2x radius, next 40% get 1.5x
 *
 * These tests use mock data and can run without a database for CI environments.
 */
export {};
//# sourceMappingURL=test_context_quality_improvements.d.ts.map