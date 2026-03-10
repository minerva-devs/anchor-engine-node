/**
 * Live Search Test Script
 * 
 * Tests search functionality against a running Anchor Engine instance.
 * Logs results to console and generates an MD report.
 * 
 * Usage: node test-search-live.js [engine_url]
 * Default: http://localhost:3160
 * 
 * Standard 132: Adaptive Concurrency Testing
 */

import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENGINE_URL = process.argv[2] || 'http://localhost:3160';
const REPORT_FILE = path.join(__dirname, 'search-test-report.md');

// Test queries of varying complexity
const TEST_QUERIES = [
  // Simple queries
  { name: "Single Word", query: "test", expected_behavior: "Basic single term search" },
  { name: "Two Words", query: "rob coda", expected_behavior: "Multi-term search" },
  { name: "Simple Phrase", query: "music education", expected_behavior: "Phrase search" },
  
  // Medium complexity
  { name: "Three Terms", query: "graph nodes consciousness", expected_behavior: "Multiple concept search" },
  { name: "Technical Query", query: "async file processing", expected_behavior: "Technical term search" },
  { name: "Long Phrase", query: "College Music education", expected_behavior: "Longer phrase search" },
  
  // Complex queries (these stress the system)
  { name: "Complex Technical", query: "context inflation radial expansion", expected_behavior: "Complex multi-word" },
  { name: "Many Terms", query: "search memory database query optimization performance", expected_behavior: "Many terms - stress test" },
  { name: "Max Recall Style", query: "Rob and coda music education graph nodes", expected_behavior: "Max recall simulation" }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getMemoryInfo() {
  const total = Math.floor(os.totalmem() / 1024 / 1024);
  const free = Math.floor(os.freemem() / 1024 / 1024);
  const used = total - free;
  return { total, free, used, percent: Math.round((used / total) * 100) };
}

async function makeRequest(endpoint, data = null) {
  const url = new URL(endpoint, ENGINE_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || 3160,
    path: url.pathname,
    method: data ? 'POST' : 'GET',
    headers: data ? { 'Content-Type': 'application/json' } : {}
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve({ raw: responseData, error: e.message });
        }
      });
    });

    req.on('error', (err) => reject(err));
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSearch(query, maxChars = 5000) {
  const startTime = Date.now();
  const startMemory = getMemoryInfo();
  
  try {
    const result = await makeRequest('/v1/memory/search', {
      query,
      max_chars: maxChars,
      token_budget: 1250,
      provenance: 'all',
      strategy: 'standard'
    });
    
    const endTime = Date.now();
    const endMemory = getMemoryInfo();
    const duration = endTime - startTime;
    
    return {
      success: !result.error,
      query,
      duration,
      resultCount: result.results?.length || 0,
      startMemory,
      endMemory,
      memoryDelta: endMemory.used - startMemory.used,
      error: result.error || null,
      response: result
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      success: false,
      query,
      duration: endTime - startTime,
      resultCount: 0,
      startMemory,
      endMemory: getMemoryInfo(),
      memoryDelta: 0,
      error: error.message,
      response: null
    };
  }
}

async function checkEngineHealth() {
  log('\n🔍 Checking engine health...', 'cyan');
  try {
    const health = await makeRequest('/health');
    log(`✅ Engine is running: ${JSON.stringify(health)}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Engine not responding: ${error.message}`, 'red');
    log(`\nMake sure the engine is running on ${ENGINE_URL}`, 'yellow');
    return false;
  }
}

async function getSystemStatus() {
  try {
    const status = await makeRequest('/v1/system/status');
    return status;
  } catch (error) {
    return { error: error.message };
  }
}

function generateReport(results, systemStatus) {
  const timestamp = new Date().toISOString();
  const memory = getMemoryInfo();
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  const minDuration = Math.min(...results.map(r => r.duration));
  
  const report = `# Anchor Engine Search Test Report

**Generated:** ${timestamp}
**Engine URL:** ${ENGINE_URL}
**Test Count:** ${results.length}

## System Information

| Metric | Value |
|--------|-------|
| Total Memory | ${memory.total} MB |
| Free Memory | ${memory.free} MB |
| Used Memory | ${memory.used} MB (${memory.percent}%) |
| Platform | ${os.platform()} ${os.arch()} |
| Node Version | ${process.version} |
| CPUs | ${os.cpus().length} |

## Engine Status

\`\`\`json
${JSON.stringify(systemStatus, null, 2)}
\`\`\`

## Summary

| Metric | Value |
|--------|-------|
| **Passed** | ${passed} |
| **Failed** | ${failed} |
| **Success Rate** | ${((passed / results.length) * 100).toFixed(1)}% |
| **Avg Duration** | ${avgDuration.toFixed(0)}ms |
| **Min Duration** | ${minDuration}ms |
| **Max Duration** | ${maxDuration}ms |

## Detailed Results

| Test | Query | Duration | Results | Memory Δ | Status |
|------|-------|----------|---------|----------|--------|
${results.map(r => {
  const status = r.success ? '✅ PASS' : '❌ FAIL';
  const memDelta = r.memoryDelta > 0 ? `+${r.memoryDelta}MB` : `${r.memoryDelta}MB`;
  return `| ${r.name} | \`${r.query}\` | ${r.duration}ms | ${r.resultCount} | ${memDelta} | ${status} |`;
}).join('\n')}

## Failed Tests

${results.filter(r => !r.success).map(r => `
### ${r.name}
- **Query:** \`${r.query}\`
- **Error:** ${r.error}
- **Duration:** ${r.duration}ms
`).join('\n') || 'None'}

## Performance Analysis

### Duration Distribution
- **Fast (< 100ms):** ${results.filter(r => r.duration < 100).length} tests
- **Normal (100-500ms):** ${results.filter(r => r.duration >= 100 && r.duration < 500).length} tests
- **Slow (500-1000ms):** ${results.filter(r => r.duration >= 500 && r.duration < 1000).length} tests
- **Very Slow (> 1000ms):** ${results.filter(r => r.duration >= 1000).length} tests

### Memory Impact
- **Tests with memory increase:** ${results.filter(r => r.memoryDelta > 0).length}
- **Tests with memory decrease:** ${results.filter(r => r.memoryDelta < 0).length}
- **Average memory delta:** ${(results.reduce((sum, r) => sum + r.memoryDelta, 0) / results.length).toFixed(1)} MB

## Conclusion

${failed === 0 
  ? '✅ All tests passed! The search functionality is working correctly.' 
  : `⚠️ ${failed} test(s) failed. Review the errors above.`}

---
*Report generated by test-search-live.js (Standard 132)*
`;

  fs.writeFileSync(REPORT_FILE, report);
  return report;
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Anchor Engine Live Search Test                         ║', 'cyan');
  log('║     Standard 132: Adaptive Concurrency Testing             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  log(`\nEngine URL: ${ENGINE_URL}\n`);

  // Check engine health
  const healthy = await checkEngineHealth();
  if (!healthy) {
    process.exit(1);
  }

  // Get system status
  const systemStatus = await getSystemStatus();
  
  // Run tests
  log('\n🧪 Running search tests...\n', 'cyan');
  const results = [];
  
  for (const test of TEST_QUERIES) {
    log(`Testing: ${test.name}...`, 'blue');
    log(`  Query: "${test.query}"`);
    
    const result = await testSearch(test.query);
    result.name = test.name;
    result.expected = test.expected_behavior;
    
    results.push(result);
    
    if (result.success) {
      log(`  ✅ ${result.duration}ms - ${result.resultCount} results`, 'green');
    } else {
      log(`  ❌ FAILED: ${result.error}`, 'red');
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Generate report
  log('\n📊 Generating report...', 'cyan');
  const report = generateReport(results, systemStatus);
  
  log(`\n✅ Report saved to: ${REPORT_FILE}`, 'green');
  
  // Print summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Test Summary                                           ║', 'cyan');
  log('╠════════════════════════════════════════════════════════════╣', 'cyan');
  log(`║  Total:  ${results.length.toString().padEnd(3)} | Passed: ${passed.toString().padEnd(3)} | Failed: ${failed.toString().padEnd(3)}          ║`, passed === results.length ? 'green' : 'yellow');
  log(`║  Success Rate: ${((passed / results.length) * 100).toFixed(1)}%                              ║`, 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  if (failed > 0) {
    log('\n⚠️  Some tests failed. Check the report for details.', 'yellow');
    process.exit(1);
  } else {
    log('\n✅ All tests passed!', 'green');
    process.exit(0);
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
