#!/usr/bin/env node
/**
 * Graph Distillation CLI
 *
 * Usage:
 *   node --loader ts-node/esm src/commands/distill.ts [options] [seed_query]
 *
 * Options:
 *   --radial          Use radial distillation (Standard 133)
 *   --seed-ids, -s    Comma-separated atom IDs to start from
 *   --max-nodes, -n   Maximum nodes to process (default: 1000)
 *   --batch-size, -b  Batch size for compression (default: 50)
 *   --radius, -r      Inflation radius for radial mode (default: 2000)
 *   --output, -o      Output file path (default: ./reports/distill-report-<timestamp>.md)
 *   --yaml            Output as YAML instead of Markdown
 *   --json            Output as JSON
 *   --export, -e      Export to inbox/distilled/ folder
 *   --strict          Strict normalization (default for radial)
 *   --lenient         Lenient normalization
 */

import { db } from '../core/db.js';
import { distillMemory, DistillRequest } from '../services/search/distill.js';
import { radialDistill, RadialDistillRequest } from '../services/distillation/radial-distiller.js';
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

Modes:
  --radial          Use radial distillation (Standard 133) - line-level deduplication
  (default)         Use legacy atom-level distillation

Options:
  --seed-ids, -s    Comma-separated atom IDs to start from
  --max-nodes, -n   Maximum nodes to process (default: 1000)
  --batch-size, -b  Batch size for compression (default: 50)
  --radius, -r      Inflation radius for radial mode (default: 2000)
  --strict          Strict normalization (default for radial)
  --lenient         Lenient normalization
  --output, -o      Output file path
  --yaml            Output as YAML
  --json            Output as JSON
  --export, -e      Export to inbox/distilled/ folder

Radial Mode Examples:
  node src/commands/distill.ts --radial
  node src/commands/distill.ts --radial --radius 5000
  node src/commands/distill.ts --radial --strict --export
    `);
    process.exit(0);
  }

  // Parse arguments
  const useRadial = args.includes('--radial');

  const seedIdsIndex = args.indexOf('--seed-ids') !== -1 ? args.indexOf('--seed-ids') : args.indexOf('-s');
  const seedIds = seedIdsIndex >= 0 ? args[seedIdsIndex + 1].split(',') : undefined;

  const maxNodesIndex = args.indexOf('--max-nodes') !== -1 ? args.indexOf('--max-nodes') : args.indexOf('-n');
  const maxNodes = maxNodesIndex >= 0 ? parseInt(args[maxNodesIndex + 1]) : 1000;

  const batchSizeIndex = args.indexOf('--batch-size') !== -1 ? args.indexOf('--batch-size') : args.indexOf('-b');
  const batchSize = batchSizeIndex >= 0 ? parseInt(args[batchSizeIndex + 1]) : 50;

  const radiusIndex = args.indexOf('--radius') !== -1 ? args.indexOf('--radius') : args.indexOf('-r');
  const radius = radiusIndex >= 0 ? parseInt(args[radiusIndex + 1]) : 2000;

  const asJson = args.includes('--json');
  const asYaml = args.includes('--yaml') || args.includes('-y');
  const exportToInbox = args.includes('--export') || args.includes('-e');
  const strictNormalization = args.includes('--strict');
  const lenientNormalization = args.includes('--lenient');

  const outputIndex = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = asYaml ? 'yaml' : (asJson ? 'json' : 'md');
  const defaultOutput = `./reports/distill-report-${timestamp}.${ext}`;
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : defaultOutput;

  // Remaining arg is the seed query
  const seedQuery = args.filter(a => !a.startsWith('-') && args.indexOf(a) !== seedIdsIndex + 1 && args.indexOf(a) !== maxNodesIndex + 1 && args.indexOf(a) !== batchSizeIndex + 1 && args.indexOf(a) !== outputIndex + 1 && args.indexOf(a) !== radiusIndex + 1)[0];

  console.log('='.repeat(60));
  console.log('  Anchor Engine - Graph Distiller');
  console.log('='.repeat(60));
  console.log();

  try {
    // IMPORTANT: Do not wipe database on command run
    config.DATABASE.WIPE_ON_STARTUP = false;

    console.log('Initializing database...');
    await db.init();

    if (useRadial) {
      // Standard 133: Radial Distillation
      const radialRequest: RadialDistillRequest = {
        seed: {
          query: seedQuery,
          compound_ids: seedIds
        },
        radius: radius,
        normalization: strictNormalization ? 'strict' : (lenientNormalization ? 'lenient' : 'strict'),
        output_format: asYaml ? 'yaml' : (asJson ? 'json' : 'compound'),
        output_path: outputPath,
        export_to_inbox: exportToInbox
      };

      console.log('Radial Distilling (Standard 133)...');
      console.log(`  Target: ${seedQuery || (seedIds ? seedIds.join(',') : 'All Compounds')}`);
      console.log(`  Radius: ${radius} chars`);
      console.log(`  Normalization: ${radialRequest.normalization}`);
      console.log(`  Mode: Line-level deduplication`);
      if (exportToInbox) console.log(`  Export: Enabled (→ inbox/distilled/)`);
      console.log();

      const result = await radialDistill(radialRequest);

      console.log();
      console.log('Radial Distillation Complete:');
      console.log(`  Compounds Processed: ${result.stats.compounds_processed}`);
      console.log(`  Total Lines: ${result.stats.lines_total}`);
      console.log(`  Unique Lines: ${result.stats.lines_unique}`);
      console.log(`  Duplicates Removed: ${result.stats.lines_duplicate}`);
      console.log(`  Compression: ${result.stats.compression_ratio}`);
      console.log(`  Duration: ${(result.stats.duration_ms / 1000).toFixed(2)}s`);
      console.log(`  Memory Peak: ${result.stats.memory_peak_mb}MB`);
      console.log(`  Output: ${result.output.path}`);
      console.log();

      await db.close();
      process.exit(0);
    }

    // Legacy atom-level distillation
    const request: DistillRequest = {
      seed: {
        query: seedQuery,
        atom_ids: seedIds
      },
      max_nodes: maxNodes,
      batch_size: batchSize,
      export_to_inbox: exportToInbox
    };

    console.log('Distilling graph (Legacy Mode)...');
    console.log(`  Target: ${seedQuery || (seedIds ? seedIds.join(',') : 'Global Roots')}`);
    console.log(`  Max Nodes: ${maxNodes}`);
    console.log(`  Mode: Deterministic Heuristic Compression`);
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
