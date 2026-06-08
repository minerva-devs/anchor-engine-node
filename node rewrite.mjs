import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Simple line-by-line fix approach - find the broken blocks and replace them with correct versions
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Find heading blocks with double comma issues
  if (/type:.*level.*/.test(line) && /heading: heading,?/.test(lines[i + 1] || '')) {
    console.log(`Found heading block at line ${i + 1}`);
    
    // Replace the entire block from currentBlock = { to };
    const startIdx = i;
    let braceCount = 0;
    let endIdx = -1;
    
    for (let j = i; j < lines.length && j < i + 25; j++) {
      if (lines[j].includes('{')) braceCount++;
      if (lines[j].includes('};')) {
        braceCount--;
        if (braceCount === 0) {
          endIdx = j;
          break;
        }
      }
    }
    
    // Create correct block
    const newBlock = `currentBlock = {\n          id: \\\`block-\${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}\\\`,\n          type: level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3',\n          content: trimmed,\n          heading: heading,\n          level: level,\n          source_path: generateRelativePath(row.source_path || row.provenance || 'unknown'),\n          provenance: [generateRelativePath(row.source_path || row.provenance || 'unknown')],\n          mtime: row.timestamp * 1000,\n          simhash: computeSimHash(trimmed),\n          tags: extractTags(trimmed),\n        };`;
    
    const oldBlock = lines.slice(startIdx, endIdx + 1).join('\n');
    if (oldBlock.includes('source_path') && !newBlock.includes('unknown')) {
      content = content.substring(0, startIdx * 10) + newBlock + '\n' + content.substring((endIdx + 1) * 10);
    }
    i = endIdx;
  }
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', content);
console.log('Applied targeted block fixes');