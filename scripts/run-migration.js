#!/usr/bin/env node
/**
 * PGlite Migration Runner
 * 
 * Runs migration agents without requiring Jules CLI
 * 
 * Usage:
 *   node scripts/run-migration.js                    # Run all agents
 *   node scripts/run-migration.js --parallel 15      # Run 15 in parallel
 *   node scripts/run-migration.js --agent 1          # Run specific agent
 *   node scripts/run-migration.js --agent 1,2,3      # Run multiple agents
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// Agent definitions
const AGENTS = [
  { id: 1, name: 'Schema Auditor', command: 'node engine/dist/scripts/schema-audit.js', deliverable: 'cpp-schema-report.md' },
  { id: 2, name: 'Stats API Enhancer', command: 'node scripts/test-stats-api.js', deliverable: null },
  { id: 3, name: 'Molecule Storage Auditor', command: 'npm test -- molecule-audit.test.ts', deliverable: null },
  { id: 4, name: 'Compound Storage Auditor', command: 'npm test -- compound-audit.test.ts', deliverable: null },
  { id: 5, name: 'Tags Table Auditor', command: 'npm test -- tags-audit.test.ts', deliverable: null },
  { id: 6, name: 'Edges Table Auditor', command: 'npm test -- edges-audit.test.ts', deliverable: null },
  { id: 7, name: 'Atom Positions Auditor', command: 'npm test -- positions-audit.test.ts', deliverable: null },
  { id: 8, name: 'Dual-Write Integrity Tester', command: 'npm test -- ingest-atomic.test.ts --testNamePattern=parity', deliverable: 'parity-test-report.md' },
  { id: 9, name: 'Transaction Integrity Tester', command: 'npm test -- transaction.test.ts', deliverable: 'transaction-test-report.md' },
  { id: 10, name: 'Performance Benchmark', command: 'npm run benchmark:ingest', deliverable: 'benchmark-report.md' },
  { id: 11, name: 'Search FTS Migration', command: 'npm test -- search.test.ts', deliverable: null },
  { id: 12, name: 'Context Inflation Migration', command: 'npm test -- context-inflator.test.ts', deliverable: null },
  { id: 13, name: 'Molecule Search Migration', command: 'npm test -- molecule-search.test.ts', deliverable: null },
  { id: 14, name: 'PGlite Dependency Remover', command: 'node scripts/remove-pglite.js', deliverable: null },
  { id: 15, name: 'Integration Test Suite', command: 'npm test -- integration/full-pipeline.test.ts', deliverable: 'integration-test-report.md' }
];

// Parse arguments
const args = process.argv.slice(2);
const parallelMatch = args.find(a => a.startsWith('--parallel'));
const parallel = parallelMatch ? parseInt(parallelMatch.split('=')[1] || '1') : 1;
const agentMatch = args.find(a => a.startsWith('--agent'));
const specificAgents = agentMatch ? agentMatch.split('=')[1].split(',').map(Number) : null;
const watchMode = args.includes('--watch');

// Track progress
const completed = new Set();
const failed = new Set();
const running = new Set();

// Run a single agent
function runAgent(agentId) {
  return new Promise((resolve) => {
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) {
      console.log(`❌ Agent ${agentId} not found`);
      resolve(false);
      return;
    }

    console.log(`\n🚀 Starting Agent ${agent.id}: ${agent.name}`);
    console.log(`   Command: ${agent.command}`);
    
    const [cmd, ...cmdArgs] = agent.command.split(' ');
    const proc = spawn(cmd, cmdArgs, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Agent ${agent.id}: ${agent.name} completed successfully`);
        completed.add(agentId);
        resolve(true);
      } else {
        console.log(`❌ Agent ${agent.id}: ${agent.name} failed with code ${code}`);
        failed.add(agentId);
        resolve(false);
      }
    });

    proc.on('error', (err) => {
      console.log(`❌ Agent ${agent.id}: ${agent.name} error: ${err.message}`);
      failed.add(agentId);
      resolve(false);
    });
  });
}

// Check if deliverable exists
function checkDeliverable(agent) {
  if (!agent.deliverable) return true;
  const deliverablePath = path.join(PROJECT_ROOT, agent.deliverable);
  return fs.existsSync(deliverablePath);
}

// Print status
function printStatus() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Migration Progress');
  console.log('═══════════════════════════════════════════════════════════════');
  
  for (const agent of AGENTS) {
    if (completed.has(agent.id)) {
      console.log(`✅ Agent ${agent.id}: ${agent.name}`);
    } else if (failed.has(agent.id)) {
      console.log(`❌ Agent ${agent.id}: ${agent.name} (FAILED)`);
    } else {
      console.log(`⏳ Agent ${agent.id}: ${agent.name}`);
    }
  }
  
  console.log('');
  console.log(`Completed: ${completed.size}/${AGENTS.length}`);
  console.log(`Failed: ${failed.size}/${AGENTS.length}`);
  console.log('');
}

// Run agents in parallel batches
async function runAgentsInBatches(agentIds, batchSize) {
  const queue = [...agentIds];
  
  while (queue.length > 0) {
    const batch = queue.splice(0, batchSize);
    const promises = batch.map(id => runAgent(id));
    await Promise.all(promises);
    
    // Print progress after each batch
    printStatus();
    
    if (failed.size > 0) {
      console.log('⚠️  Some agents failed. Continuing with remaining agents...');
    }
  }
}

// Main
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     PGlite → SQLite3 Migration Runner                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Determine which agents to run
  const agentIds = specificAgents || AGENTS.map(a => a.id);
  
  console.log(`📋 Running ${agentIds.length} agents (parallel: ${parallel})`);
  console.log('');
  
  // Record start time
  fs.writeFileSync(path.join(PROJECT_ROOT, 'migration-start.txt'), new Date().toISOString());
  
  // Run agents
  await runAgentsInBatches(agentIds, parallel);
  
  // Final status
  printStatus();
  
  // Summary
  const success = failed.size === 0;
  if (success) {
    console.log('🎉 All agents completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review: cpp-schema-report.md (if Agent 1 ran)');
    console.log('2. Review: benchmark-report.md (if Agent 10 ran)');
    console.log('3. Run: npm test -- integration/full-pipeline.test.ts');
  } else {
    console.log('⚠️  Some agents failed:');
    for (const agentId of failed) {
      const agent = AGENTS.find(a => a.id === agentId);
      console.log(`   - Agent ${agentId}: ${agent.name}`);
    }
    console.log('');
    console.log('You can retry failed agents with:');
    console.log(`   node scripts/run-migration.js --agent ${Array.from(failed).join(',')}`);
  }
  
  process.exit(success ? 0 : 1);
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
