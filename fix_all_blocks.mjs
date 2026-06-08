import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Read the correct block template once to use multiple times
const correctBlockTemplate = `        currentBlock = {
          id: \\`block-\\${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}\\`,
          type: level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3',
          content: trimmed,
          heading: heading,
          level: level,
          source_path: generateRelativePath(row.source_path || row.provenance || 'unknown'),
          provenance: [generateRelativePath(row.source_path || row.provenance || 'unknown')],
          mtime: row.timestamp * 1000,
          simhash: computeSimHash(trimmed),
          tags: extractTags(trimmed),
        };`;

// Pattern to find broken blocks - starts with "currentBlock = {" and ends with "}"
const blockPattern = /currentBlock\s*=\s*\{[\s\S]*?tags:\s*extractTags\(trimmed\)[,\s]?\n\s*\};/g;

let fixedCount = 0;
let match;
while ((match = blockPattern.exec(content)) !== null) {
  fixedCount++;
  // Extract the matched block
  const fullMatch = match[0];
  
  // Check if it's a heading block (has heading field) or non-heading
  const hasHeading = /heading:\s*[^,]+/.test(fullMatch);
  
  // Replace with correct template
  let replacement;
  if (hasHeading) {
    replacement = correctBlockTemplate;
  } else {
    // Non-heading block - simpler version
    replacement = `        currentBlock = {\n          id: \\\`block-\\\${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}\\\`,\n          type: 'problem' | 'solution' | 'rationale' | 'status' | 'content',\n          content: trimmed,\n          heading: undefined,\n          level: 1,\n          source_path: generateRelativePath(row.source_path || row.provenance || 'unknown'),\n          provenance: [generateRelativePath(row.source_path || row.provenance || 'unknown')],\n          mtime: row.timestamp * 1000,\n          simhash: computeSimHash(trimmed),\n          tags: extractTags(trimmed),\n        };`;
  }
  
  content = content.substring(0, match.index) + replacement + content.substring(match.index + fullMatch.length);
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', content);
console.log(`Fixed ${fixedCount} block syntax errors`);