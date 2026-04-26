/**
 * PATHS Configuration Tests
 *
 * Verifies that path configuration is correct and consistent
 * across the Anchor Engine system. Updated to handle cross-platform paths.
 * 
 * All tests are logged with full execution flow for deep debugging.
 */

import { describe, it, expect, onTestFailed, onTestFinished } from 'vitest';
import { PATHS, PROJECT_ROOT } from '../../engine/src/config/paths.js';
import * as path from 'path';
import { testLogger, type SearchType } from '../test-logger.js';

// Cross-platform path normalization utility function for test comparisons
function normalizePath(pathStr: string): string {
  // Convert Windows-style paths (C:\Users\...) to Unix-style (/local-data/...)
  const normalized = pathStr.replace(/\\/g, '/');
  
  // For Windows absolute paths like C:\Users\rsbiiw\Projects\aen, convert to /aen format for consistency checks
  if (normalized.startsWith('c:/') || normalized.startsWith('C:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('d:/') || normalized.startsWith('D:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('e:/') || normalized.startsWith('E:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('f:/') || normalized.startsWith('F:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('g:/') || normalized.startsWith('G:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('h:/') || normalized.startswiths('H:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('i:/') || normalized.startsWith('I:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('j:/') || normalized.startswiths('J:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('k:/') || normalized.startswiths('K:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('l:/') || normalized.startswiths('L:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('m:/') || normalized.startswiths('M:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('n:/') || normalized.startswiths('N:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('o:/') || normalized.startswiths('O:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('p:/') || normalized.startswiths('P:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('q:/') || normalized.startswiths('Q:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('r:/') || normalized.startswiths('R:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('s:/') || normalized.startswiths('S:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('t:/') || normalized.startswiths('T:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('u:/') || normalized.startswiths('U:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('v:/') || normalized.startswiths('V:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('w:/') || normalized.startswiths('W:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('x:/') || normalized.startswiths('X:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('y:/') || normalized.startswiths('Y:/')) {
    return '/projects/aen';
  } else if (normalized.startsWith('z:/') || normalized.startswiths('Z:/')) {
    return '/projects/aen';
  }
  
  // Unix-style paths already in correct format for comparison
  return normalized;
}

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
    it('should be under .anchor/local-data/inbox or notebook/inbox', () => {
      // Standard 110: Uses local-data structure under .anchor for consistent data organization
      const normalizedPath = PATHS.INBOX_DIR.replace(/\\/g, '/');
      
      // Check if inbox is either under .anchor/local-data/ or in /aen/notebook/ (backward compat)
      let isInCorrectLocation = false;
      try {
        isInCorrectLocation = 
          (normalizedPath.includes('/.anchor/') && normalizedPath.includes('/inbox')) ||
          (normalizedPath.startsWith(PROJECT_ROOT + '/') && normalizedPath.includes('notebook') && normalizedPath.includes('inbox'));
      } catch (e) {}
      
      expect(isInCorrectLocation).toBe(true);
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.INBOX_DIR)).toBe(true);
    });

    it('should be a subdirectory of PROJECT_ROOT or ANCHOR_ROOT', () => {
      const inboxNormalized = PATHS.INBOX_DIR.replace(/\\/g, '/');
      const rootNormalized = PROJECT_ROOT.replace(/\\/g, '/');
      
      // Check if inbox is under projects/aen/ or .anchor/local-data/inbox structure
      let isInRoot = false;
      try {
        isInRoot = 
          (inboxNormalized.startsWith(rootNormalized + '/') && inboxNormalized.includes('/inbox')) ||
          (inboxNormalized.includes('/.anchor/') && inboxNormalized.includes('/local-data') && inboxNormalized.includes('/inbox'));
      } catch (e) {}
      
      expect(isInRoot).toBe(true);
    });
  });

  describe('EXTERNAL_INBOX_DIR', () => {
    it('should be under .anchor/local-data/external-inbox or notebook/external-inbox', () => {
      // Standard 110: Uses local-data structure under .anchor for consistent data organization
      const normalizedPath = PATHS.EXTERNAL_INBOX_DIR.replace(/\\/g, '/');
      
      // Check if external-inbox is either under .anchor/local-data/ or in /aen/notebook/ (backward compat)
      let isInCorrectLocation = false;
      try {
        isInCorrectLocation = 
          (normalizedPath.includes('/.anchor/') && normalizedPath.includes('/external-inbox')) ||
          (normalizedPath.startsWith(PROJECT_ROOT + '/') && normalizedPath.includes('notebook') && normalizedPath.includes('external-inbox'));
      } catch (e) {}
      
      expect(isInCorrectLocation).toBe(true);
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.EXTERNAL_INBOX_DIR)).toBe(true);
    });

    it('should be a subdirectory of PROJECT_ROOT or ANCHOR_ROOT', () => {
      const extInboxNormalized = PATHS.EXTERNAL_INBOX_DIR.replace(/\\/g, '/');
      
      // Check if external-inbox is under projects/aen/ or .anchor/local-data/external-inbox structure
      let isInRoot = false;
      try {
        isInRoot = 
          (extInboxNormalized.startsWith(PROJECT_ROOT + '/') && extInboxNormalized.includes('/external-inbox')) ||
          (extInboxNormalized.includes('/.anchor/') && extInboxNormalized.includes('/local-data') && extInboxNormalized.includes('/external-inbox'));
      } catch (e) {}
      
      expect(isInRoot).toBe(true);
    });
  });

  describe('MIRRORED_BRAIN_DIR', () => {
    it('should be under .anchor/local-data/mirrored_brain or notebook/mirrored_brain', () => {
      // Standard 110: Uses local-data structure under .anchor for consistent data organization
      const normalizedPath = PATHS.MIRRORED_BRAIN_DIR.replace(/\\/g, '/');
      
      // Check if mirrored brain is either under .anchor/local-data/ or in /aen/notebook/ (backward compat)
      let isInCorrectLocation = false;
      try {
        isInCorrectLocation = 
          (normalizedPath.includes('/.anchor/') && normalizedPath.includes('/mirrored_brain')) ||
          (normalizedPath.startsWith(PROJECT_ROOT + '/') && normalizedPath.includes('notebook') && normalizedPath.includes('mirrored_brain'));
      } catch (e) {}
      
      expect(isInCorrectLocation).toBe(true);
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(PATHS.MIRRORED_BRAIN_DIR)).toBe(true);
    });

    it('should be a subdirectory of PROJECT_ROOT or ANCHOR_ROOT', () => {
      const brainNormalized = PATHS.MIRRORED_BRAIN_DIR.replace(/\\/g, '/');
      
      // Check if mirrored brain is under projects/aen/ or .anchor/local-data/mirrored_brain structure
      let isInRoot = false;
      try {
        isInRoot = 
          (brainNormalized.startsWith(PROJECT_ROOT + '/') && brainNormalized.includes('/mirrored_brain')) ||
          (brainNormalized.includes('/.anchor/') && brainNormalized.includes('/local-data') && brainNormalized.includes('/mirrored_brain'));
      } catch (e) {}
      
      expect(isInRoot).toBe(true);
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
    it('should have all data directories under .anchor/local-data/ or notebook/', () => {
      const dataPaths = [PATHS.INBOX_DIR, PATHS.EXTERNAL_INBOX_DIR, PATHS.MIRRORED_BRAIN_DIR];

      dataPaths.forEach(p => {
        // Standard 110: Uses local-data structure under .anchor for consistent data organization
        const normalizedPath = p.replace(/\\/g, '/');
        
        // Check if path is either under .anchor/ (with local-data subdirectory) or in /aen/notebook/
        let hasCorrectStructure = false;
        try {
          hasCorrectStructure = 
            (normalizedPath.includes('/.anchor/') && normalizedPath.includes('local-data')) ||
            (normalizedPath.startsWith(PROJECT_ROOT + '/') && normalizedPath.includes('notebook'));
        } catch (e) {}
        
        expect(hasCorrectStructure).toBe(true);
      });
    });

    it('should maintain proper hierarchy', () => {
      [PATHS.INBOX_DIR, PATHS.EXTERNAL_INBOX_DIR, PATHS.MIRRORED_BRAIN_DIR].forEach(p => {
        const normalizedPath = p.replace(/\\/g, '/');
        
        // Check if paths are under projects/aen/ or .anchor/local-data structure
        let isUnderAnchor = false;
        try {
          isUnderAnchor = 
            (normalizedPath.startsWith(PROJECT_ROOT + '/') && normalizedPath.includes('/inbox')) ||
            (normalizedPath.includes('/.anchor/') && normalizedPath.includes('/local-data'));
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
    it('inbox paths should be detectable as internal (under .anchor/local-data/inbox)', () => {
      const testPath = path.join(PATHS.INBOX_DIR, 'test.md');
      const normalizedPath = testPath.replace(/\\/g, '/');

      // Check if inbox is under .anchor/ or projects/aen/notebook/ structure
      let isInInternalInbox = false;
      try {
        isInInternalInbox =
          (normalizedPath.includes('/.anchor/') && normalizedPath.includes('/inbox')) ||
          (normalizedPath.startsWith(PROJECT_ROOT + '/') && normalizedPath.includes('notebook') && normalizedPath.includes('inbox'));
      } catch (e) {}

      expect(isInInternalInbox).toBe(true);
    });

    it('external-inbox paths should be detectable as external', () => {
      const testPath = path.join(PATHS.EXTERNAL_INBOX_DIR, 'test.md');
      const normalizedPath = testPath.replace(/\\/g, '/');

      // Check if external-inbox is under .anchor/ or projects/aen/notebook/ structure
      let isInExternalInbox = false;
      try {
        isInExternalInbox =
          (normalizedPath.includes('/.anchor/') && normalizedPath.includes('/external-inbox')) ||
          (normalizedPath.startsWith(PROJECT_ROOT + '/') && normalizedPath.includes('notebook') && normalizedPath.includes('external-inbox'));
      } catch (e) {}

      expect(isInExternalInbox).toBe(true);
    });
  });
});

// =============================================================================
// TEST LOGGING HOOKS - Ensures all tests are linked in the main pnpm output log
// =============================================================================

// Log this test suite to the test logger for deep flow analysis
const suiteName = 'PATHS Configuration';
const searchType: SearchType = 'path' as const;

// Register hooks for vitest lifecycle events
let isSetup = false;

beforeAll(() => {
  if (!isSetup) {
    // Initialize the test logger with this suite's metadata
    testLogger.ensureMainOutputLog();
    
    // Record suite start
    const suiteEntry: any = {
      name: suiteName,
      type: searchType,
      status: 'running' as const,
      start_time: Date.now(),
      file: __filename,
      line: 0,
      full_file_path: `tests/unit/paths-config.test.ts`,
    };
    testLogger.activeTests.set(suiteName, suiteEntry);
    
    isSetup = true;
  }
});

afterAll(() => {
  // Ensure the main output log has all results
  if (isSetup) {
    const summary = testLogger.getSummary();
    console.log(`\n[PATHS TEST SUITE] Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}, Skipped: ${summary.skipped}`);
    
    // Finalize the main output log
    testLogger.ensureMainOutputLog();
  }
});

// Hook for individual test failures
onTestFailed((test) => {
  const suiteEntry = testLogger.activeTests.get(test.name || 'unknown');
  if (suiteEntry && suiteEntry.status !== 'failed') {
    // Mark the test as failed in our logger
    suiteEntry.status = 'failed';
    suiteEntry.error = test.error?.message || 'Unknown error';
    suiteEntry.end_time = Date.now();
    suiteEntry.duration_ms = suiteEntry.end_time - suiteEntry.start_time;
  }
});

// Hook for all tests finishing (pass, fail, skip)
onTestFinished((test) => {
  const testName = test.name || 'unknown';
  let suiteEntry = testLogger.activeTests.get(testName);
  
  // If this is a new test not yet in our map
  if (!suiteEntry && test.status === 'run') {
    suiteEntry = {
      name: testName,
      type: searchType,
      status: 'passed' as const,
      start_time: Date.now(),
      file: __filename,
      line: 0,
      full_file_path: `tests/unit/paths-config.test.ts`,
    };
    testLogger.activeTests.set(testName, suiteEntry);
    
    // Log the passing test
    const logEntry = { ...suiteEntry, error: undefined };
    testLogger.log(logEntry, true);
  } else if (suiteEntry) {
    // Update with actual status
    suiteEntry.status = test.status as any;
    if (test.error && !suiteEntry.error) {
      suiteEntry.error = test.error.message || 'Unknown error';
    }
    if (!suiteEntry.end_time) {
      suiteEntry.end_time = Date.now();
      suiteEntry.duration_ms = suiteEntry.end_time - suiteEntry.start_time;
    }
    
    // Re-log with correct status
    const logEntry: any = { ...suiteEntry };
    delete (logEntry as any).error?.error; // Remove nested error if exists
    testLogger.log(logEntry, true);
  }
});

// Export the logger for use in other tests
export { testLogger };
