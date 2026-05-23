#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('=== Testing File Persistence ===');

const dir = 'C:\\Users\\rsbii\\.anchor\\logs\\search-tests';
console.log('Creating directory:', dir);
fs.mkdirSync(dir, { recursive: true });
console.log('Directory created!');

const file = path.join(dir, 'test.json');
console.log('Writing file:', file);
fs.writeFileSync(file, JSON.stringify({ test: 'data', timestamp: Date.now() }));
console.log('File written!');

// Check immediately
setTimeout(() => {
  console.log('\n=== Checking files ===');
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    console.log('Files found:', files.length);
    files.forEach(f => {
      const stats = fs.statSync(path.join(dir, f));
      console.log(`  ${f}: ${stats.size} bytes`);
    });
    
    // Read file content
    if (files.length > 0) {
      const content = fs.readFileSync(path.join(dir, files[0]), 'utf8');
      console.log('\nFile content:', content);
    }
  } else {
    console.log('Directory does not exist!');
  }
}, 100);
