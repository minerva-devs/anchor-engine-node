var fs = require('fs');

// Read file as plain text (not ES module)
let content = fs.readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Find and replace the exact broken pattern with correct code
// Pattern: currentBlock = { ... source_path: generateRelativePath(...,, provenance: [...] \n mtime: ...,, simhash: ..., tags: ... };

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Pattern for heading blocks - fix double comma after unknown and add proper structure
  if (/source_path:\s*generateRelativePath\(row\.source_path/.test(line)) {
    console.log('Found source_path at line ' + (i + 1));
    
    // The entire block from this line to the closing }; needs to be rewritten
    let start = i;
    let braceCount = 0;
    let end = -1;
    
    for (let j = start; j < Math.min(lines.length, start + 20); j++) {
      if (lines[j].includes('{')) braceCount++;
      if (lines[j].includes('};') && braceCount > 0) {
        end = j;
        break;
      }
    }
    
    // If we found the block, replace it with correct version
    if (end > start) {
      const correctBlock = [
        '        currentBlock = {',
        '          id: `block-${crypto.createHash(\'sha256\').update(trimmed).digest(\'hex\').substring(0, 8)}`,',
        "          type: level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3',",
        '          content: trimmed,',
        '          heading: heading,',
        '          level: level,',
        "          source_path: generateRelativePath(row.source_path || row.provenance || 'unknown'),",
        "          provenance: [generateRelativePath(row.source_path || row.provenance || 'unknown')],",
        '          mtime: row.timestamp * 1000,',
        '          simhash: computeSimHash(trimmed),',
        '          tags: extractTags(trimmed)',
        '        };'
      ].join('\n');
      
      const oldBlock = lines.slice(start, end + 1).join('\n');
      content = content.substring(0, start * 12) + correctBlock + '\n' + content.substring((end + 1) * 12);
      i = end; // Skip past the replaced block
    }
  }
}

fs.writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', content);
console.log('Applied fixes to all blocks');