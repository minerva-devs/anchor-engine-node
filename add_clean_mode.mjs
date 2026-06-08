import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Find the exact location where we need to insert clean mode logic
const markers = [
  '// Build unified content from all blocks',
  '.join(\'\\n\\n\')',
  '// Generate ID from simhash'
];

let foundStart = false;
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < markers.length; i++) {
  const idx = content.indexOf(markers[i]);
  if (idx >= 0) {
    console.log(`Found marker ${i+1}: "${markers[i].trim()}" at index ${idx}`);
    if (!foundStart) {
      startIdx = idx;
      foundStart = true;
    }
    endIdx = idx;
  } else {
    console.log(`Marker not found: ${markers[i]}`);
  }
}

// Extract the section we want to modify
const before = content.substring(0, startIdx + 150);
const after = content.substring(endIdx + endIdx > 0 ? endIdx : startIdx + 150);

console.log('\n--- BEFORE (first 200 chars) ---');
console.log(before.substring(0, 200));
console.log('...');
console.log('\n--- AFTER (first 200 chars) ---');
console.log(after.substring(0, 200));

// Create the replacement code
const cleanModeCode = `let unifiedContent = conceptBlocks
      .map(b => b.content)
      .filter(Boolean)
      .join('\\n\\n');
      
      // Clean Mode: Strip artifacts and truncate to max length (for small model context windows)
      if (${isCompactMode}) {
        const MAX_CONTENT_LENGTH = ${process.env.CLEAN_MAX_CHARS || 500};
        
        // Strip artifacts using compiled patterns for speed
        for (const pattern of COMPILED_PATTERNS) {
          unifiedContent = unifiedContent.replace(pattern, '[REDACTED]');
        }
        
        // Truncate if too long with ellipsis marker
        if (unifiedContent.length > MAX_CONTENT_LENGTH) {
          unifiedContent = unifiedContent.substring(0, MAX_CONTENT_LENGTH - 3) + '...';
        }
      }`;

// Replace the section
const oldSection = before.match(/let unifiedContent[^;]+;/)[0] || 
                   content.substring(startIdx, startIdx + 200);

console.log('\n--- OLD SECTION ---');
console.log(oldSection.substring(0, 300));