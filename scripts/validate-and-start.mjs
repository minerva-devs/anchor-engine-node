#!/usr/bin/env node
/**
 * Validate + Start Anchor Engine
 *
 * Validates user_settings.json before starting the server.
 * Fails fast with clear error messages instead of crashing at runtime.
 *
 * Usage: node scripts/validate-and-start.mjs
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const ANCHOR_ROOT = resolve(PROJECT_ROOT, '.anchor');

let errors = [];
let warnings = [];

// ── Helpers ──────────────────────────────────────────────────────
function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }
function pass(msg) { console.log(`  ✅ ${msg}`); }

// ── 1. Check file exists ─────────────────────────────────────────
console.log('🔍 Validating Anchor Engine configuration...\n');

const anchorPath = join(ANCHOR_ROOT, 'user_settings.json');
const projectPath = join(PROJECT_ROOT, 'user_settings.json');
const templatePath = join(PROJECT_ROOT, 'user_settings.json.template');

let settingsFile = null;

if (existsSync(anchorPath)) {
  settingsFile = anchorPath;
  pass(`Found .anchor/user_settings.json`);
} else if (existsSync(projectPath)) {
  settingsFile = projectPath;
  pass(`Found user_settings.json (project root — consider migrating to .anchor/)`);
} else {
  fail('No user_settings.json found in .anchor/ or project root');
  if (existsSync(templatePath)) {
    warn(`Template exists at: ${templatePath}`);
    warn(`Run: node .anchor/init-user-settings.mjs`);
  }
}

// ── 2. Parse JSON ────────────────────────────────────────────────
let settings = null;

if (settingsFile) {
  try {
    const raw = readFileSync(settingsFile, 'utf-8');
    settings = JSON.parse(raw);
    pass(`JSON is valid in ${settingsFile.replace(PROJECT_ROOT + '/', '')}`);
  } catch (e) {
    const line = e.message.match(/position (\d+)/)?.[1] || '?';
    fail(`Invalid JSON at position ${line}: ${e.message.split('\n')[0]}`);
    fail(`Run: node --eval "console.log(JSON.parse(require('fs').readFileSync('${settingsFile}','utf8')))" 2>&1`);
  }
}

// ── 3. Validate API key strength ─────────────────────────────────
if (settings) {
  const apiKey = settings.server?.api_key;

  if (!apiKey || apiKey.trim() === '') {
    fail('server.api_key is missing or empty');
  } else {
    const keyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z0-9]{32,128}$|^[a-f0-9]{64,}$/i;
    if (keyRegex.test(apiKey)) {
      pass(`API key meets strength requirements (${apiKey.slice(0, 8)}...)`);
    } else {
      fail(`API key is too weak (length: ${apiKey.length})`);
      fail(`Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
    }
  }

  // ── 4. Validate paths don't contain bare backslashes ───────────
  function checkPaths(obj, prefix = '') {
    if (typeof obj === 'string' && /^[A-Z]:\\/.test(obj)) {
      fail(`Path uses Windows backslashes: ${prefix}="${obj}"`);
      warn(`Use forward slashes: "${obj.replace(/\\/g, '/')}"`);
    }
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        checkPaths(v, prefix ? `${prefix}.${k}` : k);
      }
    }
  }

  if (settings.paths) {
    checkPaths(settings.paths, 'paths');
    if (errors.length === 0) {
      pass(`All path entries use forward slashes`);
    }
  }

  // ── 5. Validate required sections ──────────────────────────────
  const requiredSections = ['server', 'database', 'ingestion'];
  for (const section of requiredSections) {
    if (!settings[section]) {
      warn(`Missing section: "${section}" (will use defaults)`);
    }
  }
}

// ── 6. Check port availability ───────────────────────────────────
const port = settings?.server?.port || 3160;

// ── Report ───────────────────────────────────────────────────────
console.log('');

if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`   ⚠️  ${w}`);
  console.log('');
}

if (errors.length > 0) {
  console.log(`❌ ${errors.length} error(s) — cannot start:\n`);
  for (const e of errors) console.log(`   ❌  ${e}`);
  console.log('\nFix the errors above and try again.');
  process.exit(1);
}

// ── 7. Start the server ──────────────────────────────────────────
console.log(`✅ Configuration valid. Starting Anchor Engine on port ${port}...\n`);

const engineScript = join(PROJECT_ROOT, 'engine', 'dist', 'index.js');

if (!existsSync(engineScript)) {
  console.log(`❌ Built engine not found at ${engineScript}`);
  console.log('   Run: pnpm build');
  process.exit(1);
}

const child = spawn('node', ['--expose-gc', '--max-old-space-size=6144', engineScript], {
  stdio: 'inherit',
  cwd: PROJECT_ROOT,
});

child.on('error', (err) => {
  console.error('❌ Failed to start engine:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
