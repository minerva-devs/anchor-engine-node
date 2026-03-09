#!/usr/bin/env node
/**
 * Graph Distillation CLI
 * 
 * Usage:
 *   node --loader ts-node/esm src/commands/distill.ts [options] [seed_query]
 * 
 * Options:
 *   --seed-ids, -s    Comma-separated atom IDs to start from
 *   --max-nodes, -n   Maximum nodes to process (default: 1000)
 *   --batch-size, -b  Batch size for compression (default: 50)
 *   --use-llm, -l     Use local LLM for compression (requires remote/local provider)
 *   --output, -o      Output file path (default: ./reports/distill-report-<timestamp>.md)
 *   --json            Output as JSON instead of Markdown
 */

import { db } from '../core/db.js';
import { distillMemory, DistillRequest } from '../services/search/distill.js';
import { config } from '../config/index.js';
import path from 'path';
import fs from 'fs';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Graph Distillation CLI

Usage:
  node --loader ts-node/esm src/commands/distill.ts [options] [seed_query]

Options:
  --seed-ids, -s    Comma-separated atom IDs to start from
  --max-nodes, -n   Maximum nodes to process (default: 1000)
  --batch-size, -b  Batch size for compression (default: 50)
  --use-llm, -l     Use local LLM for compression
  --output, -o      Output file path
  --json            Output as JSON
    `);
    process.exit(0);
  }

  // Parse arguments
  const seedIdsIndex = args.indexOf('--seed-ids') !== -1 ? args.indexOf('--seed-ids') : args.indexOf('-s');
  const seedIds = seedIdsIndex >= 0 ? args[seedIdsIndex + 1].split(',') : undefined;
  
  const maxNodesIndex = args.indexOf('--max-nodes') !== -1 ? args.indexOf('--max-nodes') : args.indexOf('-n');
  const maxNodes = maxNodesIndex >= 0 ? parseInt(args[maxNodesIndex + 1]) : 1000;
  
  const batchSizeIndex = args.indexOf('--batch-size') !== -1 ? args.indexOf('--batch-size') : args.indexOf('-b');
  const batchSize = batchSizeIndex >= 0 ? parseInt(args[batchSizeIndex + 1]) : 50;
  
  const useLlm = args.includes('--use-llm') || args.includes('-l');
  const asJson = args.includes('--json');
  const asYaml = args.includes('--yaml') || args.includes('-y');
  const exportToInbox = args.includes('--export') || args.includes('-e');
  
  const outputIndex = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = asYaml ? 'yaml' : (asJson ? 'json' : 'md');
  const defaultOutput = `./reports/distill-report-${timestamp}.${ext}`;
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : defaultOutput;

  // Remaining arg is the seed query
  const seedQuery = args.filter(a => !a.startsWith('-') && args.indexOf(a) !== seedIdsIndex + 1 && args.indexOf(a) !== maxNodesIndex + 1 && args.indexOf(a) !== batchSizeIndex + 1 && args.indexOf(a) !== outputIndex + 1)[0];

  console.log('='.repeat(60));
  console.log('  Anchor Engine - Graph Distiller');
  console.log('='.repeat(60));
  console.log();

  try {
    // IMPORTANT: Do not wipe database on command run
    config.DATABASE.WIPE_ON_STARTUP = false;
    
    console.log('Initializing database...');
    await db.init();
    
    const request: DistillRequest = {
      seed: {
        query: seedQuery,
        atom_ids: seedIds
      },
      max_nodes: maxNodes,
      batch_size: batchSize,
      use_llm: useLlm,
      export_to_inbox: exportToInbox
    };

    console.log('Distilling graph...');
    console.log(`  Target: ${seedQuery || (seedIds ? seedIds.join(',') : 'Global Roots')}`);
    console.log(`  Max Nodes: ${maxNodes}`);
    console.log(`  Mode: ${useLlm ? 'LLM Semantic Compression' : 'Heuristic Compression'}`);
    if (exportToInbox) console.log(`  Export: Enabled (→ inbox/distilled/)`);
    console.log();

    const result = await distillMemory(request);

    const fullPath = path.resolve(process.cwd(), outputPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    if (asYaml) {
      import('js-yaml').then(yaml => {
        fs.writeFileSync(fullPath, yaml.dump(result));
        console.log(`✓ YAML report saved to: ${fullPath}`);
      });
    } else if (asJson) {
      fs.writeFileSync(fullPath, JSON.stringify(result, null, 2));
      console.log(`✓ JSON report saved to: ${fullPath}`);
    } else {
      const markdown = generateMarkdown(result, request);
      fs.writeFileSync(fullPath, markdown);
      console.log(`✓ Markdown report saved to: ${fullPath}`);
    }

    console.log();
    console.log('Summary:');
    console.log(`  Original Nodes:  ${result.stats.original_node_count}`);
    console.log(`  Distilled Nodes: ${result.stats.distilled_node_count}`);
    console.log(`  Compression:     ${result.stats.compression_ratio}`);
    console.log(`  Duration:        ${(result.stats.duration_ms / 1000).toFixed(2)}s`);
    console.log();

    await db.close();
  } catch (error: any) {
    console.error('Error during distillation:', error.message);
    process.exit(1);
  }
}

function generateMarkdown(result: any, req: any): string {
  let md = `# Graph Distillation Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Seed:** ${req.seed.query || (req.seed.atom_ids ? req.seed.atom_ids.join(',') : 'Global Roots')}\n`;
  md += `**Mode:** ${req.use_llm ? 'LLM' : 'Heuristic'}\n\n`;

  md += `## Statistics\n\n`;
  md += `- **Original Nodes:** ${result.stats.original_node_count}\n`;
  md += `- **Distilled Nodes:** ${result.stats.distilled_node_count}\n`;
  md += `- **Original Edges:** ${result.stats.original_edge_count}\n`;
  md += `- **Distilled Edges:** ${result.stats.distilled_edge_count}\n`;
  md += `- **Compression Ratio:** ${result.stats.compression_ratio}\n`;
  md += `- **Duration:** ${(result.stats.duration_ms / 1000).toFixed(2)}s\n\n`;

  md += `## Distilled Nodes\n\n`;
  for (const node of result.nodes) {
    md += `### ${node.id}\n\n`;
    md += `**Content:** ${node.compressedContent}\n\n`;
    md += `**Original IDs:** ${node.originalIds.join(', ')}\n\n`;
    if (node.tags.length > 0) {
      md += `**Tags:** ${node.tags.join(', ')}\n\n`;
    }
    if (node.sources.length > 0) {
      md += `**Sources:** ${node.sources.join(', ')}\n\n`;
    }
    md += `---\n\n`;
  }

  md += `## Distilled Edges\n\n`;
  md += `| Source | Relation | Target |\n`;
  md += `|--------|----------|--------|\n`;
  for (const edge of result.edges) {
    md += `| ${edge.source} | ${edge.relation} | ${edge.target} |\n`;
  }

  return md;
}

main();
