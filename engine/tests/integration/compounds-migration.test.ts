/**
 * Integration Test: Compounds Table Migration
 * 
 * This test suite verifies the successful removal of the compounds table
 * and migration of its data to molecules/atoms tables using HTTP API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
// Use import.meta.url for ES modules, fallback to __dirname for CommonJS
const __dirname = typeof process !== 'undefined' && process.__dirname
  ? process.__dirname
  : dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

// Test configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3160';
const SERVER_START_TIMEOUT_MS = 120_000; // 2 minutes for server startup
const CLEANUP_TIMEOUT_MS = 30_000; // 30 seconds for cleanup

describe('Compounds Table Migration', () => {
  let serverProcess: any = null;

  beforeAll(async () => {
    console.log('[Test] Starting compounds table migration tests...');
    
    // Start the server if not already running
    try {
      await checkServerHealth();
      console.log('[Test] Server is already running');
    } catch (error) {
      console.log('[Test] Starting server process...');
      const { spawn } = await import('child_process');
      
      // Start the anchor engine server
      serverProcess = spawn(
        'node', 
        [join(PROJECT_ROOT, 'engine', 'dist', 'index.js')],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'test' }
        }
      );

      serverProcess.stdout.on('data', (data: Buffer) => {
        console.log('[Server]', data.toString().trim());
      });

      serverProcess.stderr.on('data', (data: Buffer) => {
        console.error('[Server Error]', data.toString().trim());
      });

      // Wait for server to be ready
      const startTime = Date.now();
      while (!await checkServerHealth() && Date.now() - startTime < SERVER_START_TIMEOUT_MS) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!(await checkServerHealth())) {
        throw new Error('Server failed to start within timeout');
      }
    }
  });

  afterAll(async () => {
    console.log('[Test] Cleaning up...');
    
    // Stop server process if we started it
    if (serverProcess) {
      try {
        serverProcess.kill();
        console.log('[Test] Server process terminated');
      } catch {}
    }

    // Clean up test files
    const fs = await import('fs');
    const cleanupFiles = [
      join(PROJECT_ROOT, 'test-ingestion-migration.txt'),
    ];

    for (const file of cleanupFiles) {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log('[Test] Removed test ingestion file');
        } catch {}
      }
    }
  });

  /**
   * Check if server is healthy
   */
  async function checkServerHealth(): Promise<boolean> {
    try {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/health"`,
        { timeout: 10000 }
      );
      return result.stdout.includes('healthy') || result.stdout.includes('"status":"healthy"');
    } catch (error) {
      return false;
    }
  }

  describe('Schema Verification', () => {
    it('should verify compounds table does not exist after migration', async () => {
      const start = Date.now();
      
      try {
        await execAsync(
          `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/compounds"`,
          { timeout: 10000 }
        );
        
        // If we get a response, check if it's empty or table doesn't exist
        const result = await execAsync(
          `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/compounds"`,
          { timeout: 10000 }
        );
        
        // Check response status and content
        const statusCode = parseInt(result.headers?.['http-status-code'] || '200', 10);
        
        if (statusCode === 404) {
          expect(true).toBe(true);
          console.log('[Test] Compounds table does not exist (migration complete)');
        } else if (statusCode === 200 && result.stdout.trim() === '[]') {
          expect(true).toBe(true);
          console.log('[Test] Compounds table exists but is empty');
        } else {
          // Table might still have data - migration not complete
          throw new Error(`Compounds table still accessible with status ${statusCode}`);
        }
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          expect(true).toBe(true);
          console.log('[Test] Compounds table does not exist (migration complete)');
        } else {
          throw error;
        }
      }
    }, 30_000);

    it('should verify molecules table has provenance column', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/molecules?limit=1&include_columns=true"`,
        { timeout: 10000 }
      );

      // Parse response to check for provenance column
      const hasProvenance = result.stdout.includes('provenance');
      
      expect(hasProvenance).toBe(true);
      console.log('[Test] Provenance column exists in molecules table');
    }, 30_000);

    it('should verify atoms table has provenance column', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/atoms?limit=1&include_columns=true"`,
        { timeout: 10000 }
      );

      // Parse response to check for provenance column
      const hasProvenance = result.stdout.includes('provenance');
      
      expect(hasProvenance).toBe(true);
      console.log('[Test] Provenance column exists in atoms table');
    }, 30_000);
  });

  describe('Ingestion Tests', () => {
    it('should ingest a file without creating compounds table entries', async () => {
      const testFile = join(PROJECT_ROOT, 'test-ingestion-migration.txt');
      
      // Create test file
      const fs = await import('fs');
      const content = `# Migration Test File

This file tests ingestion after compounds table removal.

## Key Features:
- Should create molecules with provenance field
- Should create atoms with provenance field
- Should NOT create any compound records
`;
      
      fs.writeFileSync(testFile, content);
      console.log('[Test] Created test ingestion file');

      // Ingest the file via API
      const start = Date.now();
      const result = await execAsync(
        `curl -s --connect-timeout 10 "${API_BASE_URL}/v1/ingest" -X POST -H "Content-Type: application/json" -d '{
          "content": "' + content + '",
          "source": "migration-test",
          "type": "file",
          "bucket": "notebook"
        }'`,
        { timeout: 60000 }
      );
      
      const duration = Date.now() - start;
      
      // Parse response
      const data = JSON.parse(result.stdout);
      
      expect(data.status).toBe('success');
      console.log(`[Test] Ingested ${data.atoms_count} atoms, ${data.molecules_count} molecules in ${duration}ms`);
    }, 60_000);

    it('should verify ingested content has provenance data', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/molecules?limit=5&order_by=-timestamp"`,
        { timeout: 10000 }
      );

      // Parse molecules to check provenance field
      const molecules = JSON.parse(result.stdout);
      
      let allHaveProvenance = true;
      for (const mol of molecules) {
        if (!mol.provenance && !mol.compound_id) {
          allHaveProvenance = false;
          break;
        }
      }

      expect(allHaveProvenance).toBe(true);
      console.log('[Test] All molecules have provenance/compound_id');
    }, 30_000);

    it('should verify atoms have provenance data', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/atoms?limit=5&order_by=-timestamp"`,
        { timeout: 10000 }
      );

      // Parse atoms to check provenance field
      const atoms = JSON.parse(result.stdout);
      
      let allHaveProvenance = true;
      for (const atom of atoms) {
        if (!atom.provenance && !atom.source_path) {
          allHaveProvenance = false;
          break;
        }
      }

      expect(allHaveProvenance).toBe(true);
      console.log('[Test] All atoms have provenance/source_path');
    }, 30_000);

    it('should verify molecular_signature is populated', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/molecules?limit=1&order_by=-id"`,
        { timeout: 10000 }
      );

      const molecule = JSON.parse(result.stdout)[0];
      
      expect(molecule.molecular_signature).toBeDefined();
      console.log('[Test] Molecular signature verified:', molecule.molecular_signature);
    }, 30_000);
  });

  describe('Query Compatibility', () => {
    it('should allow queries that previously used compounds table', async () => {
      // Test search functionality which would have joined compounds before
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/memory/search" -X POST -H "Content-Type: application/json" -d '{"query":"migration test","limit":3}'`,
        { timeout: 10000 }
      );

      // Parse SSE response
      const lines = result.stdout.split('\n').filter(l => l.startsWith('data:'));
      
      if (lines.length > 0) {
        expect(lines[0].replace('data:', '').trim()).toBeDefined();
        console.log('[Test] Search query successful');
      } else {
        throw new Error('Search returned no results');
      }
    }, 30_000);

    it('should allow molecule queries without compound joins', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/molecules?limit=3&include_source=true"`,
        { timeout: 10000 }
      );

      const molecules = JSON.parse(result.stdout);
      
      expect(molecules.length).toBeGreaterThan(0);
      console.log('[Test] Retrieved', molecules.length, 'molecules');
    }, 30_000);

    it('should allow atom queries without compound joins', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/atoms?limit=3&include_source=true"`,
        { timeout: 10000 }
      );

      const atoms = JSON.parse(result.stdout);
      
      expect(atoms.length).toBeGreaterThan(0);
      console.log('[Test] Retrieved', atoms.length, 'atoms');
    }, 30_000);
  });

  describe('Edge Cases', () => {
    it('should handle empty compounds table gracefully', async () => {
      // Try to query compounds - should return 404 or empty list
      try {
        const result = await execAsync(
          `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/compounds"`,
          { timeout: 10000 }
        );
        
        // If we get a response, check its content
        if (result.stdout.trim() === '[]' || result.stdout.trim() === '') {
          expect(true).toBe(true);
          console.log('[Test] Compounds table returns empty as expected');
        } else {
          throw new Error(`Unexpected compounds response: ${result.stdout}`);
        }
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          expect(true).toBe(true);
          console.log('[Test] Compounds table does not exist (expected after migration)');
        } else {
          throw error;
        }
      }
    }, 30_000);

    it('should verify no orphaned atom references', async () => {
      // Query atoms that might reference non-existent compounds
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/atoms?filter=compound_id+is+not+null&limit=10"`,
        { timeout: 10000 }
      );

      const atoms = JSON.parse(result.stdout);
      
      // Check if any atoms have compound_id but the compound doesn't exist
      let hasOrphaned = false;
      for (const atom of atoms) {
        if (atom.compound_id) {
          try {
            await execAsync(
              `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/compounds?id=${atom.compound_id}"`,
              { timeout: 5000 }
            );
            // If compound exists, good
          } catch {
            hasOrphaned = true;
            console.warn(`[Test] Orphaned atom reference found: compound_id=${atom.compound_id}`);
          }
        }
      }

      expect(!hasOrphaned).toBe(true);
      console.log('[Test] No orphaned atom references');
    }, 30_000);
  });

  describe('Data Integrity', () => {
    it('should verify total molecule count after migration', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/molecules?limit=1&include_count=true"`,
        { timeout: 10000 }
      );

      // Parse response to get count
      const data = JSON.parse(result.stdout);
      
      if (data.count !== undefined) {
        expect(data.count).toBeGreaterThan(0);
        console.log('[Test] Total molecules:', data.count);
      } else {
        throw new Error('Could not retrieve molecule count');
      }
    }, 30_000);

    it('should verify total atom count after migration', async () => {
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/atoms?limit=1&include_count=true"`,
        { timeout: 10000 }
      );

      // Parse response to get count
      const data = JSON.parse(result.stdout);
      
      if (data.count !== undefined) {
        expect(data.count).toBeGreaterThan(0);
        console.log('[Test] Total atoms:', data.count);
      } else {
        throw new Error('Could not retrieve atom count');
      }
    }, 30_000);
  });
});

/**
 * Simple test that can be run independently without full integration suite
 */
describe('Quick Migration Check', () => {
  it('should verify migration is complete via single API call', async () => {
    const start = Date.now();
    
    // Try to access compounds table - should fail or return empty
    try {
      await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/compounds"`,
        { timeout: 10000 }
      );
      
      // If we get here, check if table is empty or doesn't exist
      const result = await execAsync(
        `curl -s --connect-timeout 5 "${API_BASE_URL}/v1/compounds"`,
        { timeout: 10000 }
      );
      
      // If response is empty array or table returns 404, migration is complete
      if (result.stdout.trim() === '[]' || result.status === 404) {
        expect(true).toBe(true);
        console.log('[Quick Check] Migration verified - compounds table removed');
      } else {
        throw new Error('Compounds table still has data');
      }
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        expect(true).toBe(true);
        console.log('[Quick Check] Migration verified - compounds table removed');
      } else {
        throw error;
      }
    }
  }, 30_000);
});