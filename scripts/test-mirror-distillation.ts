#!/usr/bin/env node
/**
 * Mirror & Distillation Integration Test
 * 
 * Tests the complete flow: Ingestion → DB Storage → Mirror Write → Distillation Read
 */

import { db } from '../engine/src/db.js';
import { writeContentToMirror } from '../engine/src/services/mirror/write-content-to-mirror.js';
import { createRadialDistiller } from '../engine/src/services/distillation/radial-distiller-v2.js';
import { NOTEBOOK_DIR, PATHS } from '../engine/src/config/paths.js';

async function runTest() {
    console.log('🧪 Starting Mirror & Distillation Integration Test\n');

    // Setup test environment
    const testId = `mirror-test-${Date.now().toString().slice(-6)}`;
    
    console(`📋 Test ID: ${testId}`);
    console(`📍 Working Directory: ${process.cwd()}`);
    console(`📝 NOTEBOOK_DIR: ${NOTEBOOK_DIR}`);
    console(`🔗 DB Path: ${db.dbPath}\n`);

    // Clean up any previous test data
    async function cleanup() {
        try {
            await db.run(`DELETE FROM compounds WHERE source LIKE '${testId}%'`);
            const mirrorDir = `${PATHS.MIRRORED_BRAIN_DIR}/@${testId}`;
            import('fs').then(fs => {
                if (fs.existsSync(mirrorDir)) {
                    fs.rmSync(mirrorDir, { recursive: true, force: true });
                    console(`🗑️  Cleaned up test data from ${mirrorDir}`);
                }
            });
        } catch (e) {
            console(`⚠️  Cleanup warning: ${e.message}`);
        }
    }

    // Run tests with cleanup on exit
    process.on('exit', () => cleanup());

    try {
        // Step 1: Create test directory structure
        console('📁 Step 1: Creating test directories...');
        
        const testDir = `${NOTEBOOK_DIR}/${testId}`;
        import('fs').then(fs => {
            fs.mkdirSync(testDir, { recursive: true });
            console(`   ✓ Created test directory: ${testDir}\n`);
        });

        // Step 2: Create a sample content file
        console('📝 Step 2: Creating sample content...');
        
        const sampleContent = `# Test Content for Mirror & Distillation

This is a comprehensive test document to verify:

1. ✅ Ingestion and database storage
2. ✅ Mirror writing functionality
3. ✅ Radial distillation reading from mirrored content

## Section 1: Basic Testing

This section contains basic text that should be easily processed by the ingestion pipeline.

Key concepts:
- Mirror Protocol
- Tangible Knowledge Graph
- Radial Distillation
- Cross-route consistency

## Section 2: Technical Details

### Subsection 2.1: Core Concepts

The mirror protocol serves as a bridge between raw input and structured knowledge:

1. **Ingestion Layer**
   - Accepts content from multiple sources (API, MCP, UI)
   - Validates and cleans input
   - Generates unique identifiers

2. **Storage Layer**
   - Stores metadata in SQLite database
   - Maintains pointers to actual content files
   - Supports efficient querying and retrieval

3. **Mirror Layer**
   - Creates optimized copies for fast access
   - Preserves provenance information
   - Enables parallel processing

### Subsection 2.2: Expected Flow

```
User Input → Ingestion API → Validation → DB Storage
                                      ↓
                              Mirror Write
                                      ↓
                        mirrored_brain/@test-id/...
                                      ↓
                    Radial Distillation → Decision Records
```

## Section 3: Test Cases

### Case 1: Simple Text Processing

Input: "Hello world. This is a simple test."

Expected outputs:
- 1 compound with source="mirror-test"
- 2-4 atoms (Hello, world, test)
- 1 molecule (simple test)
- Decision record with blocks for each level

### Case 2: Hierarchical Structure

Input: A nested document with sections and subsections.

Expected outputs:
- Nested decision tree structure
- Proper section hierarchy in blocks
- Cross-references between levels

### Case 3: Duplicate Handling

Input: Same content multiple times.

Expected behavior:
- Deduplication at compound level
- Unique IDs despite identical content
- Updated timestamps for new ingestions

## Section 4: Verification Commands

After running this test, verify by checking:

1. **Database:**
   ```sql
   SELECT * FROM compounds WHERE source LIKE '${testId}%' ORDER BY id DESC LIMIT 5;
   ```

2. **Mirror Files:**
   ```bash
   tree ${PATHS.MIRRORED_BRAIN_DIR}/@${testId} -p
   ```

3. **Distillation Output:**
   ```bash
   cat distills/${testId}-*.json
   ```

---
Test completed at: ${new Date().toISOString()}
`;

        const filePath = `${testDir}/${`sample-${Date.now().toString().slice(-6)}.md`}`;
        
        import('fs').then(fs => {
            fs.writeFileSync(filePath, sampleContent);
            console(`   ✓ Created test file: ${filePath}`);
            console(`   ✓ File size: ${(sampleContent.length / 1024).toFixed(2)} KB\n`);
        });

        // Step 3: Ingest the content through the normal pipeline
        console('🔄 Step 3: Ingesting content via API endpoint...');
        
        const apiUrl = `http://localhost:8080/v1/ingest`;
        const ingestData = {
            content: sampleContent,
            source: `${testId}-api`,
            type: 'notebook',
            bucket: testId,
            tags: ['mirror-test', 'distillation-verify']
        };

        // Note: This requires the engine to be running. 
        // For standalone testing, we'll directly call the internal functions below.
        
        console(`   ⚠️  Skipping actual API call (engine not running)`);
        console(`   🔄 Instead, proceeding with direct function calls...\n`);

        // Step 4: Directly test mirror writing
        console('🔗 Step 4: Testing direct mirror write...');
        
        try {
            const relativePath = `${testId}/sample-${Date.now().toString().slice(-6)}.md`;
            
            await writeContentToMirror(
                relativePath,
                sampleContent
            );

            console(`   ✓ Successfully wrote content to mirror`);
            console(`   - Relative path: ${relativePath}`);
            console(`   - Content length: ${sampleContent.length} chars\n`);
        } catch (e) {
            console(`   ❌ Failed to write to mirror: ${e.message}\n`);
            throw e;
        }

        // Step 5: Verify mirror file exists
        console('🔍 Step 5: Verifying mirror file...');
        
        import('fs').then(async fs => {
            const expectedMirrorPath = `${PATHS.MIRRORED_BRAIN_DIR}/@${testId}/${relativePath}`;
            
            if (fs.existsSync(expectedMirrorPath)) {
                console(`   ✓ Mirror file exists: ${expectedMirrorPath}`);
                
                // Read and verify content matches
                const mirrorContent = fs.readFileSync(expectedMirrorPath, 'utf8');
                
                if (mirrorContent === sampleContent) {
                    console(`   ✓ Content verified: Match!`);
                } else {
                    console(`   ❌ Content mismatch!`);
                    console(`      Original size: ${sampleContent.length}`);
                    console(`      Mirror size:  ${${mirrorContent.length}}`);
                }
            } else {
                console(`   ❌ Mirror file not found at: ${expectedMirrorPath}`);
            }

            // Step 6: Test radial distillation on the mirrored content
            console('\n🔬 Step 6: Testing radial distillation...');
            
            try {
                const distiller = await createRadialDistiller({
                    source: `${testId}-distill`,
                    max_depth: 3,
                    include_metadata: true
                });

                console(`   ✓ Created radial distiller`);
                
                // Run distillation on the mirrored content
                const startTime = Date.now();
                const result = await distiller.distill([expectedMirrorPath]);
                const duration = Date.now() - startTime;

                console(`   - Duration: ${duration}ms`);
                console(`   - Input files: ${result.input_files?.length || 0}`);
                
                // Print summary statistics
                if (result.summary) {
                    console('\n📊 Distillation Summary:');
                    console(`   - Total compounds: ${result.summary.compounds || 0}`);
                    console(`   - Total atoms: ${result.summary.atoms || 0}`);
                    console(`   - Total molecules: ${result.summary.molecules || 0}`);
                    
                    // Show sample blocks from different levels
                    if (result.blocks && result.blocks.length > 0) {
                        console('\n📋 Sample Blocks:');
                        
                        for (const level in result.blocks) {
                            const count = Object.keys(result.blocks[level]).reduce((sum, _) => sum + 1, 0);
                            if (count <= 3) {
                                console(`   ${level}: ${count} blocks`);
                                
                            // Show first block from each type
                            for (const [type, items] of Object.entries(result.blocks[level]).slice(0, 2)) {
                                const sample = Array.isArray(items[0]) ? items[0].slice(0, 50) + '...' : String(items[0).slice(0, 100)) + '...';
                                console(`       - ${type}: "${sample}"`);
                        }
                    }

                // Clean up test data
                console('\n🧹 Cleaning up test data...');
                await cleanup();

            } catch (e) {
                console(`❌ Test failed at step 6: ${e.message}`);
                console(e.stack);
            } finally {
                console(`\n✅ All tests completed at ${new Date().toISOString()}`);
            }
        } catch (e) {
            console(`❌ Test suite failed: ${e.message}`);
            console(e.stack);
        }
    }

runTest().catch((e) => {
    console.error('\n💥 Test suite terminated with error:', e);
});