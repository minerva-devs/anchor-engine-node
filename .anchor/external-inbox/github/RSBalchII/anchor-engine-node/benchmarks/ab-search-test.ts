#!/usr/bin/env node
/**
 * A/B Test Runner - Search Results Comparison
 * 
 * Runs search queries and saves results to a test file for analysis.
 * Compares different search strategies and configurations.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3160';
const API_KEY = 'anchor-engine-default-key';

interface SearchResult {
  id: string;
  content: string;
  source: string;
  score?: number;
  tags?: string[];
  buckets?: string[];
}

interface TestQuery {
  name: string;
  query: string;
  params?: any;
}

interface TestResult {
  queryName: string;
  query: string;
  strategy: string;
  totalResults: number;
  durationMs: number;
  results: SearchResult[];
  splitQueries?: string[];
  error?: string;
}

// Test queries for A/B comparison
const TEST_QUERIES: TestQuery[] = [
  {
    name: 'Simple keyword',
    query: 'test',
  },
  {
    name: 'Multi-word search',
    query: 'performance benchmark',
  },
  {
    name: 'Semantic search',
    query: 'how does the system work',
  },
  {
    name: 'Technical documentation',
    query: 'API endpoint configuration',
  },
  {
    name: 'Error handling',
    query: 'error handling troubleshooting',
  },
];

async function runSearch(query: string, params: any = {}): Promise<any> {
  const response = await axios.post(
    `${BASE_URL}/v1/memory/search`,
    {
      query,
      ...params,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      // Disable streaming for test results
      params: { stream: 'false' },
    }
  );
  return response.data;
}

async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('🧪 Starting A/B Search Tests\n');
  console.log('=' .repeat(60));

  for (const testQuery of TEST_QUERIES) {
    console.log(`\n📝 Running: ${testQuery.name}`);
    console.log(`   Query: "${testQuery.query}"`);

    try {
      const startTime = Date.now();
      const response = await runSearch(testQuery.query, testQuery.params);
      const duration = Date.now() - startTime;

      const result: TestResult = {
        queryName: testQuery.name,
        query: testQuery.query,
        strategy: response.metadata?.strategy || 'unknown',
        totalResults: response.metadata?.totalResults || 0,
        durationMs: duration,
        results: response.results || [],
        splitQueries: response.metadata?.splitQueries,
      };

      results.push(result);

      console.log(`   ✅ Strategy: ${result.strategy}`);
      console.log(`   ✅ Results: ${result.totalResults}`);
      console.log(`   ✅ Duration: ${result.durationMs}ms`);

      if (result.splitQueries && result.splitQueries.length > 0) {
        console.log(`   ✅ Split queries: ${result.splitQueries.join(', ')}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      
      results.push({
        queryName: testQuery.name,
        query: testQuery.query,
        strategy: 'error',
        totalResults: 0,
        durationMs: 0,
        results: [],
        error: error.message,
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed\n');

  return results;
}

function formatResults(results: TestResult[]): string {
  const timestamp = new Date().toISOString();
  
  let output = `# A/B Search Test Results\n\n`;
  output += `**Generated:** ${timestamp}\n`;
  output += `**Base URL:** ${BASE_URL}\n\n`;
  
  output += `## Summary\n\n`;
  output += `| Query | Strategy | Results | Duration |\n`;
  output += `|-------|----------|---------|----------|\n`;
  
  for (const result of results) {
    output += `| ${result.queryName} | ${result.strategy} | ${result.totalResults} | ${result.durationMs}ms |\n`;
  }
  
  output += `\n## Detailed Results\n\n`;
  
  for (const result of results) {
    output += `### ${result.queryName}\n\n`;
    output += `**Query:** \`${result.query}\`\n\n`;
    output += `**Strategy:** ${result.strategy}\n\n`;
    output += `**Total Results:** ${result.totalResults}\n\n`;
    output += `**Duration:** ${result.durationMs}ms\n\n`;
    
    if (result.splitQueries && result.splitQueries.length > 0) {
      output += `**Split Queries:** ${result.splitQueries.join(', ')}\n\n`;
    }
    
    if (result.error) {
      output += `**Error:** ${result.error}\n\n`;
    } else if (result.results.length > 0) {
      output += `**Top Results:**\n\n`;
      
      // Show top 5 results
      const topResults = result.results.slice(0, 5);
      for (let i = 0; i < topResults.length; i++) {
        const r = topResults[i];
        output += `${i + 1}. **${r.source}** (score: ${r.score?.toFixed(3) || 'N/A'})\n`;
        output += `   \`${r.content.substring(0, 150)}${r.content.length > 150 ? '...' : ''}\`\n\n`;
      }
      
      if (result.results.length > 5) {
        output += `... and ${result.results.length - 5} more results\n\n`;
      }
    } else {
      output += `*No results found*\n\n`;
    }
    
    output += `---\n\n`;
  }
  
  output += `## Configuration\n\n`;
  output += `\`\`\`json\n${JSON.stringify({
    baseUrl: BASE_URL,
    apiKey: API_KEY,
    testQueries: TEST_QUERIES.length,
  }, null, 2)}\n\`\`\`\n`;
  
  return output;
}

async function main() {
  try {
    // Check if engine is running
    console.log('🔍 Checking engine health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Engine status: ${healthResponse.data.status}\n`);

    // Run tests
    const results = await runAllTests();

    // Save results to file
    const outputDir = path.join(process.cwd(), 'tests', 'ab-test-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `ab-search-test-${timestamp}.md`);
    
    const formattedResults = formatResults(results);
    fs.writeFileSync(outputPath, formattedResults, 'utf-8');
    
    console.log(`📄 Results saved to: ${outputPath}\n`);
    
    // Also save JSON version for programmatic analysis
    const jsonPath = path.join(outputDir, `ab-search-test-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log(`📊 JSON data saved to: ${jsonPath}\n`);
    
    // Print summary
    const totalQueries = results.length;
    const successfulQueries = results.filter(r => !r.error).length;
    const totalResults = results.reduce((sum, r) => sum + r.totalResults, 0);
    const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / totalQueries;
    
    console.log('📈 Summary:');
    console.log(`   Total queries: ${totalQueries}`);
    console.log(`   Successful: ${successfulQueries}/${totalQueries}`);
    console.log(`   Total results: ${totalResults}`);
    console.log(`   Average duration: ${avgDuration.toFixed(0)}ms\n`);
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Is the Anchor Engine running?');
      console.error(`   Run: pnpm start\n`);
    }
    process.exit(1);
  }
}

main();
