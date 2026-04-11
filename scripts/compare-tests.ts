#!/usr/bin/env node
/**
 * A/B Test Comparison Tool
 * 
 * Compares two test log files and generates a markdown report showing differences.
 * 
 * Usage:
 *   node scripts/compare-tests.ts <log1> <log2>
 *   node scripts/compare-tests.ts logs/tests/search-*.log logs/tests/search-*.log
 * 
 * Or compare by pattern:
 *   node scripts/compare-tests.ts --pattern "search-*.log"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(ROOT, 'logs', 'tests');

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

interface ComparisonResult {
  log1: {
    path: string;
    entries: LogEntry[];
    metadata: any;
    results?: any;
  };
  log2: {
    path: string;
    entries: LogEntry[];
    metadata: any;
    results?: any;
  };
  differences: {
    metadata: string[];
    results: string[];
    timing: {
      duration1: number;
      duration2: number;
      difference: number;
      improvement: number;
    };
    summary: {
      passed1: number;
      passed2: number;
      failed1: number;
      failed2: number;
    };
  };
}

/**
 * Parse a log file
 */
function parseLogFile(logPath: string): {
  entries: LogEntry[];
  metadata: any;
  results?: any;
} {
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  
  const entries: LogEntry[] = [];
  let metadata: any = {};
  let results: any = undefined;
  
  let inMetadata = false;
  let inResults = false;
  let metadataBuffer = '';
  let resultsBuffer = '';
  
  for (const line of lines) {
    // Parse metadata section
    if (line.startsWith('Test Name:')) {
      inMetadata = true;
      metadata = {};
      continue;
    }
    if (inMetadata) {
      if (line.startsWith('Test Path:') || line.startsWith('Timestamp:') || 
          line.startsWith('Duration:') || line.startsWith('Exit Code:')) {
        const [key, value] = line.split(': ').map(s => s.trim());
        metadata[key.toLowerCase()] = value;
      } else if (line.startsWith('RESULTS:')) {
        inMetadata = false;
        inResults = true;
        results = {};
        continue;
      } else if (line.startsWith('METADATA:')) {
        metadataBuffer = '';
        continue;
      } else if (inResults) {
        if (line.startsWith('  ')) {
          const match = line.match(/  (\w+):\s*(.+)/);
          if (match) {
            results[match[1]] = parseInt(match[2]);
          }
        } else if (line === '' || line === 'Results:') {
          continue;
        } else {
          inResults = false;
        }
      } else if (line.startsWith('  Passed:') || line.startsWith('  Failed:') || 
                 line.startsWith('  Skipped:') || line.startsWith('  Total:')) {
        const match = line.match(/  (\w+):\s*(.+)/);
        if (match) {
          results[match[1].toLowerCase()] = parseInt(match[2]);
        }
      }
      continue;
    }
    
    // Parse log entries
    const entryMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) \[(\w+)\] (.+)/);
    if (entryMatch) {
      entries.push({
        timestamp: entryMatch[1],
        level: entryMatch[2].toLowerCase(),
        message: entryMatch[3],
      });
    }
  }
  
  // Parse custom metadata if present
  if (metadataBuffer) {
    try {
      metadata.custom = JSON.parse(metadataBuffer);
    } catch {
      // Ignore parse errors
    }
  }
  
  return { entries, metadata, results };
}

/**
 * Compare two log files
 */
function compareLogs(log1Path: string, log2Path: string): ComparisonResult {
  const log1 = parseLogFile(log1Path);
  const log2 = parseLogFile(log2Path);
  
  const differences: ComparisonResult['differences'] = {
    metadata: [],
    results: [],
    timing: {
      duration1: 0,
      duration2: 0,
      difference: 0,
      improvement: 0,
    },
    summary: {
      passed1: 0,
      passed2: 0,
      failed1: 0,
      failed2: 0,
    },
  };
  
  // Compare metadata
  for (const key of Object.keys(log1.metadata)) {
    if (log1.metadata[key] !== log2.metadata[key]) {
      differences.metadata.push(`  ${key}: ${log1.metadata[key]} → ${log2.metadata[key]}`);
    }
  }
  
  // Compare results
  if (log1.results && log2.results) {
    for (const key of Object.keys(log1.results)) {
      if (log1.results[key] !== log2.results[key]) {
        differences.results.push(`  ${key}: ${log1.results[key]} → ${log2.results[key]}`);
      }
    }
    
    // Calculate timing difference
    const duration1 = parseInt(log1.metadata.duration?.replace('ms', '')) || 0;
    const duration2 = parseInt(log2.metadata.duration?.replace('ms', '')) || 0;
    
    differences.timing.duration1 = duration1;
    differences.timing.duration2 = duration2;
    differences.timing.difference = duration2 - duration1;
    differences.timing.improvement = duration1 > 0 ? ((duration1 - duration2) / duration1) * 100 : 0;
    
    // Calculate pass/fail summary
    differences.summary.passed1 = log1.results.passed || 0;
    differences.summary.passed2 = log2.results.passed || 0;
    differences.summary.failed1 = log1.results.failed || 0;
    differences.summary.failed2 = log2.results.failed || 0;
  }
  
  return {
    log1: { path: log1Path, entries: log1.entries, metadata: log1.metadata, results: log1.results },
    log2: { path: log2Path, entries: log2.entries, metadata: log2.metadata, results: log2.results },
    differences,
  };
}

/**
 * Generate markdown report
 */
function generateReport(result: ComparisonResult): string {
  const report: string[] = [];
  
  report.push('# A/B Test Comparison Report');
  report.push('');
  report.push('## Overview');
  report.push('');
  report.push(`**Left (Base):** ${result.log1.path}`);
  report.push(`**Right (New):** ${result.log2.path}`);
  report.push('');
  
  // Timing comparison
  report.push('## ⏱️ Performance');
  report.push('');
  report.push(`| Metric | Base | New | Difference |`);
  report.push(`|--------|------|-----|------------|`);
  report.push(`| Duration | ${result.differences.timing.duration1}ms | ${result.differences.timing.duration2}ms | ${result.differences.timing.difference > 0 ? '+' : ''}${result.differences.timing.difference}ms |`);
  
  if (result.differences.timing.improvement !== 0) {
    const sign = result.differences.timing.improvement > 0 ? '🟢' : '🔴';
    report.push(`| **Improvement** | - | - | ${sign} ${result.differences.timing.improvement.toFixed(2)}% |`);
  }
  report.push('');
  
  // Results comparison
  report.push('## 📊 Test Results');
  report.push('');
  report.push(`| Metric | Base | New | Change |`);
  report.push(`|--------|------|-----|--------|`);
  report.push(`| Passed | ${result.differences.summary.passed1} | ${result.differences.summary.passed2} | ${result.differences.summary.passed2 - result.differences.summary.passed1} |`);
  report.push(`| Failed | ${result.differences.summary.failed1} | ${result.differences.summary.failed2} | ${result.differences.summary.failed2 - result.differences.summary.failed1} |`);
  report.push('');
  
  // Metadata differences
  if (result.differences.metadata.length > 0) {
    report.push('## 🔍 Metadata Differences');
    report.push('');
    for (const diff of result.differences.metadata) {
      report.push(diff);
    }
    report.push('');
  }
  
  // Results differences
  if (result.differences.results.length > 0) {
    report.push('## 📈 Results Differences');
    report.push('');
    for (const diff of result.differences.results) {
      report.push(diff);
    }
    report.push('');
  }
  
  // Summary
  report.push('## 📝 Summary');
  report.push('');
  
  const passedChanged = result.differences.summary.passed1 !== result.differences.summary.passed2;
  const failedChanged = result.differences.summary.failed1 !== result.differences.summary.failed2;
  const timingChanged = result.differences.timing.difference !== 0;
  
  if (passedChanged || failedChanged) {
    report.push('**Test results changed:**');
    if (passedChanged) {
      report.push(`- Passed: ${result.differences.summary.passed1} → ${result.differences.summary.passed2}`);
    }
    if (failedChanged) {
      report.push(`- Failed: ${result.differences.summary.failed1} → ${result.differences.summary.failed2}`);
    }
    report.push('');
  }
  
  if (timingChanged) {
    report.push('**Performance changed:**');
    report.push(`- Duration: ${result.differences.timing.duration1}ms → ${result.differences.timing.duration2}ms (${result.differences.timing.difference > 0 ? '+' : ''}${result.differences.timing.difference}ms, ${result.differences.timing.improvement.toFixed(2)}%)`);
    report.push('');
  }
  
  if (!passedChanged && !failedChanged && !timingChanged && result.differences.metadata.length === 0 && result.differences.results.length === 0) {
    report.push('✅ No significant differences detected between the two test runs.');
    report.push('');
  }
  
  return report.join('\n');
}

/**
 * Find log files by pattern
 */
function findLogFiles(pattern: string): string[] {
  const files = fs.readdirSync(LOGS_DIR);
  const regex = new RegExp(pattern.replace('*', '.*'));
  return files.filter(f => regex.test(f)).map(f => path.join(LOGS_DIR, f));
}

// Main
const args = process.argv.slice(2);

if (args[0] === '--pattern') {
  const pattern = args[1];
  if (!pattern) {
    console.error('Usage: node scripts/compare-tests.ts --pattern "<pattern>"');
    console.error('Example: node scripts/compare-tests.ts --pattern "search-*.log"');
    process.exit(1);
  }
  
  const logFiles = findLogFiles(pattern);
  if (logFiles.length < 2) {
    console.error(`Not enough log files found matching pattern: ${pattern}`);
    console.error('Found:', logFiles.length);
    process.exit(1);
  }
  
  const result = compareLogs(logFiles[0], logFiles[1]);
  const report = generateReport(result);
  
  // Write report to file
  const reportPath = path.join(LOGS_DIR, `comparison-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`\n📊 A/B Comparison Report Generated`);
  console.log(`📁 Report saved to: ${reportPath}`);
  console.log('\n' + report);
} else if (args.length >= 2) {
  const log1 = path.isAbsolute(args[0]) ? args[0] : path.join(LOGS_DIR, args[0]);
  const log2 = path.isAbsolute(args[1]) ? args[1] : path.join(LOGS_DIR, args[1]);
  
  if (!fs.existsSync(log1)) {
    console.error(`Log file not found: ${log1}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(log2)) {
    console.error(`Log file not found: ${log2}`);
    process.exit(1);
  }
  
  const result = compareLogs(log1, log2);
  const report = generateReport(result);
  
  // Write report to file
  const reportPath = path.join(LOGS_DIR, `comparison-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`\n📊 A/B Comparison Report Generated`);
  console.log(`📁 Report saved to: ${reportPath}`);
  console.log('\n' + report);
} else {
  console.error('Usage:');
  console.error('  node scripts/compare-tests.ts <log1> <log2>');
  console.error('  node scripts/compare-tests.ts --pattern "<pattern>"');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/compare-tests.ts logs/tests/search-20260410-143022.log logs/tests/search-20260410-144000.log');
  console.error('  node scripts/compare-tests.ts --pattern "search-*.log"');
  process.exit(1);
}
