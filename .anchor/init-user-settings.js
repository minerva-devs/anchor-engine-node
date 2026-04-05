#!/usr/bin/env node
/**
 * Anchor Engine User Settings Initializer
 * 
 * This script generates user_settings.json from the template on first run.
 * It resolves all paths and creates the .anchor/ directory structure.
 * 
 * Usage: node .anchor/init-user-settings.js
 */

const path = require('path');
const fs = require('fs');

try {
  // Resolve project root (go up 3 levels from engine/src/config)
  const currentDir = process.cwd();
  const projectRoot = path.resolve(currentDir, '..', '..', '..');
  const anchorRoot = path.resolve(projectRoot, '.anchor');
  const generatedAt = new Date().toISOString();
  
  console.log('📁 Anchor Engine User Settings Initializer');
  console.log('==========================================');
  console.log(`Project Root: ${projectRoot}`);
  console.log(`Anchor Root:  ${anchorRoot}`);
  
  // Read template
  const templatePath = path.join(projectRoot, 'user_settings.json.template');
  let templateContent;
  
  try {
    templateContent = fs.readFileSync(templatePath, 'utf-8');
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
  
  // Write generated file
  const outputPath = path.join(projectRoot, '.anchor', 'user_settings.json');
  
  if (!fs.existsSync(anchorRoot)) {
    fs.mkdirSync(anchorRoot, { recursive: true });
    console.log(`✅ Created .anchor directory: ${anchorRoot}`);
  }
  
  fs.writeFileSync(outputPath, processed, 'utf-8');
  console.log(`✅ Generated user_settings.json at: ${outputPath}`);
  console.log(`   Generated at: ${generatedAt}`);
  
  // Create subdirectories
  const subdirs = ['inbox', 'external-inbox', 'distills', 'mirrored_brain', 'sessions', 'logs', 'backups'];
  for (const subdir of subdirs) {
    const subdirPath = path.join(anchorRoot, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
      console.log(`✅ Created ${subdir}/: ${subdirPath}`);
    }
  }
  
  // Also ensure notebook directories exist (for backward compatibility)
  const notebookDir = path.join(projectRoot, 'notebook');
  const notebookSubdirs = ['inbox', 'external-inbox', 'distills'];
  
  try {
    if (!fs.existsSync(notebookDir)) {
      fs.mkdirSync(notebookDir, { recursive: true });
      console.log(`✅ Created notebook/ directory: ${notebookDir}`);
    }
    
    for (const subdir of notebookSubdirs) {
      const subdirPath = path.join(notebookDir, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
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
