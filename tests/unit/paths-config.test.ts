/**
 * PATHS Configuration Tests
 * 
 * Verifies that path configuration is correct and consistent
 * across the Anchor Engine system.
 */

import { PATHS, PROJECT_ROOT } from '../../engine/src/config/paths.js';
import * as path from 'path';

describe('PATHS Configuration', () => {
  describe('PROJECT_ROOT', () => {
    it('should be an absolute path', () => {
      expect(path.isAbsolute(PROJECT_ROOT)).toBe(true);
    });

    it('should exist on the filesystem', () => {
      const fs = require('fs');
      expect(fs.existsSync(PROJECT_ROOT)).toBe(true);
    });
  });

  describe('INBOX_DIR', () => {
    it('should be under .anchor/inbox', () => {
      // Standard 110: Updated to use .anchor structure instead of local-data
      expect(PATHS.INBOX_DIR).toContain('.anchor');
      expect(PATHS.INBOX_DIR).toContain('inbox');
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.INBOX_DIR)).toBe(true);
    });

    it('should be a subdirectory of PROJECT_ROOT', () => {
      expect(PATHS.INBOX_DIR.startsWith(PROJECT_ROOT)).toBe(true);
    });
  });

  describe('EXTERNAL_INBOX_DIR', () => {
    it('should be under .anchor/external-inbox', () => {
      // Standard 110: Updated to use .anchor structure instead of local-data
      expect(PATHS.EXTERNAL_INBOX_DIR).toContain('.anchor');
      expect(PATHS.EXTERNAL_INBOX_DIR).toContain('external-inbox');
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.EXTERNAL_INBOX_DIR)).toBe(true);
    });

    it('should be a subdirectory of PROJECT_ROOT', () => {
      expect(PATHS.EXTERNAL_INBOX_DIR.startsWith(PROJECT_ROOT)).toBe(true);
    });
  });

  describe('MIRRORED_BRAIN_DIR', () => {
    it('should be under .anchor/mirrored_brain', () => {
      // Standard 110: Updated to use .anchor structure instead of local-data
      expect(PATHS.MIRRORED_BRAIN_DIR).toContain('.anchor');
      expect(PATHS.MIRRORED_BRAIN_DIR).toContain('mirrored_brain');
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.MIRRORED_BRAIN_DIR)).toBe(true);
    });

    it('should be a subdirectory of PROJECT_ROOT', () => {
      expect(PATHS.MIRRORED_BRAIN_DIR.startsWith(PROJECT_ROOT)).toBe(true);
    });
  });

  describe('Path Separation', () => {
    it('should have different paths for inbox and external-inbox', () => {
      expect(PATHS.INBOX_DIR).not.toBe(PATHS.EXTERNAL_INBOX_DIR);
    });

    it('should have different paths for inbox and mirrored_brain', () => {
      expect(PATHS.INBOX_DIR).not.toBe(PATHS.MIRRORED_BRAIN_DIR);
    });

    it('should have different paths for external-inbox and mirrored_brain', () => {
      expect(PATHS.EXTERNAL_INBOX_DIR).not.toBe(PATHS.MIRRORED_BRAIN_DIR);
    });
  });

  describe('Data Directory Structure', () => {
    it('should have all data directories under .anchor/', () => {
      const dataPaths = [
        PATHS.INBOX_DIR,
        PATHS.EXTERNAL_INBOX_DIR,
        PATHS.MIRRORED_BRAIN_DIR
      ];

      dataPaths.forEach(p => {
        // Standard 110: Updated to check for .anchor instead of local-data
        expect(p).toMatch(/\.anchor[\/\\]/);
      });
    });

    it('should maintain proper hierarchy', () => {
      // Standard 110: Updated to use .anchor as the base directory
      const anchorDir = path.join(PROJECT_ROOT, '.anchor');

      expect(PATHS.INBOX_DIR.startsWith(anchorDir)).toBe(true);
      expect(PATHS.EXTERNAL_INBOX_DIR.startsWith(anchorDir)).toBe(true);
      expect(PATHS.MIRRORED_BRAIN_DIR.startsWith(anchorDir)).toBe(true);
    });
  });

  describe('Other Critical Paths', () => {
    it('should have CONTEXT_DIR defined', () => {
      expect(PATHS.CONTEXT_DIR).toBeDefined();
      expect(path.isAbsolute(PATHS.CONTEXT_DIR)).toBe(true);
    });

    it('should have DATABASE_FILE defined', () => {
      expect(PATHS.DATABASE_FILE).toBeDefined();
      expect(PATHS.DATABASE_FILE.endsWith('.db')).toBe(true);
    });

    it('should have LOGS_DIR defined', () => {
      expect(PATHS.LOGS_DIR).toBeDefined();
      expect(path.isAbsolute(PATHS.LOGS_DIR)).toBe(true);
    });
  });

  describe('Provenance Detection Compatibility', () => {
    it('inbox paths should be detectable as internal', () => {
      const testPath = path.join(PATHS.INBOX_DIR, 'test.md');
      const normalizedPath = testPath.replace(/\\/g, '/');

      // Standard 110: Updated to use .anchor structure
      expect(normalizedPath).toContain('/.anchor/inbox/');
    });

    it('external-inbox paths should be detectable as external', () => {
      const testPath = path.join(PATHS.EXTERNAL_INBOX_DIR, 'test.md');
      const normalizedPath = testPath.replace(/\\/g, '/');

      // Standard 110: Updated to use .anchor structure
      expect(normalizedPath).toContain('/.anchor/external-inbox/');
    });
  });
});
