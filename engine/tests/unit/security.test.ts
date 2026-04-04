/**
 * Security Utilities Tests
 *
 * Tests for path traversal prevention and path validation utilities.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import {
  validatePathSafety,
  validatePathSafetyWithExistence,
  getSafePath,
  isPathSafe
} from '../../src/utils/security.js';

// Get absolute paths for test fixtures
const TEST_FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'security');
const PROJECT_ROOT = process.cwd();

describe('Security Utilities', () => {
  describe('validatePathSafety', () => {
    it('should allow valid paths within allowed base directory', () => {
      const result = validatePathSafety('./src/index.ts', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, true);
      assert.ok(result.resolvedPath.endsWith('src/index.ts'));
    });

    it('should reject path traversal attempts with ../', () => {
      const result = validatePathSafety('../../../etc/passwd', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error?.includes('Path traversal detected'));
    });

    it('should reject path traversal attempts with ..\\ on Windows', () => {
      const result = validatePathSafety('..\\..\\..\\etc\\passwd', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error?.includes('Path traversal detected'));
    });

    it('should reject absolute paths outside allowed directories', () => {
      const evilPath = process.platform === 'win32' 
        ? 'C:\\Windows\\System32\\config\\SAM'
        : '/etc/shadow';
      const result = validatePathSafety(evilPath, [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, false);
    });

    it('should handle multiple allowed base directories', () => {
      const tempDir = path.join(process.cwd(), 'temp');
      const result = validatePathSafety('./temp/test.txt', [PROJECT_ROOT, tempDir]);
      // Should be valid since it's within PROJECT_ROOT
      assert.strictEqual(result.isValid, true);
    });

    it('should reject empty paths', () => {
      const result = validatePathSafety('', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error?.includes('cannot be empty'));
    });

    it('should reject null/undefined paths', () => {
      const result1 = validatePathSafety(null as any, [PROJECT_ROOT]);
      assert.strictEqual(result1.isValid, false);
      
      const result2 = validatePathSafety(undefined as any, [PROJECT_ROOT]);
      assert.strictEqual(result2.isValid, false);
    });

    it('should handle paths with mixed separators', () => {
      // This is a valid path normalization test
      const result = validatePathSafety('src\\utils/security.ts', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, true);
    });

    it('should allow exact base directory match', () => {
      const result = validatePathSafety(PROJECT_ROOT, [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.resolvedPath, PROJECT_ROOT);
    });

    it('should reject paths that try to escape via symlink-like patterns', () => {
      // Even if the path looks legitimate, it should be validated
      const result = validatePathSafety('src/../../../etc/passwd', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, false);
    });

    it('should handle URL-encoded path traversal attempts', () => {
      // URL-encoded ../ would be %2e%2e%2f or %2e%2e/
      const result = validatePathSafety('%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', [PROJECT_ROOT]);
      // After decoding, this should still be caught
      assert.strictEqual(result.isValid, false);
    });
  });

  describe('validatePathSafetyWithExistence', () => {
    it('should validate path safety and existence for valid files', async () => {
      // Create a temp test file
      const testFile = path.join(process.cwd(), 'tests', 'fixtures', 'security', 'test.txt');
      await fs.promises.mkdir(path.dirname(testFile), { recursive: true });
      await fs.promises.writeFile(testFile, 'test content');
      
      try {
        const result = await validatePathSafetyWithExistence(testFile, [PROJECT_ROOT]);
        assert.strictEqual(result.isValid, true);
        assert.ok(result.resolvedPath.includes('test.txt'));
      } finally {
        // Cleanup
        await fs.promises.unlink(testFile).catch(() => {});
      }
    });

    it('should reject non-existent paths', async () => {
      const result = await validatePathSafetyWithExistence(
        path.join(PROJECT_ROOT, 'nonexistent', 'file.txt'), 
        [PROJECT_ROOT]
      );
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error?.includes('does not exist'));
    });

    it('should reject traversal paths even if they exist', async () => {
      // /etc/passwd exists on Unix systems but should be rejected
      if (process.platform !== 'win32') {
        const result = await validatePathSafetyWithExistence('/etc/passwd', [PROJECT_ROOT]);
        assert.strictEqual(result.isValid, false);
        assert.ok(result.error?.includes('Path traversal'));
      }
    });
  });

  describe('getSafePath', () => {
    it('should return safe path for valid input', async () => {
      const testFile = path.join(process.cwd(), 'package.json');
      const safePath = await getSafePath(testFile, [PROJECT_ROOT]);
      assert.ok(safePath.endsWith('package.json'));
    });

    it('should throw error for traversal attempts', async () => {
      await assert.rejects(
        async () => getSafePath('../../../etc/passwd', [PROJECT_ROOT]),
        /Path validation failed/
      );
    });
  });

  describe('isPathSafe', () => {
    it('should return true for safe paths', () => {
      assert.strictEqual(isPathSafe('./src', [PROJECT_ROOT]), true);
    });

    it('should return false for unsafe paths', () => {
      assert.strictEqual(isPathSafe('../../../etc', [PROJECT_ROOT]), false);
    });

    it('should be a convenient boolean check', () => {
      // Quick boolean check without full result object
      const safe = isPathSafe('docs/readme.md', [PROJECT_ROOT]);
      assert.strictEqual(safe, true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long paths', () => {
      const longPath = './src/' + 'a/'.repeat(100) + 'file.txt';
      const result = validatePathSafety(longPath, [PROJECT_ROOT]);
      // Should not throw, result depends on whether it stays within PROJECT_ROOT
      assert.ok(typeof result.isValid === 'boolean');
    });

    it('should handle paths with special characters', () => {
      const result = validatePathSafety('./src/file with spaces & special!.txt', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, true);
    });

    it('should handle Unicode paths', () => {
      const result = validatePathSafety('./src/文件.txt', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, true);
    });

    it('should handle paths with null bytes (injection attempt)', () => {
      const result = validatePathSafety('./src/file.txt\u0000.jpg', [PROJECT_ROOT]);
      // Should either reject or safely handle - but not crash
      assert.ok(typeof result.isValid === 'boolean');
    });
  });

  describe('Real-World Attack Scenarios', () => {
    it('should block classic ../../etc/passwd attack', () => {
      const result = validatePathSafety('../../etc/passwd', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, false);
    });

    it('should block Windows UNC path attacks', () => {
      const result = validatePathSafety('\\\\evil\\share\\file.txt', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, false);
    });

    it('should block path with hidden directory traversal', () => {
      // Using ....// which after normalization might become ../
      const result = validatePathSafety('....//....//etc/passwd', [PROJECT_ROOT]);
      assert.strictEqual(result.isValid, false);
    });

    it('should block NTFS alternate data streams (Windows)', () => {
      if (process.platform === 'win32') {
        const result = validatePathSafety('file.txt:secret.txt', [PROJECT_ROOT]);
        assert.strictEqual(result.isValid, false);
      }
    });
  });
});
