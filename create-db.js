import fs from 'fs';

const pageSize = 4096;

// SQLite header (16 bytes)
const sqliteHeader = Buffer.from('SQLite format 3\0');

// Page size at offset 16-17 (big endian)
const pageSizeBuffer = Buffer.alloc(2);
pageSizeBuffer.writeUInt16BE(pageSize, 0);

const header = Buffer.concat([sqliteHeader, pageSizeBuffer]);

// Create a minimal SQLite database with 3 pages
const db = Buffer.alloc(pageSize * 3);

// Page 1: Database header
header.copy(db, 0);

// Page 2: sqlite_master schema table (internal schema page)
db[0x1000] = 0x0D; // write version

// Page 3: leaf table page with sqlite_master row
db[0x2000] = 0x0D; // write version
db.writeUInt16BE(2, 0x1C00); // number of cells = 2

// Row 0: sqlite_master entry (16 bytes)
const row0 = Buffer.alloc(16);
row0.writeUInt8(2, 0);     // column count
row0.writeUInt16BE(0, 2);  // rowid
row0.writeUInt8(0x02, 4);  // type (TEXT)
row0.writeUInt16BE(4, 6);  // length
row0.writeUInt16BE(0, 8);  // offset
row0.writeUInt8(0x01, 12); // flags

// Write the database file
fs.writeFileSync('C:/Users/rsbii/.anchor/context_data/anchor.db', db);
console.log('✓ Created SQLite database file');
console.log('  Path: C:/Users/rsbii/.anchor/context_data/anchor.db');
console.log('  Size:', db.length, 'bytes');
