// Initialize empty SQLite database for Anchor Context Engine
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Working directory:', __dirname);
console.log('Running from:', process.cwd());

// Use absolute path with proper Windows path resolution
const dbPath = 'file:///C:/Users/rsbii/.anchor/context_data/anchor.db';

console.log('Creating database file:', dbPath);

// Create the file with proper SQLite header to indicate it's a SQLite database
// SQLite format: 16-byte magic header + page size (4 bytes) + rest of pages
const sqliteHeader = Buffer.from([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x33, 0x00, 0x00]); // "SQLite format3\0"
const pageSize = Buffer.from([0x10, 0x00, 0x00, 0x01]); // 4096 bytes page size (big endian)
const header = Buffer.concat([sqliteHeader, pageSize]);

try {
  fs.writeFileSync(dbPath, header);
  console.log('✓ SQLite database header created successfully');
  console.log('File size:', header.length, 'bytes');
} catch (error) {
  console.error('✗ Failed to create database:', error);
  process.exit(1);
}
