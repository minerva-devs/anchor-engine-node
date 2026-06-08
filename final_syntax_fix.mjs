import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Fix the exact pattern: double comma after unknown + missing closing paren
const fixes = [
  // Pattern: source_path line with double comma and missing )
  { 
    lines: [546, 564, 582, 600, 618, 634],  // 0-indexed
    oldPattern: "source_path: generateRelativePath(row.source_path || row.provenance || 'unknown',,\n          provenance:",
    newCode: "source_path: generateRelativePath(row.source_path || row.provenance || 'unknown'),\n          provenance:"
  }
];

for (const fix of fixes) {
  const oldPattern = fix.oldPattern;
  const newCode = fix.newCode;
  const matches = content.split(oldPattern).length - 1;
  
  if (matches > 0) {
    console.log(`Found ${matches} occurrences, fixing...`);
    let fixedContent = content;
    for (let i = 0; i < matches; i++) {
      fixedContent = fixedContent.replace(oldPattern, newCode);
    }
    content = fixedContent;
  } else {
    console.log('No matches found for this pattern');
  }
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', content);
console.log('Applied targeted syntax fixes');