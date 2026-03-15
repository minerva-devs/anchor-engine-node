#!/usr/bin/env node
/**
 * Postinstall Script for Anchor Engine
 * 
 * Creates default configuration and data directories on first install
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// XDG base directories
const HOME = homedir();
const XDG_CONFIG = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');
const XDG_DATA = process.env.XDG_DATA_HOME || path.join(HOME, '.local', 'share');

const CONFIG_DIR = path.join(XDG_CONFIG, 'anchor');
const DATA_DIR = path.join(XDG_DATA, 'anchor');

console.log('⚓  Anchor Engine Postinstall');
console.log('Setting up configuration and data directories...\n');

// Create directories
try {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    console.log(`✅ Created config directory: ${CONFIG_DIR}`);
  } else {
    console.log(`✓ Config directory exists: ${CONFIG_DIR}`);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`✅ Created data directory: ${DATA_DIR}`);
  } else {
    console.log(`✓ Data directory exists: ${DATA_DIR}`);
  }

  // Create subdirectories
  const subdirs = ['inbox', 'mirrored_brain', 'context_data'];
  for (const subdir of subdirs) {
    const subdirPath = path.join(DATA_DIR, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
      console.log(`  ✅ Created: ${subdir}`);
    }
  }

  // Create default config if it doesn't exist
  const configPath = path.join(CONFIG_DIR, 'user_settings.json');
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      server: {
        port: 3160,
        host: '127.0.0.1'
      },
      storage: {
        inbox: path.join(DATA_DIR, 'inbox'),
        mirrored_brain: path.join(DATA_DIR, 'mirrored_brain'),
        context_data: path.join(DATA_DIR, 'context_data')
      },
      mcp: {
        enabled: false
      }
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`✅ Created default config: ${configPath}`);
  } else {
    console.log(`✓ Config file exists: ${configPath}`);
  }

  console.log('\n⚓  Installation complete!');
  console.log('\nNext steps:');
  console.log('  1. Run: anchor start');
  console.log('  2. Open: http://localhost:3160');
  console.log('\nConfiguration:');
  console.log(`  Config: ${configPath}`);
  console.log(`  Data:   ${DATA_DIR}`);
  console.log('\nCommands:');
  console.log('  anchor start    - Start the engine');
  console.log('  anchor status   - Check if engine is running');
  console.log('  anchor help     - Show all commands');

} catch (error) {
  console.error('❌ Postinstall failed:', error.message);
  console.error('\nYou can manually create directories:');
  console.log(`  mkdir -p ${CONFIG_DIR}`);
  console.log(`  mkdir -p ${DATA_DIR}/inbox ${DATA_DIR}/mirrored_brain ${DATA_DIR}/context_data`);
  process.exit(1);
}
