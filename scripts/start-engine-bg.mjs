#!/usr/bin/env node
/**
 * Anchor Engine Background Startup Script (Agent-Friendly)
 * 
 * This script reliably starts the Anchor Engine in the background for use by AI agents.
 * It handles all startup checks, port conflicts, build verification, and health checking.
 * 
 * Usage: node scripts/start-engine-bg.mjs
 * 
 * Features:
 * - Automatic build if dist/ doesn't exist
 * - Port 3160 conflict detection (finds available port or uses --port flag)
 * - Logs to .anchor/logs/start-{timestamp}.log
 * - Waits for health check before returning
 * - Graceful process management
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { execFile } from 'child_process';

// Global process reference to prevent garbage collection
let engineProcess = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const LOGS_DIR = path.join(PROJECT_ROOT, '.anchor', 'logs');

// Configuration
const DEFAULT_PORT = 3160;
const HEALTH_CHECK_URL = `http://localhost:${DEFAULT_PORT}/health`;
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 1000;
const BUILD_DIR = path.join(PROJECT_ROOT, 'engine', 'dist');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Logger - writes to console and file
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${message}`;
  
  // Console output (for debugging)
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
  
  // File logging
  const logFile = path.join(LOGS_DIR, `start-${Date.now()}.log`);
  fs.appendFileSync(logFile, formatted + '\n');
}

/**
 * Check if port is in use
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.close(() => {
        server.closeAllConnections();
        server.removeAllListeners('close');
        resolve(false);
      });
    });
    
    // Timeout after 5 seconds if port is already in use
    setTimeout(() => {
      try {
        server.close();
        resolve(true); // Port appears to be in use
      } catch {}
    }, 5000);
  });
}

/**
 * Find an available port starting from DEFAULT_PORT
 */
function findAvailablePort(startPort = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1)); // Try next port
      } else {
        reject(err);
      }
    });
    
    server.listen(startPort, '127.0.0.1', () => {
      const actualPort = server.address().port;
      server.close(() => resolve(actualPort));
    });
  });
}

/**
 * Check if engine has been built
 */
function checkBuildExists() {
  if (!fs.existsSync(BUILD_DIR)) {
    log(`⚠️ Build directory not found: ${BUILD_DIR}`, 'warn');
    return false;
  }
  
  // Check for index.js
  const indexPath = path.join(BUILD_DIR, 'index.js');
  if (!fs.existsSync(indexPath)) {
    log(`⚠️ engine/dist/index.js not found`, 'warn');
    return false;
  }
  
  return true;
}

/**
 * Build the engine if needed
 */
async function ensureBuilt() {
  const buildExists = checkBuildExists();
  
  if (buildExists) {
    log('✅ Engine already built', 'info');
    return true;
  }
  
  log('⚠️ Building engine (first time or after clean)...', 'info');
  
  try {
    // Run pnpm build in background
    const proc = spawn('npx', ['tsx', 'scripts/build.ts'], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'inherit']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data;
      log(data.toString().trim(), 'info');
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data;
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) log(line, 'info');
      }
    });
    
    await new Promise((resolve, reject) => {
      proc.on('close', (code) => {
        if (code === 0 || code === undefined) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}. Output: ${stderr}`));
        }
      });
    });
    
    // Wait for index.js to be created
    while (!fs.existsSync(indexPath)) {
      await new Promise(r => setTimeout(r, 100));
    }
    
    log('✅ Build complete', 'info');
    return true;
  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

/**
 * Health check endpoint
 */
async function healthCheck(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      
      if (response.status === 200) {
        log('✅ Health check passed - server is ready', 'info');
        return { ok: true, data: await response.json() };
      } else {
        log(`Health check returned ${response.status}`, 'warn');
      }
    } catch (error) {
      log(`Health check failed (${i + 1}/${retries}): ${error.message}`, 'info');
      if (i >= retries - 1) {
        throw error;
      }
    }
    
    // Wait before retry
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
  }
  
  throw new Error('Health check exceeded maximum retries');
}

/**
 * Start the engine process in background using spawn with file redirection for Windows
 */
function startEngine(port = DEFAULT_PORT) {
  log(`Starting Anchor Engine on port ${port}...`, 'info');

  const enginePath = path.join(PROJECT_ROOT, 'engine', 'dist', 'index.js');

  if (!fs.existsSync(enginePath)) {
    throw new Error('Engine not built. Please run: pnpm build');
  }

  // Use spawn with file redirection for Windows compatibility
  const proc = spawn(
    process.env.NODE_EXE || 'C:\\nvm4w\\nodejs\\node.exe',
    [
      '--no-external-ingestion', // Disable watchdog for cleaner startup
      enginePath,
      `--port=${port}`
    ],
    {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'], // Capture both stdout and stderr
      windowsVerbatimArguments: true // Preserve arguments on Windows
    }
  );

  // Log process output to file (not stdout - agents can continue)
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) log(line, 'info');
    }
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.includes('error') || line.includes('Error')) {
        log(line, 'warn');
      } else if (line.trim()) {
        log(line, 'info');
      }
    }
  });

  // Handle process exit
  proc.on('exit', (code) => {
    log(`Engine process exited with code ${code}`, 'info');
    
    // Only restart on genuine crashes (not clean exits).
    // Kill any lingering child processes BEFORE starting a new one
    // to prevent PGlite database lock contention from orphaned processes.
    if (code !== null && code !== undefined && code !== 0) {
      log(`[RESTART] Process exited with code ${code}, killing orphans then restarting...`, 'warn');
      
      try {
        // Kill any remaining node processes that might hold the PGlite lock
        const { execSync } = require('child_process');
        if (process.platform === 'win32') {
          execSync('taskkill /f /im node.exe 2>nul', { timeout: 5000 });
        } else {
          execSync('pkill -f "engine/dist/index.js" 2>/dev/null || true', { timeout: 5000 });
        }
      } catch {}
      
      setTimeout(() => {
        startEngine(port); // Restart engine
      }, 2000);
    }
  });

  return proc;
}

/**
 * Wait for the engine to be healthy
 */
async function waitForHealth(port = DEFAULT_PORT, timeoutMs = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      log(`Waiting for health check at ${HEALTH_CHECK_URL}...`, 'info');
      await new Promise((resolve, reject) => {
        http.get(HEALTH_CHECK_URL, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve({ status: res.statusCode, data: JSON.parse(body) });
            } else {
              reject(new Error(`Unexpected status: ${res.statusCode}`));
            }
          });
        }).on('error', reject);
      });
      
      break; // Health check passed
    } catch (error) {
      log(`Waiting for server (${Date.now() - startTime}ms elapsed)...`, 'info');
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  
  if (Date.now() - startTime >= timeoutMs) {
    throw new Error('Server startup timed out after 60 seconds');
  }
}

/**
 * Main function - start engine in background
 */
async function main() {
  const timestamp = Date.now();
  
  try {
    log('========================================', 'info');
    log('Anchor Engine Background Startup', 'info');
    log('========================================', 'info');
    
    // Step 1: Ensure build exists
    log('[Step 1/4] Checking build status...', 'info');
    await ensureBuilt();
    
    // Step 2: Check for port conflicts
    log('[Step 2/4] Checking port availability...', 'info');
    const portInUse = await isPortInUse(DEFAULT_PORT);
    if (portInUse) {
      log(`⚠️ Port ${DEFAULT_PORT} is in use. Finding alternative...`, 'warn');
      const availablePort = await findAvailablePort(DEFAULT_PORT);
      log(`✅ Using port ${availablePort} instead`, 'info');
      // Use the available port for subsequent checks
      DEFAULT_PORT = availablePort;
    } else {
      log(`✅ Port ${DEFAULT_PORT} is available`, 'info');
    }
    
    // Step 3: Start the engine (background process)
    log('[Step 3/4] Starting engine process...', 'info');
    engineProcess = startEngine(DEFAULT_PORT);

    // Step 4: Poll for health check until ready (non-blocking for agent)
    log('[Step 4/4] Waiting for server to be ready...');
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timed out after 60s'));
        }, 120000);

        // Poll health endpoint every second until ready or timeout
        const pollInterval = setInterval(async () => {
          try {
            const res = await fetch(HEALTH_CHECK_URL, { timeout: 3000 });
            if (res.status === 200) {
              clearInterval(pollInterval);
              clearTimeout(timeout);
              log('✅ Health check passed - server is ready', 'info');
              resolve();
            }
          } catch (error) {
            // Continue polling on error
          }
        }, 1000);
      });
    } catch (error) {
      // Server failed to start
      engineProcess.kill();
      throw error;
    }
    
    log('========================================', 'info');
    log('✅ Anchor Engine started successfully!', 'info');
    log(`Server: http://localhost:${DEFAULT_PORT}`, 'info');
    log(`Health: http://localhost:${DEFAULT_PORT}/health`, 'info');
    log(`Logs: .anchor/logs/`, 'info');
    log('========================================', 'info');
    
    // Log summary
    const summary = {
      timestamp: new Date().toISOString(),
      port: DEFAULT_PORT,
      status: 'started'
    };
    fs.writeFileSync(
      path.join(LOGS_DIR, `start-${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );
    
  } catch (error) {
    log(`❌ Failed to start engine: ${error.message}`, 'error');
    log(error.stack, 'error');
    
    // Write error to file
    const errorSummary = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    };
    fs.writeFileSync(
      path.join(LOGS_DIR, `start-error-${Date.now()}.json`),
      JSON.stringify(errorSummary, null, 2)
    );
    
    process.exit(1);
  }
  
  // Exit immediately so agent can continue
  log('👋 Exiting - engine running in background', 'info');
  process.exit(0);
}

// Run main function
main();
