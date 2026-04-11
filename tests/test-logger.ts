#!/usr/bin/env node
/**
 * Centralized Test Logger
 * 
 * Captures all test output into a single log file per test run.
 * Logs are stored in /logs/tests/ and truncated to last 10,000 lines.
 * 
 * Usage:
 *   const logger = new TestLogger({ testName: 'search-unit', testPath: './tests/unit/search.test.ts' });
 *   logger.log('info', 'Test started');
 *   logger.log('error', 'Test failed', error);
 *   logger.end();
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOGS_DIR = path.join(__dirname, '..', 'logs', 'tests');
const MAX_LOG_LINES = 10000;

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

interface TestLoggerOptions {
  testName: string;
  testPath?: string;
  metadata?: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug' | 'silly';
  message: string;
  data?: any;
}

export class TestLogger {
  private entries: LogEntry[] = [];
  private startTime: number;
  private testName: string;
  private testPath?: string;
  private metadata: Record<string, any>;
  private logFile?: string;

  constructor(options: TestLoggerOptions) {
    this.startTime = Date.now();
    this.testName = options.testName;
    this.testPath = options.testPath;
    this.metadata = options.metadata || {};
    
    // Generate unique log filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const hash = createHash('md5').update(`${timestamp}-${options.testName}`).digest('hex').slice(0, 8);
    this.logFile = path.join(LOGS_DIR, `${options.testName}-${timestamp}-${hash}.log`);
    
    // Capture all console output
    this.captureConsole();
    
    // Log startup
    this.log('info', 'Test logger initialized', {
      testName: this.testName,
      testPath: this.testPath,
      logFile: this.logFile,
    });
  }

  /**
   * Capture all console output
   */
  private captureConsole(): void {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalDebug = console.debug;
    const originalSilly = console.silly || (() => {});

    console.log = (...args) => {
      this.log('info', args.map(a => this.formatValue(a)).join(' '));
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.log('error', args.map(a => this.formatValue(a)).join(' '));
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.log('warn', args.map(a => this.formatValue(a)).join(' '));
      originalWarn.apply(console, args);
    };

    console.debug = (...args) => {
      this.log('debug', args.map(a => this.formatValue(a)).join(' '));
      originalDebug.apply(console, args);
    };

    console.silly = (...args) => {
      this.log('silly', args.map(a => this.formatValue(a)).join(' '));
      originalSilly.apply(console, args);
    };
  }

  /**
   * Format a value for logging
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    
    if (value instanceof Error) {
      return `${value.message}\n${value.stack}`;
    }
    
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  }

  /**
   * Add a log entry
   */
  private addEntry(level: LogEntry['level'], message: string, data?: any): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    });
  }

  /**
   * Log a message
   */
  log(level: LogEntry['level'], message: string, data?: any): void {
    this.addEntry(level, message, data);
  }

  /**
   * Log info
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log error
   */
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * Log warning
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log debug
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log silly/verbose
   */
  silly(message: string, data?: any): void {
    this.log('silly', message, data);
  }

  /**
   * End the test run and write log file
   */
  end(exitCode: number = 0, results?: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  }): void {
    // Restore console
    this.restoreConsole();

    // Calculate duration
    const duration = Date.now() - this.startTime;

    // Add final entries
    this.log('info', 'Test run completed', {
      exitCode,
      duration: `${duration}ms`,
      results,
    });

    // Write log file
    this.writeLogFile(exitCode, duration, results);

    // Truncate if needed
    this.truncateLogFile();

    console.log(`\n✅ Test log written to: ${this.logFile}`);
  }

  /**
   * Write log file
   */
  private writeLogFile(exitCode: number, duration: number, results?: any): void {
    const lines: string[] = [];

    // Header with metadata
    lines.push('='.repeat(80));
    lines.push('TEST RUN LOG');
    lines.push('='.repeat(80));
    lines.push(`Test Name: ${this.testName}`);
    lines.push(`Test Path: ${this.testPath || 'N/A'}`);
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push(`Duration:  ${duration}ms`);
    lines.push(`Exit Code: ${exitCode}`);
    lines.push('');

    // Results summary
    if (results) {
      lines.push('RESULTS:');
      lines.push(`  Passed:  ${results.passed}`);
      lines.push(`  Failed:  ${results.failed}`);
      lines.push(`  Skipped: ${results.skipped}`);
      lines.push(`  Total:   ${results.total}`);
      lines.push('');
    }

    // Custom metadata
    if (Object.keys(this.metadata).length > 0) {
      lines.push('METADATA:');
      lines.push(JSON.stringify(this.metadata, null, 2));
      lines.push('');
    }

    // Log entries
    lines.push('LOG ENTRIES:');
    lines.push('-'.repeat(80));
    
    for (const entry of this.entries) {
      const timestamp = entry.timestamp.slice(11, 26); // HH:MM:ss.SSS
      const levelPad = `[${entry.level.toUpperCase()}]`;
      const message = entry.message;
      
      if (entry.data) {
        lines.push(`${timestamp} ${levelPad} ${message}`);
        lines.push(`  ${JSON.stringify(entry.data, null, 2)}`);
      } else {
        lines.push(`${timestamp} ${levelPad} ${message}`);
      }
    }

    lines.push('='.repeat(80));
    lines.push('END OF LOG');
    lines.push('='.repeat(80));

    // Write to file
    fs.writeFileSync(this.logFile, lines.join('\n'), 'utf-8');
  }

  /**
   * Truncate log file to last N lines
   */
  private truncateLogFile(): void {
    try {
      const content = fs.readFileSync(this.logFile, 'utf-8');
      const lines = content.split('\n');

      if (lines.length > MAX_LOG_LINES) {
        const truncated = lines.slice(-MAX_LOG_LINES);
        fs.writeFileSync(this.logFile, truncated.join('\n'), 'utf-8');
        console.log(`[TestLogger] Truncated ${this.logFile} from ${lines.length} to ${MAX_LOG_LINES} lines`);
      }
    } catch (e) {
      console.error(`[TestLogger] Failed to truncate log: ${e}`);
    }
  }

  /**
   * Restore console
   */
  private restoreConsole(): void {
    console.log = console.log.__original || console.log;
    console.error = console.error.__original || console.error;
    console.warn = console.warn.__original || console.warn;
    console.debug = console.debug.__original || console.debug;
    console.silly = console.silly.__original || console.silly;
  }

  /**
   * Get log file path
   */
  getLogFile(): string {
    return this.logFile || 'N/A';
  }

  /**
   * Get all entries (for programmatic access)
   */
  getEntries(): LogEntry[] {
    return this.entries;
  }
}

/**
 * Create a test logger with convenience function
 */
export function createTestLogger(options: TestLoggerOptions): TestLogger {
  return new TestLogger(options);
}
