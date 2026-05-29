/**
 * GitHub Clone E2E Test Suite - Anchor Engine
 * 
 * End-to-end tests for the GitHub repository cloning functionality
 * with AST parsing verification.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3160';
const GITHUB_REPO_OWNER = 'RSBalchII';
const GITHUB_REPO_NAME = 'anchor-engine-node';
const OUTPUT_DIR_RELATIVE = 'notebook/external-inbox/RSBalchII/anchor-engine-node';

beforeAll(() => {
  console.log('[Test] API URL:', API_URL);
});

describe('GitHub Clone E2E Tests', () => {
  it('should verify target repository exists on GitHub', async () => {
    const repoUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
    
    try {
      const response = await axios.get(repoUrl, { timeout: 10000 });
      expect(response.status).toBe(200);
      
      const data = response.data;
      console.log(`✓ Repository found on GitHub: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Repository not found: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`);
      }
      throw error;
    }
  });

  it('should clone repository via API endpoint', async () => {
    const outputPath = path.join(process.env.ANCHOR_DATA_PATH || process.cwd(), OUTPUT_DIR_RELATIVE);

    console.log(`\nCloning repository...`);
    console.log(`  - Repository: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`);
    console.log(`  - Output path: ${outputPath}`);

    try {
      const cloneResponse = await axios.post(
        `${API_URL}/v1/memory/github/clone`,
        {
          owner: GITHUB_REPO_OWNER,
          repo: GITHUB_REPO_NAME,
          output_dir: OUTPUT_DIR_RELATIVE,
          depth: 0,
        },
        { timeout: 120000 }
      );

      expect(cloneResponse.status).toBe(200);
      const result = cloneResponse.data;
      
      expect(result.success).toBe(true);
      console.log('Clone response:', JSON.stringify(result, null, 2));
      console.log(`✓ Output directory created: ${outputPath}`);
    } catch (error: any) {
      console.error('Clone failed:', error.response?.data || error.message);
      throw error;
    }
  });

  it('should verify cloned repository structure', async () => {
    const outputPath = path.join(process.env.ANCHOR_DATA_PATH || process.cwd(), OUTPUT_DIR_RELATIVE);

    try {
      const entries = await fs.readdir(outputPath, { recursive: true, withFileTypes: true });
      
      console.log(`\nCloned repository structure:`);
      console.log(`  - Total items: ${entries.length}`);
      
      const directories = entries.filter(e => e.isDirectory());
      const files = entries.filter(e => e.isFile());

      expect(directories).toHaveLengthGreaterThan(0);
      expect(files).toHaveLengthGreaterThan(0);

      const hasPackageJson = files.some(f => f.name === 'package.json');
      const hasTsFiles = files.some(f => /\.ts$/.test(f.name));
      
      console.log(`  - Has package.json: ${hasPackageJson}`);
      console.log(`  - Has TypeScript files: ${hasTsFiles}`);

      expect(hasPackageJson).toBe(true, 'package.json should be present');
      expect(hasTsFiles).toBe(true, 'TypeScript source files should be present');
    } catch (error) {
      console.error('Failed to read directory:', error);
      throw error;
    }
  });

  it('should return search results including cloned repository', async () => {
    const outputPath = path.join(process.env.ANCHOR_DATA_PATH || process.cwd(), OUTPUT_DIR_RELATIVE);

    try {
      const searchResponse = await axios.post(
        `${API_URL}/v1/memory/search`,
        {
          query: 'anchor engine node github',
          max_results: 10,
          include_path: outputPath,
        },
        { timeout: 30000 }
      );

      expect(searchResponse.status).toBe(200);
      
      const results = searchResponse.data;
      
      console.log(`Search returned ${Array.isArray(results.results) ? results.results.length : Object.keys(results).length} results`);
      expect(Array.isArray(results.results) ? results.results.length : Object.values(results || {}).length).toBeGreaterThan(0, 'Search should return results');
    } catch (error) {
      console.error('Search failed:', error.response?.data || error.message);
      throw error;
    }
  });

  it('should produce correct distillation results from cloned repository', async () => {
    const outputPath = path.join(process.env.ANCHOR_DATA_PATH || process.cwd(), OUTPUT_DIR_RELATIVE);

    try {
      const distillResponse = await axios.post(
        `${API_URL}/v1/memory/distill`,
        {
          source_path: outputPath,
          max_molecules: 10,
          include_code: true,
        },
        { timeout: 30000 }
      );

      expect(distillResponse.status).toBe(200);
      
      const distillation = distillResponse.data;
      
      if (distillation.molecules && Array.isArray(distillation.molecules)) {
        console.log(`✓ Distilled ${distillation.molecules.length} molecules`);
        expect(distillation.molecules).toHaveLengthGreaterThan(0, 'Should have distilled molecules');
        
        const firstMolecule = distillation.molecules[0];
        if (firstMolecule) {
          expect(firstMolecule.content).toBeDefined();
          expect(typeof firstMolecule.content).toBe('string');
        }
      }

      if (distillation.atoms && Array.isArray(distillation.atoms)) {
        console.log(`✓ Distilled ${distillation.atoms.length} atoms`);
        expect(distillation.atoms).toHaveLengthGreaterThan(0, 'Should have distilled atoms');
      }

      return distillation;
    } catch (error) {
      console.error('Distillation failed:', error.response?.data || error.message);
      throw error;
    }
  });

  it('should create proper directory structure in external-inbox', async () => {
    const outputPath = path.join(process.env.ANCHOR_DATA_PATH || process.cwd(), OUTPUT_DIR_RELATIVE);

    try {
      await fs.access(outputPath, fs.constants.F_OK);
      
      console.log(`✓ Directory structure verified: ${outputPath}`);
    } catch (error) {
      console.error('Directory does not exist:', error);
      throw error;
    }
  });
});

Array.prototype.lengthGreaterThan = function(length: number, message?: string): void {
  if (this.length < length) {
    throw new Error(message || `Expected array length >= ${length}, got ${this.length}`);
  }
};
