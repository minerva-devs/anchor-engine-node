// engine/src/index.ts
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, rmSync } from "fs";

// Fix module load error by using explicit relative path
import { db } from "./core/db.js";
import { config } from "./config/index.js";
import { MODELS_DIR, PROJECT_ROOT } from "./config/paths.js";
import { apiKeyAuth } from "./middleware/auth.js";
import { pathManager } from "./utils/path-manager.js";
import { StructuredLogger } from "./utils/structured-logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: express.Application = express();
const PORT = config.PORT;

// Security Fix: Limit JSON body size to prevent DoS via large payloads
// Use configured file size limit + 50% buffer for JSON overhead (base64/escaping)
const jsonLimit = Math.ceil((config.LIMITS?.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024) * 1.5);

app.use(cors());
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Skip logging for health checks and 304 (Not Modified) responses
    // Health checks poll every minute and create log spam
    if (status === 304 || req.path === '/health') {
      return;
    }

    StructuredLogger.info('HTTP_REQUEST', {
      method: req.method,
      path: req.path,
      status,
      duration_ms: duration
    });

    // Mark activity for idle manager (skip static files)
    if (!req.path.startsWith('/static') && !req.path.startsWith('/chat')) {
      idleManager.markActive(`${req.method} ${req.path}`);
    }
  });
  next();
});

// Error handler with proper type handling

// Global state tracker
let databaseReady = false;

// SECURITY FIX #4: Require API key in production (fail closed, not open)
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !config.API_KEY) {
  throw new Error(
    'SECURITY ERROR: API_KEY must be set in production! ' +
    'Set server.api_key in user_settings.json or ANCHOR_API_KEY environment variable. ' +
    'For safety, the server will not start without authentication in production mode.'
  );
}

// API Key Authentication for /v1 routes
app.use('/v1', apiKeyAuth);
if (config.API_KEY) {
  StructuredLogger.info('AUTH_CONFIG', { api_key_enabled: true });
} else {
  StructuredLogger.warn('AUTH_CONFIG', {
    api_key_enabled: false,
    warning: '⚠️ NO API KEY CONFIGURED - Authentication disabled! DEVELOPMENT MODE ONLY. Set server.api_key in user_settings.json for production.'
  });
}

// Rate limiting — applied after auth so authenticated clients share the same window
// General limit: 100 requests / minute per IP
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Rate limit exceeded. Try again in a minute.' }
});
// Stricter limit for expensive write operations: 20 / minute per IP
const ingestLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded', message: 'Ingest rate limit exceeded. Try again in a minute.' }
});
app.use('/v1', apiLimiter);
app.use('/v1/memory/ingest', ingestLimiter);
app.use('/v1/watchdog/ingest', ingestLimiter);

// Set up static file serving immediately so UI is accessible
StructuredLogger.info('UI_SETUP', { static_path: '/static' });
app.use("/static", express.static(path.join(__dirname, "../dist"), {
  setHeaders: (res, path) => {
    // Only log debug-level for static files to avoid spam
    StructuredLogger.silly('STATIC_FILE', { path });
  }
}));

// Serve UI from engine/public (simplified single-file UI)
// Fallback to external anchor-os UI if running in full system mode
const internalFrontendDist = path.join(__dirname, "../public");
const externalFrontendDist = path.join(__dirname, "../../../anchor-os/packages/anchor-ui/dist");

if (existsSync(externalFrontendDist)) {
  StructuredLogger.info('UI_SOURCE', { source: 'external', path: externalFrontendDist });
  app.use(express.static(externalFrontendDist, {
    setHeaders: (res, path) => {
      StructuredLogger.silly('UI_FILE_SERVED', { path, source: 'external' });
    }
  }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/v1") || req.path.startsWith("/health") || req.path.startsWith("/monitoring")) return next();
    res.sendFile(path.join(externalFrontendDist, "index.html"));
  });
} else {
  StructuredLogger.info('UI_SOURCE', { source: 'internal', path: internalFrontendDist });
  app.use(express.static(internalFrontendDist, {
    setHeaders: (res, path) => {
      StructuredLogger.silly('UI_FILE_SERVED', { path, source: 'internal' });
    }
  }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/v1") || req.path.startsWith("/health") || req.path.startsWith("/monitoring")) return next();
    res.sendFile(path.join(internalFrontendDist, "index.html"));
  });
}

// Add explicit /chat route logging
app.get('/chat', (req, res, next) => {
  StructuredLogger.info('CHAT_PAGE_REQUEST', { ip: req.ip });
  next();
});

// Set up a health route that works in both initialized and uninitialized states
app.get('/health', async (_req, res) => {
  if (!databaseReady) {
    return res.status(200).json({
      status: "starting",
      timestamp: new Date().toISOString(),
      message: "Engine is starting up, database not yet initialized"
    });
  }

  // When DB is ready, perform full health check
  try {
    // Test database connectivity
    const result = await db.run('SELECT 1 as test');
    if (result && result.rows && result.rows.length > 0) {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        message: "Anchor Context Engine is running and database is responsive"
      });
    } else {
      res.status(503).json({
        status: "degraded",
        timestamp: new Date().toISOString(),
        message: "Engine is running but database query returned unexpected results"
      });
    }
  } catch (dbError) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      message: "Database is not responding properly",
      error: (dbError as Error).message
    });
  }
});

// Set up API routes that can handle uninitialized state
// Use more specific patterns to avoid conflicts with health route

// Model Listing Endpoint (for UI)
app.get('/v1/models', (req, res) => {
  try {
    // Use the robust path from configuration (imported statically)
    let modelPath = config.LLM_MODEL_DIR || MODELS_DIR;

    // If config has a relative path, resolve it against project root
    if (config.LLM_MODEL_DIR && !path.isAbsolute(config.LLM_MODEL_DIR)) {
      // If it starts with ./models, it might be relative to project root
      // MODELS_DIR is already absolute path to project_root/models
      if (config.LLM_MODEL_DIR === './models' || config.LLM_MODEL_DIR === 'models') {
        modelPath = MODELS_DIR;
      } else {
        modelPath = path.resolve(PROJECT_ROOT, config.LLM_MODEL_DIR);
      }
    }

    if (!existsSync(modelPath)) {
      return res.json({ object: 'list', data: [] });
    }

    // Read directory
    import('fs').then(fsModule => {
      const files = fsModule.readdirSync(modelPath).filter(file => file.endsWith('.gguf'));
      const models = files.map(file => ({
        id: file,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'anchor-os'
      }));
      res.json({ object: 'list', data: models });
    });
  } catch (error) {
    console.error('[Engine] Error listing models:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});



// Set up the catch-all route for UI (should be LAST)
// Catch-all moved to end of startServer to avoid intercepting dynamic routes


async function startServer() {
  try {
    console.time("⏱️ Startup Time");
    StructuredLogger.info('ENGINE_STARTUP', { message: "Initializing Anchor Context Engine..." });

    // ============================================
    // CRITICAL: Initialize database BEFORE server starts
    // This prevents race condition where requests hit uninitialized DB
    // ============================================
    StructuredLogger.info('DATABASE_INIT', { message: "Initializing database..." });
    await db.init();
    databaseReady = true;
    StructuredLogger.info('DATABASE_INIT', { message: "Database initialized successfully" });

    // Cleanup blacklisted tags from database
    StructuredLogger.info('STARTUP_TASK', { message: '[Startup] Cleaning up blacklisted tags...' });
    const { cleanupBlacklistedTags } = await import('./utils/tag-cleanup.js');
    await cleanupBlacklistedTags();

    // Initialize Vector Service
    const { vector } = await import("./core/vector.js");
    await vector.init();

    StructuredLogger.info('ROUTING_SETUP', { message: "Setting up full routes after database initialization..." });

    // Now that DB is ready, import and set up full routes
    const { setupRoutes } = await import("./routes/api.js");
    const { setupHealthRoutes } = await import("./routes/health.js");
    const { monitoringRouter } = await import("./routes/monitoring.js");

    // Set up all API routes (delegates to v1 modules including system + settings)
    setupRoutes(app);

    // Set up full health routes (this will replace the basic one)
    setupHealthRoutes(app);

    // Set up monitoring routes
    app.use('/monitoring', monitoringRouter);

    // ============================================
    // FIX: Start server AFTER all routes are configured
    // This prevents race condition where requests hit before routes are ready
    // ============================================
    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(PORT, config.HOST, () => {
        StructuredLogger.info('SERVER_START', { 
          message: `Anchor Context Engine running on ${config.HOST}:${PORT}`,
          host: config.HOST,
          port: PORT
        });
        StructuredLogger.info('HEALTH_CHECK', { 
          message: `Health check available at http://${config.HOST}:${PORT}/health`,
          url: `http://${config.HOST}:${PORT}/health`
        });
        resolve(s);
      });
    });

    StructuredLogger.info('ROUTING_SETUP', { message: "Full routes set up, server is ready for all requests" });
    console.timeEnd("⏱️ Startup Time");

    // Start other services after database is ready
    StructuredLogger.info('SERVICES_INIT', { message: '[Services] Starting child services via ProcessManager...' });

    // Note: Nanobot is now started by the unified launcher (start.bat/start.sh)
    // to prevent duplicate instances. ProcessManager is disabled for nanobot.
    StructuredLogger.info('SERVICES_INIT', { message: '[Services] Nanobot skipped (started by launcher)' });

    // Watchdog is now controlled via UI settings - not auto-started
    StructuredLogger.info('SERVICES_INIT', { message: '[Services] Watchdog disabled - start from /settings UI' });

    // Dreamer service disabled - optimized for STAR algorithm startup (v4.0)
    StructuredLogger.info('SERVICES_INIT', { message: '[Services] All service start commands queued' });

    // ============================================
    // Standard 110: Regenerate Derived Data
    // ============================================
    // On startup: regenerate all derived data from inbox/ (source of truth)

    // 1. Create mirror from inbox/ files
    StructuredLogger.info('STARTUP_TASK', { message: '[Startup] Regenerating mirrored_brain/ from inbox/ (Standard 110)...' });
    const { createMirror } = await import('./services/mirror/mirror.js');
    await createMirror();

    // 2. Generate synonym rings automatically (Standard 111)
    StructuredLogger.info('STARTUP_TASK', { message: '[Startup] Auto-generating synonym rings from data (Standard 111)...' });
    try {
      const { AutoSynonymGenerator } = await import('./services/synonyms/auto-synonym-generator.js');
      const generator = new AutoSynonymGenerator();

      // Run synonym generation in background with timeout (don't block startup)
      StructuredLogger.info('STARTUP_TASK', { message: '[Startup] Starting synonym generation in background (may take several minutes)...' });

      // Set timeout for synonym generation (5 minutes max)
      const SYNONYM_TIMEOUT = 5 * 60 * 1000; // 5 minutes

      const synonymPromise = Promise.race([
        generator.generateSynonymRings(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Synonym generation timeout after 5 minutes')), SYNONYM_TIMEOUT)
        )
      ]);

      // FIX: Proper error handling - catch errors in .then() callback too
      synonymPromise.then(async (synonyms) => {
        // Save to auto-generated path (cleared on shutdown)
        const synonymPath = path.join(pathManager.getNotebookDir(), 'synonym-ring-auto.json');
        await generator.saveSynonymRings(synonyms, synonymPath);
        StructuredLogger.info('STARTUP_TASK', { 
          message: `[Startup] ✅ Synonym rings generated and saved to ${synonymPath}`,
          path: synonymPath
        });
      }).catch((error) => {
        StructuredLogger.warn('STARTUP_TASK', {
          message: `[Startup] ⚠️ Synonym generation failed or timed out: ${error.message}`,
          error_message: error.message
        });
        StructuredLogger.warn('STARTUP_TASK', {
          message: '[Startup] Will retry on next startup or run manually with: pnpm run generate-synonyms'
        });
      });

      // Don't wait for synonym generation to complete - system is ready
      StructuredLogger.info('STARTUP_TASK', { message: '[Startup] System ready. Synonym generation running in background...' });
    } catch (error: any) {
      StructuredLogger.warn('STARTUP_TASK', { 
        message: '[Startup] Synonym generation failed:',
        error_message: error.message
      });
      StructuredLogger.warn('STARTUP_TASK', { 
        message: '[Startup] Search will work without synonym expansion.' 
      });
    }

    StructuredLogger.info('STARTUP_TASK', { message: '[Startup] All derived data regenerated. System ready.' });


  } catch (error) {
    StructuredLogger.error("Failed to start Anchor Context Engine:", error instanceof Error ? error.message : String(error), {
      event: 'ENGINE_STARTUP'
    });
    process.exit(1);
  }
}

// Windows graceful shutdown fix
process.on("SIGINT", async () => {
  // Safety net: force exit if cleanup hangs (e.g., db.close deadlock)
  const forceExitTimer = setTimeout(() => {
    console.error('[Shutdown] ⚠ Cleanup timed out after 10s — forcing exit');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] Starting graceful shutdown...` });

    const { ProcessManager } = await import("./utils/process-manager.js");
    ProcessManager.getInstance().stopAll();

    // Close database connection first (releases file locks)
    StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] Closing database connection...` });
    await db.close();

    // Standard 110: Ephemeral Index Architecture
    // Clear ALL derived data on shutdown - only inbox/ is source of truth

    // 1. Wipe PGlite Database (index/cache)
    const dbPath = process.env.PGLITE_DB_PATH || pathManager.getDatabasePath();
    if (existsSync(dbPath)) {
      StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] Wiping PGlite database (rebuildable index)...` });
      try {
        rmSync(dbPath, { recursive: true, force: true });
        StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] ✓ PGlite database wiped.` });
      } catch (e: any) {
        StructuredLogger.warn('SHUTDOWN', { 
          message: `[Shutdown] ⚠ Could not wipe PGlite database: ${e.message}`,
          error_message: e.message
        });
        StructuredLogger.warn('SHUTDOWN', { 
          message: `[Shutdown] Will be wiped on next startup` 
        });
      }
    }

    // 2. Wipe SQLite3 context.db (anchor-core FFI database)
    const contextDbPath = path.join(pathManager.getDatabaseDir(), 'context.db');
    if (existsSync(contextDbPath)) {
      StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] Wiping SQLite3 context.db (anchor-core FFI)...` });
      try {
        rmSync(contextDbPath, { force: true });
        StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] ✓ SQLite3 context.db wiped.` });
      } catch (e: any) {
        StructuredLogger.warn('SHUTDOWN', { 
          message: `[Shutdown] ⚠ Could not wipe SQLite3 context.db: ${e.message}`,
          error_message: e.message
        });
        StructuredLogger.warn('SHUTDOWN', { 
          message: `[Shutdown] Will be wiped on next startup` 
        });
      }
    }

    // 3. Clear mirrored_brain/ (extracted from inbox/, regenerated on start)
    const { MIRRORED_BRAIN_PATH } = await import('./services/mirror/mirror.js');
    if (existsSync(MIRRORED_BRAIN_PATH)) {
      StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] Clearing mirrored_brain/ (regenerated from inbox/ on start)...` });
      try {
        rmSync(MIRRORED_BRAIN_PATH, { recursive: true, force: true });
        StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] ✓ mirrored_brain/ cleared.` });
      } catch (e: any) {
        StructuredLogger.warn('SHUTDOWN', { 
          message: `[Shutdown] ⚠ Could not clear mirrored_brain/: ${e.message}`,
          error_message: e.message
        });
      }
    }

    // 4. Clear Auto-Generated Synonym Rings (derived from data, regenerated on start)
    const synonymPath = path.join(pathManager.getNotebookDir(), 'synonym-ring-auto.json');
    if (existsSync(synonymPath)) {
      StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] Clearing auto-generated synonym rings...` });
      try {
        rmSync(synonymPath, { force: true });
        StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] ✓ Synonym rings cleared.` });
      } catch (e: any) {
        StructuredLogger.warn('SHUTDOWN', { 
          message: `[Shutdown] ⚠ Could not clear synonym rings: ${e.message}`,
          error_message: e.message
        });
      }
    }

    // 5. Clear Tag Audit Cache (derived from tags, regenerated on demand)
    const tagAuditPath = path.join(pathManager.getNotebookDir(), 'tag-audit-cache.json');
    if (existsSync(tagAuditPath)) {
      StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] Clearing tag audit cache...` });
      try {
        rmSync(tagAuditPath, { force: true });
        StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] ✓ Tag audit cache cleared.` });
      } catch (e: any) {
        StructuredLogger.warn('SHUTDOWN', { 
          message: `[Shutdown] ⚠ Could not clear tag audit cache: ${e.message}`,
          error_message: e.message
        });
      }
    }

    StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] ✓ Cleanup complete.` });
    StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] Source of truth preserved: inbox/ + external-inbox/` });
    StructuredLogger.info('SHUTDOWN', { message: `[Shutdown] On restart: mirror + index + synonyms regenerated from inbox/` });

    process.exit(0);
  } catch (e) {
    StructuredLogger.error('[Shutdown] Error during cleanup:', e instanceof Error ? e.message : String(e), {
      event: 'SHUTDOWN'
    });
    process.exit(1);
  }
});

// Memory warning event handler
import { resourceManager } from './utils/resource-manager.js';
process.on('warning', (warning) => {
  StructuredLogger.warn('PROCESS_WARNING', { 
    name: warning.name, 
    message: warning.message 
  });
  if (warning.name.includes('Memory') || warning.message.includes('heap')) {
    StructuredLogger.info('MEMORY_OPTIMIZATION', { message: 'Performing memory optimization due to warning...' });
    resourceManager.optimizeMemory();
  }
});

// FIX: Global unhandled rejection handler to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  StructuredLogger.error('UNHANDLED_REJECTION:', reason instanceof Error ? reason.message : String(reason), { 
    promise_info: String(promise),
    reason_message: reason instanceof Error ? reason.message : String(reason)
  });
  // Don't exit - log and continue (Node.js default is to crash)
});

// FIX: Global uncaught exception handler
process.on('uncaughtException', (error) => {
  StructuredLogger.error('UNCAUGHT_EXCEPTION:', error instanceof Error ? error.message : String(error), {
    stack: error instanceof Error ? error.stack : undefined
  });
  // Attempt graceful shutdown
  process.exit(1);
});

// Initialize Performance Monitor
import { PerformanceMonitor } from './services/monitoring/performance-monitor.js';
const perfMonitor = PerformanceMonitor.getInstance({
  intervalMs: 10000, // Every 10 seconds
  logLevel: 'info',
  collectDetailedMetrics: true,
  alertThresholds: {
    memoryUsage: 80,
    cpuUsage: 80,
    responseTime: 5000
  }
});
perfMonitor.start();
StructuredLogger.info('PERFORMANCE_MONITOR', { message: '[PerformanceMonitor] Service initialized and started' });

// Initialize Idle Manager for automatic memory cleanup during inactivity
import { idleManager } from './services/idle-manager.js';
StructuredLogger.info('IDLE_MANAGER', { message: '[IdleManager] Service initialized' });

startServer();
export { app };