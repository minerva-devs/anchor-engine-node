import { readFileSync, writeFileSync } from 'fs';

let lines = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8').split('\n');

// Find and fix syntax errors line by line
const fixedLines = [];
let inProblemArea = false;
let braceCount = 0;
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  
  // Fix generateRelativePath with extra comma after 'unknown' - common pattern
  if (/generateRelativePath\(row\.source_path\s*\|\|[^)]+unknown,/.test(line)) {
    // Remove the trailing comma and any following whitespace
    fixedLines.push(line.replace(/unknown,?\s*/g, 'unknown'));
  } else if (line.trim().startsWith('provenance: [') && line.includes('generateRelativePath')) {
    // Fix provenance array - should have closing ] not ,]
    fixedLines.push(line.replace(/\],?/g, ']'));
  } else {
    fixedLines.push(line);
  }
  
  i++;
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', fixedLines.join('\n'));
console.log('Applied basic syntax fixes to generateRelativePath calls');