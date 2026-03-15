#!/usr/bin/env node
/**
 * Anchor Engine CLI
 * 
 * Usage:
 *   anchor start              - Start the engine
 *   anchor stop               - Stop the engine
 *   anchor status             - Check engine status
 *   anchor init               - Initialize config in current directory
 *   anchor help               - Show this help
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Get version from package.json
const packageJson = JSON.parse(
  readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
);
const VERSION = packageJson.version;

const args = process.argv.slice(2);
const command = args[0];

/**
 * Spawn the engine process
 */
function startEngine() {
  console.log(`⚓  Anchor Engine v${VERSION}`);
  console.log('Starting engine...\n');

  const enginePath = path.join(PROJECT_ROOT, 'engine', 'dist', 'index.js');
  
  if (!fs.existsSync(enginePath)) {
    console.error('❌ Error: Engine not built. Run: pnpm build');
    process.exit(1);
  }

  const engine = spawn('node', [
    '--expose-gc',
    '--max-old-space-size=6144',
    enginePath
  ], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  engine.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n⚠️  Engine exited with code ${code}`);
    } else {
      console.log('\n✅ Engine stopped');
    }
    process.exit(code || 0);
  });

  // Handle signals
  process.on('SIGINT', () => {
    console.log('\n\n⚓  Shutting down engine...');
    engine.kill('SIGTERM');
  });

  process.on('SIGTERM', () => {
    console.log('\n\n⚓  Shutting down engine...');
    engine.kill('SIGTERM');
  });
}

/**
 * Initialize config in current directory
 */
function initConfig() {
  const configDir = process.cwd();
  const configPath = path.join(configDir, 'user_settings.json');
  
  if (fs.existsSync(configPath)) {
    console.log('⚠️  user_settings.json already exists in this directory');
    return;
  }

  const defaultConfig = {
    server: {
      port: 3160,
      host: '127.0.0.1'
    },
    storage: {
      inbox: './inbox',
      mirrored_brain: './mirrored_brain',
      context_data: './context_data'
    },
    mcp: {
      enabled: false
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log('✅ Created user_settings.json in current directory');
  console.log('📝 Edit this file to customize your Anchor Engine setup');
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
⚓  Anchor Engine v${VERSION}

Usage:
  anchor <command> [options]

Commands:
  start              Start the engine (default)
  stop               Stop the engine (not yet implemented)
  status             Check engine status
  init               Initialize config in current directory
  help               Show this help

Examples:
  anchor start       Start the engine
  anchor             Same as 'anchor start'
  anchor init        Create user_settings.json in current directory

After installation:
  anchor start       Open http://localhost:3160 in your browser

Configuration:
  Config file: ~/.config/anchor/user_settings.json
  Data directory: ~/.local/share/anchor/

Documentation: https://github.com/RSBalchII/anchor-engine-node
`);
}

/**
 * Check engine status
 */
function checkStatus() {
  console.log('⚓  Anchor Engine Status');
  console.log('Checking...\n');
  
  // Check if engine is running by hitting health endpoint
  import('http').then(({ get }) => {
    const req = get('http://localhost:3160/health', (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const status = JSON.parse(data);
            console.log('✅ Engine is RUNNING');
            console.log(`   Status: ${status.status}`);
            console.log(`   Port: 3160`);
            console.log(`   URL: http://localhost:3160`);
          } catch (e) {
            console.log('✅ Engine is RUNNING (port 3160)');
          }
        });
      } else {
        console.log('❌ Engine is NOT running');
        console.log('   Run: anchor start');
      }
    });

    req.on('error', () => {
      console.log('❌ Engine is NOT running');
      console.log('   Run: anchor start');
    });
  }).catch(() => {
    console.log('❌ Engine is NOT running');
    console.log('   Run: anchor start');
  });
}

// Main command handler
switch (command) {
  case 'start':
    startEngine();
    break;
  
  case 'stop':
    console.log('⚠️  Stop command not yet implemented');
    console.log('   Please use Ctrl+C to stop the engine');
    process.exit(0);
    break;
  
  case 'status':
    checkStatus();
    break;
  
  case 'init':
    initConfig();
    break;
  
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  
  case '--version':
  case '-v':
    console.log(`v${VERSION}`);
    process.exit(0);
    break;
  
  case undefined:
  case '':
    // No command = start engine
    startEngine();
    break;
  
  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run: anchor help');
    process.exit(1);
}
