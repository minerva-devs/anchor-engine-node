#!/usr/bin/env node
/**
 * Configuration Validation Script
 * 
 * Validates that:
 * 1. UI default API key matches user_settings.json template
 * 2. No hardcoded values exist in source files
 * 3. All required configuration fields are present
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let exitCode = 0;

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
  exitCode = 1;
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check 1: UI default matches template
function checkApiKeyConsistency() {
  info('\n🔑 Checking API Key Consistency...\n');
  
  // Read template
  const templatePath = path.join(PROJECT_ROOT, 'user_settings.json.template');
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  const templateApiKey = template.server?.api_key;
  
  // Read UI helper
  const uiHelperPath = path.join(PROJECT_ROOT, 'packages/anchor-ui/src/utils/api-key-helper.ts');
  const uiHelper = fs.readFileSync(uiHelperPath, 'utf8');
  const uiApiKeyMatch = uiHelper.match(/DEFAULT_API_KEY = '(.+)'/);
  const uiApiKey = uiApiKeyMatch ? uiApiKeyMatch[1] : null;
  
  // Read current user_settings
  const userSettingsPath = path.join(PROJECT_ROOT, 'user_settings.json');
  let userApiKey = null;
  if (fs.existsSync(userSettingsPath)) {
    const userSettings = JSON.parse(fs.readFileSync(userSettingsPath, 'utf8'));
    userApiKey = userSettings.server?.api_key;
  }
  
  if (templateApiKey === uiApiKey) {
    success(`Template and UI default match: ${templateApiKey}`);
  } else {
    error(`API Key mismatch!`);
    error(`  Template: ${templateApiKey}`);
    error(`  UI Default: ${uiApiKey}`);
  }
  
  if (userApiKey && userApiKey !== templateApiKey) {
    warning(`user_settings.json has different API key: ${userApiKey}`);
    warning(`  This is OK if you intentionally changed it`);
  }
}

// Check 2: No hardcoded old keys
function checkForHardcodedKeys() {
  info('\n🔍 Checking for Hardcoded Values...\n');
  
  const forbiddenPatterns = [
    { pattern: /bolt-memory-secret/, message: 'Old default API key', exclude: ['api-key-helper.ts'] },
    { pattern: /bolt-memory-secure-key-2026/, message: 'Previous default API key', exclude: ['api-key-helper.ts'] },
    { pattern: /localhost:3161/, message: 'Old port (should be 3160)', exclude: [] },
  ];
  
  const filesToCheck = [
    'packages/anchor-ui/src/services/api.ts',
    'packages/anchor-ui/src/utils/api-key-helper.ts',
    'engine/src/config/index.ts',
    'mcp-server/index.ts',
    'ingest-chats.js',
    'orchestrator.js',
  ];
  
  let foundIssues = false;
  
  for (const file of filesToCheck) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(filePath)) continue;
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const { pattern, message, exclude } of forbiddenPatterns) {
      if (pattern.test(content)) {
        // Check if this file is in the exclude list
        if (exclude && exclude.some(excluded => file.includes(excluded))) {
          continue; // Skip this file
        }
        error(`Found ${message} in ${file}`);
        foundIssues = true;
      }
    }
  }
  
  if (!foundIssues) {
    success('No hardcoded old values found');
  }
}

// Check 3: Required fields in template
function checkRequiredFields() {
  info('\n📋 Checking Required Configuration Fields...\n');
  
  const templatePath = path.join(PROJECT_ROOT, 'user_settings.json.template');
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  
  const requiredFields = [
    ['server', 'host'],
    ['server', 'port'],
    ['server', 'api_key'],
    ['server', 'version'],
  ];
  
  let missing = false;
  
  for (const [section, field] of requiredFields) {
    if (!template[section]?.[field]) {
      error(`Missing required field: ${section}.${field}`);
      missing = true;
    }
  }
  
  if (!missing) {
    success('All required fields present in template');
  }
}

// Check 4: user_settings.json exists and is valid
function checkUserSettings() {
  info('\n⚙️  Checking user_settings.json...\n');
  
  const userSettingsPath = path.join(PROJECT_ROOT, 'user_settings.json');
  
  if (!fs.existsSync(userSettingsPath)) {
    error('user_settings.json does not exist!');
    info('  Run: cp user_settings.json.template user_settings.json');
    return;
  }
  
  try {
    const userSettings = JSON.parse(fs.readFileSync(userSettingsPath, 'utf8'));
    
    if (!userSettings.server?.api_key) {
      error('user_settings.json missing server.api_key');
    } else if (userSettings.server.api_key.length < 16) {
      error('server.api_key must be at least 16 characters');
    } else {
      success('user_settings.json is valid');
    }
    
    // Check for old keys
    if (userSettings.server?.api_key === 'bolt-memory-secret') {
      error('user_settings.json still uses old API key: bolt-memory-secret');
      info('  Update to: anchor-engine-default-key');
    }
    
  } catch (e) {
    error(`user_settings.json is invalid JSON: ${e.message}`);
  }
}

// Check 5: Port consistency
function checkPortConsistency() {
  info('\n🌐 Checking Port Configuration...\n');
  
  const templatePath = path.join(PROJECT_ROOT, 'user_settings.json.template');
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  const templatePort = template.server?.port;
  
  // Check UI vite config
  const viteConfigPath = path.join(PROJECT_ROOT, 'packages/anchor-ui/vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    const portMatches = viteConfig.match(/localhost:(\d+)/g);
    
    if (portMatches) {
      const uniquePorts = [...new Set(portMatches.map(p => parseInt(p.split(':')[1])))].filter(p => p !== templatePort);
      if (uniquePorts.length > 0) {
        warning(`UI vite.config.ts references different ports: ${uniquePorts.join(', ')}`);
        warning(`  Template uses: ${templatePort}`);
      } else {
        success(`UI proxy port matches template: ${templatePort}`);
      }
    }
  }
}

// Main
function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║     Anchor Engine Configuration Validator                  ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  
  checkApiKeyConsistency();
  checkForHardcodedKeys();
  checkRequiredFields();
  checkUserSettings();
  checkPortConsistency();
  
  info('\n════════════════════════════════════════════════════════════\n');
  
  if (exitCode === 0) {
    success('All checks passed! Configuration is consistent.\n');
  } else {
    error('Some checks failed. Please fix the issues above.\n');
    log('Quick fixes:', 'yellow');
    log('  1. cp user_settings.json.template user_settings.json');
    log('  2. Edit user_settings.json to set your custom values');
    log('  3. Clear browser localStorage: localStorage.removeItem("anchor_api_key")');
    log('');
  }
  
  process.exit(exitCode);
}

main();
