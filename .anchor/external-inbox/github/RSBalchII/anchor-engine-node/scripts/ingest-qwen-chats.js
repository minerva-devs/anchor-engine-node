#!/usr/bin/env node

/**
 * Ingest chat files from .qwen/chats into Anchor Engine
 * Reads .md files from .qwen/chats/{qwen,gemini-cli,copilot-cli,vscode}
 * and ingests them into the notebook/inbox directory for Anchor Engine to process.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - use absolute paths
const CHAT_SOURCE_DIR = process.env.CHAT_SOURCE_DIR || 'C:\\Users\\rsbiiw\\.qwen\\chats';
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join('C:\\Users\\rsbiiw\\projects\\aen', 'notebook', 'inbox', 'chats');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
}

// Get all subdirectories (qwen, gemini-cli, copilot-cli, vscode)
const subdirs = fs.readdirSync(CHAT_SOURCE_DIR).filter(item => {
    const itemPath = path.join(CHAT_SOURCE_DIR, item);
    return fs.statSync(itemPath).isDirectory();
});

let totalFiles = 0;
let totalSize = 0;

console.log('='.repeat(60));
console.log('Chat Ingestion Script');
console.log('='.repeat(60));
console.log(`Source: ${CHAT_SOURCE_DIR}`);
console.log(`Destination: ${OUTPUT_DIR}`);
console.log('');

for (const subdir of subdirs) {
    const sourceDir = path.join(CHAT_SOURCE_DIR, subdir);
    const destSubdir = path.join(OUTPUT_DIR, subdir);
    
    // Create destination subdirectory
    if (!fs.existsSync(destSubdir)) {
        fs.mkdirSync(destSubdir, { recursive: true });
        console.log(`Created: ${destSubdir}`);
    }
    
    // Get all .md files in source
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
    
    console.log(`\nProcessing ${subdir}/ (${files.length} files):`);
    
    for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destSubdir, file);
        
        // Skip if already exists (avoid duplicates)
        if (fs.existsSync(destPath)) {
            console.log(`  Skip (exists): ${file}`);
            continue;
        }
        
        // Copy file
        const content = fs.readFileSync(sourcePath, 'utf-8');
        fs.writeFileSync(destPath, content);
        
        totalFiles++;
        totalSize += content.length;
        
        if (totalFiles <= 5 || totalFiles % 50 === 0) {
            console.log(`  Copied: ${file} (${(content.length / 1024).toFixed(1)} KB)`);
        }
    }
}

console.log('');
console.log('='.repeat(60));
console.log('Ingestion Summary:');
console.log(`  Total files copied: ${totalFiles}`);
console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Destination: ${OUTPUT_DIR}`);
console.log('='.repeat(60));
console.log('');
console.log('Next steps:');
console.log('1. Start the Anchor Engine watchdog from Settings UI');
console.log('2. Or manually trigger ingestion via API:');
console.log('   curl -X POST http://localhost:3160/v1/watcher/scan');
console.log('');
