#!/usr/bin/env node
/**
 * Graph Distillation CLI - Standard 133 Radial Distillation
 *
 * Usage:
 *   node --loader ts-node/esm src/commands/distill.ts [options] [seed_query]
 *
 * Options:
 *   --seed-ids, -s    Comma-separated compound IDs to start from
 *   --radius, -r      Inflation radius (default: 2000)
 *   --output, -o      Output file path (default: ./reports/distill-report-<timestamp>.md)
 *   --yaml            Output as YAML
 *   --json            Output as JSON
 *   --export, -e      Export to inbox/distilled/ folder
 *   --strict          Strict normalization (default)
 *   --lenient         Lenient normalization
 */

import { db } from '../core/db.js';
import type { RadialDistillRequest } from '../services/distillation/radial-distiller.js';
import { radialDistill } from '../services/distillation/radial-distiller.js';
import { config } from '../config/index.js';
import path from 'path';
import fs from 'fs';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Graph Distillation CLI - Standard 133 Radial Distillation

Usage:
  node --loader ts-node/esm src/commands/distill.ts [options] [seed_query]

Options:
  --seed-ids, -s    Comma-separated compound IDs to start from
  --radius, -r      Inflation radius (default: 2000)
  --strict          Strict normalization (default)
  --lenient         Lenient normalization
  --output, -o      Output file path
  --yaml            Output as YAML
  --json            Output as JSON
  --export, -e      Export to inbox/distilled/ folder

Examples:
  node src/commands/distill.ts
  node src/commands/distill.ts --radius 5000
  node src/commands/distill.ts --strict --export
  node src/commands/distill.ts --lenient --yaml
    `);
    process.exit(0);
  }

  // Parse arguments
  const seedIdsIndex = args.indexOf('--seed-ids') !== -1 ? args.indexOf('--seed-ids') : args.indexOf('-s');
  const seedIds = seedIdsIndex >= 0 ? args[seedIdsIndex + 1].split(',') : undefined;

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
  const seedQuery = args.filter(a => !a.startsWith('-') && args.indexOf(a) !== seedIdsIndex + 1 && args.indexOf(a) !== outputIndex + 1 && args.indexOf(a) !== radiusIndex + 1)[0];

  console.log('='.repeat(60));
  console.log('  Anchor Engine - Graph Distiller');
  console.log('='.repeat(60));
  console.log();

  try {
    // IMPORTANT: Do not wipe database on command run
    config.DATABASE.WIPE_ON_STARTUP = false;

    console.log('Initializing database...');
    await db.init();

    // Standard 133: Radial Distillation
    const radialRequest: RadialDistillRequest = {
      seed: {
        query: seedQuery,
        compound_ids: seedIds,
      },
      radius: radius,
      normalization: strictNormalization ? 'strict' : (lenientNormalization ? 'lenient' : 'strict'),
      output_format: asYaml ? 'yaml' : (asJson ? 'json' : 'compound'),
      output_path: outputPath,
      export_to_inbox: exportToInbox,
    };

    console.log('Radial Distilling (Standard 133)...');
    console.log(`  Target: ${seedQuery || (seedIds ? seedIds.join(',') : 'All Compounds')}`);
    console.log(`  Radius: ${radius} chars`);
    console.log(`  Normalization: ${radialRequest.normalization}`);
    console.log('  Mode: Line-level deduplication');
    if (exportToInbox) console.log('  Export: Enabled (→ inbox/distilled/)');
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
  } catch (error: any) {
    console.error('Error during distillation:', error.message);
    process.exit(1);
  }
}

main();
