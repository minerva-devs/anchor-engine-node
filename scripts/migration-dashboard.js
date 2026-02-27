#!/usr/bin/env node
/**
 * Migration Progress Dashboard
 * 
 * Usage: node scripts/migration-dashboard.js
 * 
 * Shows real-time progress of all 15 agents
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Agent definitions
const AGENTS = [
  { id: 1, name: 'Schema Auditor', status: 'pending', file: 'cpp-schema-report.md' },
  { id: 2, name: 'Stats API Enhancer', status: 'pending', file: null },
  { id: 3, name: 'Molecule Storage Auditor', status: 'pending', file: null },
  { id: 4, name: 'Compound Storage Auditor', status: 'pending', file: null },
  { id: 5, name: 'Tags Table Auditor', status: 'pending', file: null },
  { id: 6, name: 'Edges Table Auditor', status: 'pending', file: null },
  { id: 7, name: 'Atom Positions Auditor', status: 'pending', file: null },
  { id: 8, name: 'Dual-Write Integrity Tester', status: 'pending', file: 'parity-test-report.md' },
  { id: 9, name: 'Transaction Integrity Tester', status: 'pending', file: 'transaction-test-report.md' },
  { id: 10, name: 'Performance Benchmark', status: 'pending', file: 'benchmark-report.md' },
  { id: 11, name: 'Search FTS Migration', status: 'pending', file: null },
  { id: 12, name: 'Context Inflation Migration', status: 'pending', file: null },
  { id: 13, name: 'Molecule Search Migration', status: 'pending', file: null },
  { id: 14, name: 'PGlite Dependency Remover', status: 'pending', file: null },
  { id: 15, name: 'Integration Test Suite', status: 'pending', file: 'integration-test-report.md' }
];

// Phase groupings
const PHASES = [
  { name: 'Phase 1: Schema Audit', agents: [1, 2, 3, 4, 5, 6, 7] },
  { name: 'Phase 2: Validation', agents: [8, 9, 10] },
  { name: 'Phase 3: Search Migration', agents: [11, 12, 13] },
  { name: 'Phase 4: PGlite Removal', agents: [14, 15] }
];

// Check agent status by looking for deliverables
function checkAgentStatus(agent) {
  const projectRoot = path.join(__dirname, '..');
  
  if (agent.file) {
    const filePath = path.join(projectRoot, agent.file);
    if (fs.existsSync(filePath)) {
      return '✅ completed';
    }
  }
  
  // Check for test files
  const testFileMap = {
    1: 'schema-audit.ts',
    2: null,
    3: 'molecule-audit.test.ts',
    4: 'compound-audit.test.ts',
    5: 'tags-audit.test.ts',
    6: 'edges-audit.test.ts',
    7: 'positions-audit.test.ts',
    8: 'ingest-atomic.test.ts',
    9: 'transaction.test.ts',
    10: 'ingest-benchmark.ts',
    11: 'search.test.ts',
    12: 'context-inflator.test.ts',
    13: 'molecule-search.test.ts',
    14: null,
    15: 'full-pipeline.test.ts'
  };
  
  if (testFileMap[agent.id]) {
    const testPath = path.join(projectRoot, 'engine', 'src', testFileMap[agent.id]);
    const testPath2 = path.join(projectRoot, 'engine', 'tests', testFileMap[agent.id]);
    if (fs.existsSync(testPath) || fs.existsSync(testPath2)) {
      return '🔄 in progress';
    }
  }
  
  return '⏳ pending';
}

// Check for PGlite removal
function checkPGliteRemoved() {
  const projectRoot = path.join(__dirname, '..');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) return false;
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  return !deps['@electric-sql/pglite'];
}

// Check for db imports
function checkDbImports() {
  const projectRoot = path.join(__dirname, '..');
  const engineSrc = path.join(projectRoot, 'engine', 'src');
  
  if (!fs.existsSync(engineSrc)) return { found: false, files: [] };
  
  const files = [];
  const searchDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        searchDir(path.join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
        if (content.includes("from '../../core/db.js'") || content.includes("from '../../core/db'")) {
          if (!content.includes('@deprecated')) {
            files.push(path.join(dir, entry.name));
          }
        }
      }
    }
  };
  
  searchDir(engineSrc);
  return { found: files.length > 0, files };
}

// Print dashboard
function printDashboard() {
  console.clear();
  
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           PGlite → SQLite3 Migration Dashboard                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const projectRoot = path.join(__dirname, '..');
  const startTime = fs.existsSync(path.join(projectRoot, 'migration-start.txt')) 
    ? new Date(fs.readFileSync(path.join(projectRoot, 'migration-start.txt'), 'utf8'))
    : new Date();
  
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000);
  console.log(`⏱️  Elapsed: ${elapsed} minutes`);
  console.log('');
  
  // Check for schema report
  const schemaReport = path.join(projectRoot, 'cpp-schema-report.md');
  if (fs.existsSync(schemaReport)) {
    console.log('📄 Schema Report: Available');
  } else {
    console.log('📄 Schema Report: Pending Agent 1');
  }
  
  // Check PGlite status
  const pgliteRemoved = checkPGliteRemoved();
  console.log(`🗑️  PGlite Removed: ${pgliteRemoved ? '✅ Yes' : '❌ No'}`);
  
  // Check db imports
  const dbImports = checkDbImports();
  console.log(`📦 DB Imports: ${dbImports.found ? `⚠️  Found in ${dbImports.files.length} files` : '✅ None'}`);
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');
  
  // Print phases
  for (const phase of PHASES) {
    console.log(`📌 ${phase.name}`);
    console.log('─'.repeat(70));
    
    let phaseComplete = 0;
    for (const agentId of phase.agents) {
      const agent = AGENTS.find(a => a.id === agentId);
      const status = checkAgentStatus(agent);
      
      if (status.includes('✅')) phaseComplete++;
      
      const statusPad = status.padEnd(15);
      const namePad = agent.name.padEnd(35);
      console.log(`   ${agentId}. ${namePad} ${statusPad}`);
    }
    
    const percent = Math.round((phaseComplete / phase.agents.length) * 100);
    console.log(`   Progress: ${phaseComplete}/${phase.agents.length} (${percent}%)`);
    console.log('');
  }
  
  // Overall progress
  const completed = AGENTS.filter(a => checkAgentStatus(a).includes('✅')).length;
  const total = AGENTS.length;
  const overallPercent = Math.round((completed / total) * 100);
  
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`📊 Overall Progress: ${completed}/${total} agents (${overallPercent}%)`);
  console.log('');
  
  // Success criteria
  console.log('✅ Success Criteria:');
  console.log(`   ${checkPGliteRemoved() ? '✅' : '❌'} PGlite removed from package.json`);
  console.log(`   ${!dbImports.found ? '✅' : '❌'} No DB imports in codebase`);
  console.log(`   ${fs.existsSync(schemaReport) ? '✅' : '❌'} Schema report generated`);
  console.log(`   ${completed === total ? '✅' : '❌'} All agents complete`);
  console.log('');
  
  if (completed === total && checkPGliteRemoved() && !dbImports.found) {
    console.log('🎉 MIGRATION COMPLETE! 🎉');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm test -- integration/full-pipeline.test.ts');
    console.log('2. Review: migration-reports/final-report.md');
    console.log('3. Deploy: pnpm build && pnpm start');
  }
  
  console.log('');
  console.log('Refresh: Press Ctrl+C and run again, or wait for auto-refresh (30s)');
  console.log('');
}

// Main
printDashboard();

// Auto-refresh every 30 seconds
if (process.argv.includes('--watch')) {
  setInterval(printDashboard, 30000);
}
