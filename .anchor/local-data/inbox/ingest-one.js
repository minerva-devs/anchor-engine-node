import fs from 'fs';
import path from 'path';

const CHAT_DIR = '/data/data/com.termux/files/home/.qwen/projects/-data-data-com-termux-files-home/chats';
const OUTPUT_DIR = './local-data/inbox';

// Get just the smallest file first
const chatFiles = fs.readdirSync(CHAT_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
        name: f,
        size: fs.statSync(path.join(CHAT_DIR, f)).size
    }))
    .sort((a, b) => a.size - b.size);

console.log('Files to ingest (smallest first):');
chatFiles.forEach((f, i) => {
    console.log(`${i + 1}. ${f.name} - ${(f.size / 1024 / 1024).toFixed(2)}MB`);
});

// Copy just the smallest 3 files
const toIngest = chatFiles.slice(0, 3);
console.log(`\nCopying ${toIngest.length} smallest files to inbox...`);

for (const file of toIngest) {
    const src = path.join(CHAT_DIR, file.name);
    const dst = path.join(OUTPUT_DIR, `qwen-${file.name}`);
    fs.copyFileSync(src, dst);
    console.log(`✓ ${file.name} -> ${dst}`);
}

console.log('\n✅ Ready for ingestion!');
