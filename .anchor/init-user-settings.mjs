#!/usr/bin/env node
/**
 * Anchor Engine User Settings Initializer
 * 
 * This script generates user_settings.json from the template on first run.
 * It resolves all paths and creates the .anchor/ directory structure.
 * 
 * Usage: node .anchor/init-user-settings.mjs
 */

import { resolve, join, dirname } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

try {
  // Resolve project root (from current working directory)
  const currentDir = process.cwd();
  const projectRoot = resolve(currentDir);
  const anchorRoot = resolve(projectRoot, '.anchor');
  const generatedAt = new Date().toISOString();
  
  console.log('📁 Anchor Engine User Settings Initializer');
  console.log('==========================================');
  console.log(`Project Root: ${projectRoot}`);
  console.log(`Anchor Root:  ${anchorRoot}`);
  
  // Read template
  const templatePath = join(projectRoot, 'user_settings.json.template');
  let templateContent;
  
  try {
    templateContent = readFileSync(templatePath, 'utf-8');
  } catch (err) {
    console.error(`❌ Template file not found: ${templatePath}`);
    console.error('Please ensure user_settings.json.template exists in the project root.');
    process.exit(1);
  }
  
  // Replace placeholders
  let processed = templateContent
    .replace(/<ANCHOR_ROOT>/g, anchorRoot)
    .replace(/<API_KEY>/g, 'anchor-engine-default-key')
    .replace(/<DEFAULT_MODEL>/g, 'gpt-4o')
    .replace(/<GENERATED_AT>/g, generatedAt);

  // Fix Windows backslashes to forward slashes in path values (valid JSON on all platforms)
  processed = processed.replace(/"([A-Z]:)\\(?:[^"\\]|\\.)*"/g, (match) => {
    return match.replace(/\\/g, '/');
  });
  
  // Write generated file
  const outputPath = join(projectRoot, '.anchor', 'user_settings.json');
  
  if (!existsSync(anchorRoot)) {
    mkdirSync(anchorRoot, { recursive: true });
    console.log(`✅ Created .anchor directory: ${anchorRoot}`);
  }
  
  // Check if user_settings.json already exists (preserve existing setups)
  if (!existsSync(outputPath)) {
    writeFileSync(outputPath, processed, 'utf-8');
    console.log(`✅ Generated user_settings.json at: ${outputPath}`);
    console.log(`   Generated at: ${generatedAt}`);
  } else {
    console.log(`⚠️  Skipping generation: user_settings.json already exists at ${outputPath}`);
    console.log('   Your existing configuration will be preserved.');
  }
  
  // Create subdirectories
  const subdirs = ['inbox', 'external-inbox', 'distills', 'mirrored_brain', 'sessions', 'logs', 'backups'];
  for (const subdir of subdirs) {
    const subdirPath = join(anchorRoot, subdir);
    if (!existsSync(subdirPath)) {
      mkdirSync(subdirPath, { recursive: true });
      console.log(`✅ Created ${subdir}/: ${subdirPath}`);
    }
  }
  
  // Also ensure notebook directories exist (for backward compatibility)
  const notebookDir = join(projectRoot, 'notebook');
  const notebookSubdirs = ['inbox', 'external-inbox', 'distills'];
  
  try {
    if (!existsSync(notebookDir)) {
      mkdirSync(notebookDir, { recursive: true });
      console.log(`✅ Created notebook/ directory: ${notebookDir}`);
    }
    
    for (const subdir of notebookSubdirs) {
      const subdirPath = join(notebookDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
        console.log(`✅ Created notebook/${subdir}/: ${subdirPath}`);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  console.log('==========================================');
  console.log('✅ Initialization complete!');
  console.log('');
  console.log('You can now customize user_settings.json in .anchor/');
  console.log('or modify the template at: user_settings.json.template');
  
} catch (error) {
  console.error('❌ Failed to initialize user settings:', error.message);
  console.error('Please check that Node.js is installed and the template file exists.');
  process.exit(1);
}
