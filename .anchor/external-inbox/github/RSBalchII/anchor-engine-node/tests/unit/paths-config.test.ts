/**
 * PATHS Configuration Tests
 *
 * Verifies that path configuration is correct and consistent
 * across the Anchor Engine system. Updated to handle cross-platform paths.
 */

import { describe, it, expect } from 'vitest';
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
    it('should contain inbox in its path', () => {
      expect(PATHS.INBOX_DIR).toContain('inbox');
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.INBOX_DIR)).toBe(true);
    });
  });

  describe('EXTERNAL_INBOX_DIR', () => {
    it('should contain external-inbox in its path', () => {
      expect(PATHS.EXTERNAL_INBOX_DIR).toContain('external-inbox');
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.EXTERNAL_INBOX_DIR)).toBe(true);
    });
  });

  describe('MIRRORED_BRAIN_DIR', () => {
    it('should contain mirrored_brain in its path', () => {
      expect(PATHS.MIRRORED_BRAIN_DIR).toContain('mirrored_brain');
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.MIRRODED_BRAIN_DIR)).toBe(true);
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
      expect(PATHS.EXTERNAL_INBOX_DIR).not.toBe(PATHS.MIRRODED_BRAIN_DIR);
    });
  });

  describe('Data Directory Structure', () => {
    it('should have all data directories containing expected folder names', () => {
      const dataPaths = [PATHS.INBOX_DIR, PATHS.EXTERNAL_INBOX_DIR, PATHS.MIRRORED_BRAIN_DIR];

      dataPaths.forEach(p => {
        // Check if path contains expected directory name
        let hasCorrectStructure = false;
        
        try {
          hasCorrectStructure = 
            (p.includes('/inbox')) ||
            (p.includes('/external-inbox')) ||
            (p.includes('/mirrored_brain'));
        } catch (e) {}
        
        expect(hasCorrectStructure).toBe(true);
      });
    });

    it('should maintain proper hierarchy', () => {
      [PATHS.INBOX_DIR, PATHS.EXTERNAL_INBOX_DIR, PATHS.MIRRORED_BRAIN_DIR].forEach(p => {
        // Check if paths are under projects/aen/ or .anchor/local-data structure  
        const normalizedPath = p.replace(/\\/g, '/');
        
        let isUnderAnchor = false;
        try {
          isUnderAnchor = 
            (normalizedPath.includes('/.anchor/') && normalizedPath.includes('/local-data')) ||
            (normalizedPath.startsWith(PROJECT_ROOT + '/') && normalizedPath.includes('/notebook'));
        } catch (e) {}
        
        expect(isUnderAnchor).toBe(true);
      });
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
    it('inbox paths should contain inbox folder name', () => {
      const testPath = path.join(PATHS.INBOX_DIR, 'test.md');
      
      // Check if inbox is under projects/aen/notebook/inbox or .anchor/local-data/inbox structure
      let isInInternalInbox = false;
      try {
        isInInternalInbox = 
          (testPath.includes('/.anchor/') && testPath.includes('/local-data') && testPath.includes('/inbox')) ||
          (testPath.startsWith(PROJECT_ROOT + '/') && testPath.includes('notebook') && testPath.includes('/inbox'));
      } catch (e) {}
      
      expect(isInInternalInbox).toBe(true);
    });

    it('external-inbox paths should contain external-inbox folder name', () => {
      const testPath = path.join(PATHS.EXTERNAL_INBOX_DIR, 'test.md');
      
      // Check if external-inbox is under projects/aen/notebook/external-inbox or .anchor/local-data/external-inbox structure
      let isInExternalInbox = false;
      try {
        isInExternalInbox = 
          (testPath.includes('/.anchor/') && testPath.includes('/local-data') && testPath.includes('/external-inbox')) ||
          (testPath.startsWith(PROJECT_ROOT + '/') && testPath.includes('notebook') && testPath.includes('/external-inbox'));
      } catch (e) {}
      
      expect(isInExternalInbox).toBe(true);
    });
  });
});
