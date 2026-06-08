import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Fix provenance line with syntax error: replace the broken pattern
const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Pattern to find the problematic line: provenance: [generateRelativePath(...unknown']
  if (/provenance:\s*\[generateRelativePath\(row\.source_path/.test(line)) {
    console.log(`Found syntax error at line ${i + 1}:`);
    console.log(line.trim());
    
    // Fix the pattern by adding missing closing parenthesis
    fixedLines.push(line.replace(/\]([^]]*$)/, ')]\n          '));
  } else {
    fixedLines.push(line);
  }
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', fixedLines.join('\n'));
console.log('\nApplied fix for provenance syntax error');