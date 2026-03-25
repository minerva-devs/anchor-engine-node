/**
 * Paths Configuration Test (P0 - Critical)
 * Validates that all critical paths are configured correctly
 */

import { describe, it, assert } from '../minimal-framework.mjs';
import { PATHS, PROJECT_ROOT } from '../../engine/dist/config/paths.js';
import * as path from 'path';
import * as fs from 'fs';

describe('PATHS', () => {
  it('PROJECT_ROOT should be absolute and exist', () => {
    assert(path.isAbsolute(PROJECT_ROOT), 'PROJECT_ROOT must be absolute');
    assert(fs.existsSync(PROJECT_ROOT), 'PROJECT_ROOT must exist');
  });

  it('INBOX_DIR should be under local-data/inbox', () => {
    assert(PATHS.INBOX_DIR.includes('local-data'), 'Must contain local-data');
    assert(PATHS.INBOX_DIR.includes('inbox'), 'Must contain inbox');
    assert(path.isAbsolute(PATHS.INBOX_DIR), 'Must be absolute');
  });

  it('EXTERNAL_INBOX_DIR should be under local-data/external-inbox', () => {
    assert(PATHS.EXTERNAL_INBOX_DIR.includes('local-data'), 'Must contain local-data');
    assert(PATHS.EXTERNAL_INBOX_DIR.includes('external-inbox'), 'Must contain external-inbox');
    assert(path.isAbsolute(PATHS.EXTERNAL_INBOX_DIR), 'Must be absolute');
  });

  it('Paths should be unique', () => {
    assert.notStrictEqual(PATHS.INBOX_DIR, PATHS.EXTERNAL_INBOX_DIR, 'Inbox paths must differ');
    assert.notStrictEqual(PATHS.INBOX_DIR, PATHS.MIRRORED_BRAIN_DIR, 'Inbox and brain must differ');
  });

  it('DATABASE_FILE should have .db extension', () => {
    assert(PATHS.DATABASE_FILE.endsWith('.db'), 'Database file must end with .db');
  });
});
