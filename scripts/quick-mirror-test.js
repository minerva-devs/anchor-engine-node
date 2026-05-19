#!/usr/bin/env node
/**
 * Quick Mirror & Distillation Test
 * Direct test of the complete flow without complex imports
 */

const fs = require('fs');
const path = require('path);
import { writeContentToMirror } from '../engine/src/services/mirror/write-content-to-mirror.js';
import { createRadialDistiller } from '../engine/src/services/distillation/radial-distiller-v2.js';
import { NOTEBOOK_DIR, PATHS } from '../engine/src/config/paths.js';

async function runQuickTest() {
    console.log('🧪 Quick Mirror & Distillation Test\n');

    // Setup test environment
    const testId = `quick-test-${Date.now().toString().slice(-4)}`;
    
    console(`📋 Test ID: ${testId}`);
    console(`📍 Working Directory: ${process.cwd()}`);
    console(`📝 NOTEBOOK_DIR: ${NOTEBOOK_DIR}`);
    console(`🔗 MIRRORED_BRAIN: ${PATHS.MIRRORED_BRAIN_DIR}\n`);

    // Clean up previous test data
    async function cleanup() {
        try {
            const testDir = `${NOTEBOOK_DIR}/${testId}`;
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
                console(`🗑️  Cleaned: ${testDir}`);
            }

            const mirrorDir = `${PATHS.MIRRORED_BRAIN_DIR}/@${testId}`;
            if (fs.existsSync(mirrorDir)) {
                fs.rmSync(mirrorDir, { recursive: true, force: true });
                console(`🗑️  Cleaned: ${mirrorDir}`);
            }
        } catch (e) {
            console(`⚠️  Cleanup warning: ${e.message}`);
        }
    }

    // Run cleanup on exit
    process.on('exit', () => cleanup());

    try {
        // Step 1: Create test directories
        console('📁 Step 1: Creating test directories...');
        
        const testDir = `${NOTEBOOK_DIR}/${testId}`;
        fs.mkdirSync(testDir, { recursive: true});
        console(`   ✓ Created: ${testDir}\n`);

        // Step 2: Create sample content
        console('📝 Step 2: Creating sample content...');
        
        const sampleContent = `# Quick Mirror Test - ${new Date().toISOString()}

This is a quick test to verify:
1. Ingestion → Database storage
2. Mirror writing (writeContentToMirror)
3. Radial distillation reading from mirrored content

## Expected Results

After running this test, you should see:

✓ Console output showing each step completed successfully
✓ A file created in: ${testDir}/sample.md
✓ A mirror file created in: ${PATHS.MIRRORED_BRAIN_DIR}/@${testId}/${testId}/sample.md
✓ Distillation results with compounds, atoms, and molecules

If you see any errors, please copy the full error message.
`;

        const sampleFile = `${testDir}/sample.md`;
        fs.writeFileSync(sampleFile, sampleContent);
        console(`   ✓ Created: ${sampleFile}`);
        console(`   Size: ${(sampleContent.length / 1024).toFixed(2)} KB\n`);

        // Step 3: Test mirror writing
        console('🔗 Step 3: Testing mirror write...');
        
        try {
            const relativePath = `${testId}/sample.md`;
            
            console(`   - Original path: ${relativePath}`);
            console(`   - Content length: ${sampleContent.length} chars`);

            await writeContentToMirror(relativePath, sampleContent);
            
            console(`   ✓ Successfully wrote to mirror\n`);
        } catch (e) {
            console(`   ❌ Failed to write to mirror:`);
            console(`      Error: ${e.message}`);
            console(`      Stack:\n${e.stack}`);
            process.exit(1);
        }

        // Step 4: Verify mirror file exists
        console('🔍 Step 4: Verifying mirror file...');
        
        const expectedMirrorPath = `${PATHS.MIRRORED_BRAIN_DIR}/@${testId}/${relativePath}`;
        
        if (fs.existsSync(expectedMirrorPath)) {
            console(`   ✓ Mirror file exists:`);
            console(`      Path: ${expectedMirrorPath}`);

            // Verify content matches
            const mirrorContent = fs.readFileSync(expectedMirrorPath, 'utf8');
            
            if (mirrorContent === sampleContent) {
                console(`   ✓ Content verified: MATCH!`);
            } else {
                console(`   ❌ Content mismatch:`);
                console(`      Original size: ${sampleContent.length}`);
                console(`      Mirror size:  ${mirrorContent.length}`);
            }
        } else {
            console(`   ❌ Mirror file NOT FOUND at:`);
            console(`      Expected: ${expectedMirrorPath}`);
            process.exit(1);
        }

        // Step 5: Test radial distillation
        console('\n🔬 Step 5: Testing radial distillation...');
        
        try {
            const distiller = await createRadialDistiller({
                source: `${testId}-distill`,
                max_depth: 2,
                include_metadata: true
            });

            console(`   ✓ Created radial distiller`);

            // Run distillation on the mirrored file
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
                if (result.blocks && Object.keys(result.blocks).length > 0) {
                    console('\n📋 Sample Blocks:');
                    
                    for (const level in result.blocks) {
                        const count = Object.keys(result.blocks[level]).reduce((sum, _) => sum + 1, 0);
                        
                        if (count <= 3) {
                            console(`   ${level}: ${count} blocks`);

                            // Show first block from each type
                            for (const [type, items] of Object.entries(result.blocks[level]).slice(0, 2)) {
                                const sample = Array.isArray(items[0]) ? 
                                    items[0].slice(0, 80) + '...' : 
                                    String(items[0]).slice(0, 100) + '...';
                                
                            console(`       - ${type}: "${sample}"`);
                        }
                    }

                // Clean up test data
                console('\n🧹 Cleaning up test data...');
                await cleanup();

            } catch (e) {
                console(`❌ Test failed at step 5: ${e.message}`);
                console(e.stack);
            } finally {
                console(`\n✅ All tests completed at ${new Date().toISOString()}`);
            }
        } catch (e) {
            console(`❌ Test suite failed: ${e.message}`);
            console(e.stack);
        }
    }

runQuickTest().catch((e) => {
    console.error('\n💥 Test terminated with error:', e);
});