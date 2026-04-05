/**
 * Path Configuration for Sovereign Context Engine
 *
 * Defines all the important paths used by the system.
 * Paths can be overridden in user_settings.json -> paths.*
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define base paths
// __dirname is engine/src/config, so we need to go up 3 levels to reach project root
export const PROJECT_ROOT = path.resolve(process.env.PROJECT_ROOT || path.join(__dirname, '..', '..', '..'));

// Load user_settings.json for path overrides
let userSettings: any = {};

// Define Anchor root (centralized user data) - outside project root
const ANCHOR_ROOT = path.resolve(
  process.env.ANCHOR_ROOT ||
  path.join(PROJECT_ROOT, '.anchor')
);

// Load user_settings.json from .anchor/ (primary) or project root (fallback)
try {
  const anchorSettingsPath = path.join(ANCHOR_ROOT, 'user_settings.json');
  const projectSettingsPath = path.join(PROJECT_ROOT, 'user_settings.json');
  const settingsPath = fs.existsSync(anchorSettingsPath) ? anchorSettingsPath : projectSettingsPath;
  if (fs.existsSync(settingsPath)) {
    userSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  }
} catch (e) {
  // Ignore errors - will use defaults
}

// Path configuration with user_settings.json overrides
// Priority: Environment variables > user_settings.json > defaults
export const NOTEBOOK_DIR = path.resolve(
  process.env.NOTEBOOK_DIR ||
  userSettings.paths?.notebook ||
  path.join(PROJECT_ROOT, 'notebook')
);

export const CONTEXT_DIR = path.resolve(
  process.env.CONTEXT_DIR ||
  userSettings.paths?.context ||
  path.join(PROJECT_ROOT, 'engine', 'context')
);

export const MODELS_DIR = path.resolve(process.env.MODELS_DIR || path.join(PROJECT_ROOT, 'models'));
export const DIST_DIR = path.resolve(process.env.DIST_DIR || path.join(PROJECT_ROOT, 'dist'));
export const BASE_PATH = PROJECT_ROOT;
export const LOGS_DIR = path.resolve(
  process.env.LOGS_DIR ||
  userSettings.paths?.logs ||
  path.join(PROJECT_ROOT, 'logs')
);

// Define specific paths
export const PATHS = {
  PROJECT_ROOT,
  ANCHOR_ROOT,
  CONTEXT_DIR,
  MODELS_DIR,
  DIST_DIR,
  BACKUPS_DIR: path.resolve(process.env.BACKUPS_DIR || userSettings.paths?.backups || path.join(ANCHOR_ROOT, 'backups')),
  LOGS_DIR,
  CONFIG_FILE: path.join(PROJECT_ROOT, 'sovereign.yaml'),
  USER_SETTINGS: path.join(ANCHOR_ROOT, 'user_settings.json'),
  DATABASE_FILE: path.join(CONTEXT_DIR, 'context.db'),
  NOTEBOOK_DIR,
  // Centralized user data paths (from .anchor/)
  INBOX_DIR: path.resolve(process.env.INBOX_DIR || userSettings.paths?.inbox || path.join(ANCHOR_ROOT, 'inbox')),
  EXTERNAL_INBOX_DIR: path.resolve(process.env.EXTERNAL_INBOX_DIR || userSettings.paths?.external_inbox || path.join(ANCHOR_ROOT, 'external-inbox')),
  DISTILLS_DIR: path.resolve(process.env.DISTILLS_DIR || userSettings.paths?.distills || path.join(ANCHOR_ROOT, 'distills')),
  MIRRORED_BRAIN_DIR: path.resolve(process.env.MIRRORED_BRAIN_DIR || userSettings.paths?.mirrored_brain || path.join(ANCHOR_ROOT, 'mirrored_brain')),
  SESSIONS_DIR: path.resolve(process.env.SESSIONS_DIR || userSettings.paths?.sessions || path.join(ANCHOR_ROOT, 'sessions')),
  LIBRARIES_DIR: path.join(CONTEXT_DIR, 'libraries'),
  MIRRORS_DIR: path.join(CONTEXT_DIR, 'mirrors'),
  ENGINE_BIN: path.join(PROJECT_ROOT, 'engine', 'bin'),
  ENGINE_SRC: path.join(PROJECT_ROOT, 'engine', 'src'),
  ENGINE_DIST: path.join(PROJECT_ROOT, 'engine', 'dist'),
  ENGINE_CONTEXT: path.join(PROJECT_ROOT, 'engine', 'context'),
  ENGINE_PLUGINS: path.join(PROJECT_ROOT, 'engine', 'plugins'),
  DESKTOP_OVERLAY_SRC: path.join(PROJECT_ROOT, 'packages', 'desktop-overlay', 'src'),
  DESKTOP_OVERLAY_DIST: path.join(PROJECT_ROOT, 'packages', 'desktop-overlay', 'dist'),
};

// Ensure anchor root and subdirectories exist
try {
  fs.mkdirSync(ANCHOR_ROOT, { recursive: true });
  
  // Create subdirectories if they don't exist
  const subdirs = ['inbox', 'external-inbox', 'distills', 'mirrored_brain', 'sessions', 'logs', 'backups'];
  for (const subdir of subdirs) {
    const subdirPath = path.join(ANCHOR_ROOT, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  }
  
  // Also ensure notebook directories exist (for backward compatibility)
  try {
    fs.mkdirSync(NOTEBOOK_DIR, { recursive: true });
    fs.mkdirSync(path.join(NOTEBOOK_DIR, 'inbox'), { recursive: true });
    fs.mkdirSync(path.join(NOTEBOOK_DIR, 'external-inbox'), { recursive: true });
    fs.mkdirSync(path.join(NOTEBOOK_DIR, 'distills'), { recursive: true });
  } catch (e) {
    // Ignore errors - directories may already exist
  }
} catch (e) {
  // Ignore errors - directories may already exist
}

// Export individual paths for convenience
export const {
  BACKUPS_DIR,
  INBOX_DIR,
  EXTERNAL_INBOX_DIR,
  DISTILLS_DIR,
  MIRRORED_BRAIN_DIR,
  ENGINE_CONTEXT,
  ENGINE_PLUGINS,
  DESKTOP_OVERLAY_SRC,
  DESKTOP_OVERLAY_DIST,
} = PATHS;

export default PATHS;