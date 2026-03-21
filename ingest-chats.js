#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_KEY = 'bolt-memory-secret';
const API_URL = 'http://localhost:3161';
const CHAT_DIR = '/data/data/com.termux/files/home/.qwen/projects/-data-data-com-termux-files-home/chats';
const OUTPUT_DIR = path.join(__dirname, 'local-data', 'inbox');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get list of chat files
const chatFiles = fs.readdirSync(CHAT_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .slice(0, 5); // Start with first 5 sessions

console.log(`Found ${chatFiles.length} chat sessions to ingest`);

for (const chatFile of chatFiles) {
    const chatPath = path.join(CHAT_DIR, chatFile);
    const sessionId = chatFile.replace('.jsonl', '');
    
    console.log(`\nIngesting ${chatFile}...`);
    
    try {
        const content = fs.readFileSync(chatPath, 'utf-8');
        const lines = content.trim().split('\n').length;
        
        console.log(`  - ${lines} messages`);
        console.log(`  - Session ID: ${sessionId}`);
        
        // Save to inbox for watchdog to pick up
        const outputPath = path.join(OUTPUT_DIR, `qwen-${sessionId}.jsonl`);
        fs.writeFileSync(outputPath, content);
        
        console.log(`  ✓ Saved to ${outputPath}`);
    } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
    }
}

console.log('\n✅ All sessions saved to inbox!');
console.log('The watchdog service will ingest them automatically.');
