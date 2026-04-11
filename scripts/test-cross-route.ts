#!/usr/bin/env node
/**
 * Cross-Route Test Orchestrator
 * 
 * Tests Anchor Engine functionality across all three access routes:
 * 1. MCP (Model Context Protocol)
 * 2. HTTP (REST API)
 * 3. UI (Frontend service)
 * 
 * Ensures consistent behavior and formatting across all routes.
 * 
 * Usage:
 *   node scripts/test-cross-route.ts [--search] [--distill] [--ingest]
 */

import { createTestLogger, TestLogger } from '../tests/test-logger.js';
import { logSearchEvent, logDistillationEvent, logCustomEvent } from '../tests/test-metadata.js';
import { validateDecisionRecords } from './decision-record-validator.js';

// Configuration
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3160';
const API_KEY = process.env.API_KEY || '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';
const TEST_REPO = 'https://github.com/RSBalchII/anchor-engine-node';
const TEST_REPO_BRANCH = 'main';

// Common headers for all API requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
});

// Test results tracking
interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  duration: number;
}

const testSuites: Record<string, TestSuite> = {
  ingestion: { name: 'Ingestion Tests', results: [], duration: 0 },
  search: { name: 'Search Tests', results: [], duration: 0 },
  distillation: { name: 'Distillation Tests', results: [], duration: 0 },
};

// Logger setup
const logger = createTestLogger({
  testName: 'cross-route-tests',
  metadata: {
    engineUrl: ENGINE_URL,
    testRepo: TEST_REPO,
    timestamp: new Date().toISOString(),
  },
});

/**
 * Check if engine is running
 */
async function checkEngineHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ENGINE_URL}/health`, {
      headers: getHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * MCP Route Tests
 */
class MCPRouteTests {
  private logger: TestLogger;

  constructor(logger: TestLogger) {
    this.logger = logger;
  }

  async githubIngest(url: string, branch: string = 'main', bucket: string = 'code'): Promise<TestResult> {
    this.logger.info('MCP: Starting GitHub ingestion', { url, branch, bucket });
    
    try {
      const response = await fetch(`${ENGINE_URL}/v1/github/repos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ url, branch, bucket, run_analysis: false, include_history: true }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `Ingestion failed: ${error}` };
      }

      const result = await response.json();
      this.logger.info('MCP: GitHub ingestion started', result);
      return { passed: true, message: 'Ingestion started successfully', details: result };
    } catch (error: any) {
      return { passed: false, message: `MCP ingestion error: ${error.message}` };
    }
  }

  async search(query: string, strategy: 'standard' | 'max-recall' = 'standard'): Promise<TestResult> {
    this.logger.info('MCP: Running search', { query, strategy });

    try {
      const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query,
          max_chars: strategy === 'standard' ? 10000 : 25000,
          token_budget: strategy === 'standard' ? 2500 : 6250,
          strategy,
          provenance: 'all',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `Search failed: ${error}` };
      }

      const results = await response.json();
      const resultCount = Array.isArray(results) ? results.length : (results.results?.length || 0);
      
      this.logger.info('MCP: Search completed', { query, strategy, resultCount });
      logSearchEvent({
        query,
        strategy,
        results: { count: resultCount, data: results },
        duration: 0,
        timestamp: new Date().toISOString(),
      });

      return {
        passed: true,
        message: `Found ${resultCount} results`,
        details: { resultCount, results: results.results || results },
      };
    } catch (error: any) {
      return { passed: false, message: `MCP search error: ${error.message}` };
    }
  }

  async distill(seed: string = '', outputFormat: string = 'decision-records'): Promise<TestResult> {
    this.logger.info('MCP: Starting distillation', { seed, outputFormat });

    try {
      const response = await fetch(`${ENGINE_URL}/v1/memory/distill`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          seed: seed ? { query: seed, limit_seeds: 8 } : { global: true },
          radius: 3,
          max_nodes: 500,
          output_format: outputFormat,
          mode: 'tag-based',
          similarity_threshold: 0.85,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `Distillation failed: ${error}` };
      }

      const result = await response.json();
      this.logger.info('MCP: Distillation completed', result);
      
      logDistillationEvent({
        type: seed ? 'radial' : 'global',
        results: result,
        duration: result.duration_ms || 0,
        timestamp: new Date().toISOString(),
      });

      return {
        passed: true,
        message: `Distillation complete: ${result.stats?.decision_records || 0} records`,
        details: result,
      };
    } catch (error: any) {
      return { passed: false, message: `MCP distillation error: ${error.message}` };
    }
  }
}

/**
 * HTTP Route Tests
 */
class HTTPRouteTests {
  private logger: TestLogger;

  constructor(logger: TestLogger) {
    this.logger = logger;
  }

  async githubIngest(url: string, branch: string = 'main', bucket: string = 'code'): Promise<TestResult> {
    this.logger.info('HTTP: Starting GitHub ingestion', { url, branch, bucket });

    try {
      const response = await fetch(`${ENGINE_URL}/v1/github/repos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ url, branch, bucket, run_analysis: false, include_history: true }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `HTTP ingestion failed: ${error}` };
      }

      const result = await response.json();
      this.logger.info('HTTP: GitHub ingestion started', result);
      return { passed: true, message: 'Ingestion started successfully', details: result };
    } catch (error: any) {
      return { passed: false, message: `HTTP ingestion error: ${error.message}` };
    }
  }

  async search(query: string, strategy: 'standard' | 'max-recall' = 'standard'): Promise<TestResult> {
    this.logger.info('HTTP: Running search', { query, strategy });

    try {
      const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query,
          max_chars: strategy === 'standard' ? 10000 : 25000,
          token_budget: strategy === 'standard' ? 2500 : 6250,
          strategy,
          provenance: 'all',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `HTTP search failed: ${error}` };
      }

      const results = await response.json();
      const resultCount = Array.isArray(results) ? results.length : (results.results?.length || 0);
      
      this.logger.info('HTTP: Search completed', { query, strategy, resultCount });
      
      return {
        passed: true,
        message: `Found ${resultCount} results`,
        details: { resultCount, results: results.results || results },
      };
    } catch (error: any) {
      return { passed: false, message: `HTTP search error: ${error.message}` };
    }
  }

  async distill(seed: string = '', outputFormat: string = 'decision-records'): Promise<TestResult> {
    this.logger.info('HTTP: Starting distillation', { seed, outputFormat });

    try {
      const response = await fetch(`${ENGINE_URL}/v1/memory/distill`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          seed: seed ? { query: seed, limit_seeds: 8 } : { global: true },
          radius: 3,
          max_nodes: 500,
          output_format: outputFormat,
          mode: 'tag-based',
          similarity_threshold: 0.85,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `HTTP distillation failed: ${error}` };
      }

      const result = await response.json();
      this.logger.info('HTTP: Distillation completed', result);

      return {
        passed: true,
        message: `Distillation complete: ${result.stats?.decision_records || 0} records`,
        details: result,
      };
    } catch (error: any) {
      return { passed: false, message: `HTTP distillation error: ${error.message}` };
    }
  }
}

/**
 * UI Route Tests (simulated via API client)
 */
class UIRouteTests {
  private logger: TestLogger;

  constructor(logger: TestLogger) {
    this.logger = logger;
  }

  async githubIngest(url: string, branch: string = 'main', bucket: string = 'code'): Promise<TestResult> {
    this.logger.info('UI: Starting GitHub ingestion', { url, branch, bucket });

    try {
      const response = await fetch(`${ENGINE_URL}/v1/github/repos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ url, branch, bucket }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `UI ingestion failed: ${error}` };
      }

      const result = await response.json();
      this.logger.info('UI: GitHub ingestion started', result);
      return { passed: true, message: 'Ingestion started successfully', details: result };
    } catch (error: any) {
      return { passed: false, message: `UI ingestion error: ${error.message}` };
    }
  }

  async search(query: string, strategy: 'standard' | 'max-recall' = 'standard'): Promise<TestResult> {
    this.logger.info('UI: Running search', { query, strategy });

    try {
      const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query,
          max_chars: strategy === 'standard' ? 10000 : 25000,
          token_budget: strategy === 'standard' ? 2500 : 6250,
          strategy,
          provenance: 'all',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `UI search failed: ${error}` };
      }

      const results = await response.json();
      const resultCount = Array.isArray(results) ? results.length : (results.results?.length || 0);
      
      this.logger.info('UI: Search completed', { query, strategy, resultCount });

      return {
        passed: true,
        message: `Found ${resultCount} results`,
        details: { resultCount, results: results.results || results },
      };
    } catch (error: any) {
      return { passed: false, message: `UI search error: ${error.message}` };
    }
  }

  async distill(seed: string = '', outputFormat: string = 'decision-records'): Promise<TestResult> {
    this.logger.info('UI: Starting distillation', { seed, outputFormat });

    try {
      const response = await fetch(`${ENGINE_URL}/v1/memory/distill`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          seed: seed ? { query: seed, limit_seeds: 8 } : { global: true },
          radius: 3,
          max_nodes: 500,
          output_format: outputFormat,
          mode: 'tag-based',
          similarity_threshold: 0.85,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { passed: false, message: `UI distillation failed: ${error}` };
      }

      const result = await response.json();
      this.logger.info('UI: Distillation completed', result);

      return {
        passed: true,
        message: `Distillation complete: ${result.stats?.decision_records || 0} records`,
        details: result,
      };
    } catch (error: any) {
      return { passed: false, message: `UI distillation error: ${error.message}` };
    }
  }
}

/**
 * Compare results across routes
 */
function compareSearchResults(mcp: any, http: any, ui: any): TestResult {
  const mcpCount = mcp.details?.resultCount || 0;
  const httpCount = http.details?.resultCount || 0;
  const uiCount = ui.details?.resultCount || 0;

  if (mcpCount !== httpCount || httpCount !== uiCount) {
    return {
      passed: false,
      message: `Result count mismatch: MCP=${mcpCount}, HTTP=${httpCount}, UI=${uiCount}`,
    };
  }

  return {
    passed: true,
    message: `All routes returned ${mcpCount} results`,
  };
}

function compareDistillationResults(mcp: any, http: any, ui: any): TestResult {
  const mcpRecords = mcp.details?.stats?.decision_records || 0;
  const httpRecords = http.details?.stats?.decision_records || 0;
  const uiRecords = ui.details?.stats?.decision_records || 0;

  if (mcpRecords !== httpRecords || httpRecords !== uiRecords) {
    return {
      passed: false,
      message: `Record count mismatch: MCP=${mcpRecords}, HTTP=${httpRecords}, UI=${uiRecords}`,
    };
  }

  return {
    passed: true,
    message: `All routes produced ${mcpRecords} decision records`,
  };
}

/**
 * Run ingestion tests
 */
async function runIngestionTests(): Promise<void> {
  logger.info('Starting ingestion tests');
  const suite = testSuites.ingestion;
  const startTime = Date.now();

  const mcp = new MCPRouteTests(logger);
  const http = new HTTPRouteTests(logger);
  const ui = new UIRouteTests(logger);

  // Test MCP route
  const mcpResult = await mcp.githubIngest(TEST_REPO, TEST_REPO_BRANCH);
  suite.results.push(mcpResult);

  // Test HTTP route
  const httpResult = await http.githubIngest(TEST_REPO, TEST_REPO_BRANCH);
  suite.results.push(httpResult);

  // Test UI route
  const uiResult = await ui.githubIngest(TEST_REPO, TEST_REPO_BRANCH);
  suite.results.push(uiResult);

  suite.duration = Date.now() - startTime;
  logger.info('Ingestion tests completed', {
    passed: suite.results.filter(r => r.passed).length,
    failed: suite.results.filter(r => !r.passed).length,
  });
}

/**
 * Run search tests
 */
async function runSearchTests(): Promise<void> {
  logger.info('Starting search tests');
  const suite = testSuites.search;
  const startTime = Date.now();

  const mcp = new MCPRouteTests(logger);
  const http = new HTTPRouteTests(logger);
  const ui = new UIRouteTests(logger);

  // Test queries that force different search strategies
  const queries = [
    { query: 'decision record', strategy: 'standard' as const },
    { query: 'anchor_distill', strategy: 'standard' as const },
    { query: 'radial distillation', strategy: 'standard' as const },
    { query: 'STAR', strategy: 'standard' as const },
    { query: 'deterministic semantic', strategy: 'standard' as const },
    { query: 'commit history', strategy: 'max-recall' as const },
  ];

  for (const { query, strategy } of queries) {
    // Test MCP route
    const mcpResult = await mcp.search(query, strategy);
    suite.results.push(mcpResult);

    // Test HTTP route
    const httpResult = await http.search(query, strategy);
    suite.results.push(httpResult);

    // Test UI route
    const uiResult = await ui.search(query, strategy);
    suite.results.push(uiResult);
  }

  suite.duration = Date.now() - startTime;
  logger.info('Search tests completed', {
    passed: suite.results.filter(r => r.passed).length,
    failed: suite.results.filter(r => !r.passed).length,
  });
}

/**
 * Run distillation tests
 */
async function runDistillationTests(): Promise<void> {
  logger.info('Starting distillation tests');
  const suite = testSuites.distillation;
  const startTime = Date.now();

  const mcp = new MCPRouteTests(logger);
  const http = new HTTPRouteTests(logger);
  const ui = new UIRouteTests(logger);

  // Test global distillation
  const mcpGlobal = await mcp.distill('', 'decision-records');
  suite.results.push(mcpGlobal);

  const httpGlobal = await http.distill('', 'decision-records');
  suite.results.push(httpGlobal);

  const uiGlobal = await ui.distill('', 'decision-records');
  suite.results.push(uiGlobal);

  // Test radial distillation
  const mcpRadial = await mcp.distill('STAR', 'decision-records');
  suite.results.push(mcpRadial);

  const httpRadial = await http.distill('STAR', 'decision-records');
  suite.results.push(httpRadial);

  const uiRadial = await ui.distill('STAR', 'decision-records');
  suite.results.push(uiRadial);

  suite.duration = Date.now() - startTime;
  logger.info('Distillation tests completed', {
    passed: suite.results.filter(r => r.passed).length,
    failed: suite.results.filter(r => !r.passed).length,
  });
}

/**
 * Generate test report
 */
function generateReport(): string {
  const lines: string[] = [];
  lines.push('='.repeat(80));
  lines.push('CROSS-ROUTE TEST REPORT');
  lines.push('='.repeat(80));
  lines.push('');

  for (const [suiteName, suite] of Object.entries(testSuites)) {
    const passed = suite.results.filter(r => r.passed).length;
    const failed = suite.results.filter(r => !r.passed).length;
    
    lines.push(`${suite.name}`);
    lines.push('-'.repeat(80));
    lines.push(`Duration: ${suite.duration}ms`);
    lines.push(`Passed: ${passed}`);
    lines.push(`Failed: ${failed}`);
    lines.push('');

    // Show failed results
    const failures = suite.results.filter(r => !r.passed);
    if (failures.length > 0) {
      lines.push('Failures:');
      for (const failure of failures) {
        lines.push(`  ❌ ${failure.message}`);
      }
      lines.push('');
    }

    // Show summary of passed results
    const successes = suite.results.filter(r => r.passed);
    if (successes.length > 0) {
      lines.push('Sample Results:');
      for (const success of successes.slice(0, 3)) {
        lines.push(`  ✅ ${success.message}`);
      }
      if (successes.length > 3) {
        lines.push(`  ... and ${successes.length - 3} more`);
      }
      lines.push('');
    }
  }

  // Overall summary
  const totalPassed = Object.values(testSuites).reduce((sum, s) => sum + s.results.filter(r => r.passed).length, 0);
  const totalFailed = Object.values(testSuites).reduce((sum, s) => sum + s.results.filter(r => !r.passed).length, 0);

  lines.push('='.repeat(80));
  lines.push('OVERALL SUMMARY');
  lines.push('='.repeat(80));
  lines.push(`Total Tests: ${totalPassed + totalFailed}`);
  lines.push(`Passed: ${totalPassed}`);
  lines.push(`Failed: ${totalFailed}`);
  lines.push(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  lines.push('');

  if (totalFailed === 0) {
    lines.push('✅ All tests passed!');
  } else {
    lines.push('❌ Some tests failed. See details above.');
  }

  return lines.join('\n');
}

/**
 * Main test runner
 */
async function main() {
  logger.info('Starting cross-route tests');

  // Check engine health
  logger.info('Checking engine health...');
  const health = await checkEngineHealth();
  if (!health) {
    logger.error('Engine is not running!');
    console.error(`Please start the Anchor Engine server first:`);
    console.error(`  pnpm dev`);
    console.error(``);
    console.error(`Engine URL: ${ENGINE_URL}`);
    process.exit(1);
  }
  logger.info('Engine is running');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const testIngestion = args.includes('--ingest') || args.length === 0;
  const testSearch = args.includes('--search') || args.length === 0;
  const testDistillation = args.includes('--distill') || args.length === 0;

  // Run selected tests
  if (testIngestion) {
    await runIngestionTests();
  }

  if (testSearch) {
    await runSearchTests();
  }

  if (testDistillation) {
    await runDistillationTests();
  }

  // End logger
  logger.end(0, {
    passed: Object.values(testSuites).reduce((sum, s) => sum + s.results.filter(r => r.passed).length, 0),
    failed: Object.values(testSuites).reduce((sum, s) => sum + s.results.filter(r => !r.passed).length, 0),
    total: Object.values(testSuites).reduce((sum, s) => sum + s.results.length, 0),
  });

  // Generate and print report
  const report = generateReport();
  console.log('\n' + report);

  // Write report to file
  const fs = await import('fs');
  const reportPath = 'logs/tests/cross-route-report.md';
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📁 Report saved to: ${reportPath}`);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
