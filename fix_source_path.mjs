import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Find and fix source_path lines that are missing closing parenthesis before provenance line
const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Pattern: source_path with trailing comma that should have ) after unknown
  if (/source_path:\s*generateRelativePath\(row\.source_path/.test(line) && 
      !line.includes('unknown')) {
    
    // Check if next line is provenance (this confirms we need to fix this line)
    const nextLine = lines[i + 1] || '';
    if (/provenance:/.test(nextLine)) {
      console.log(`Fixing source_path at line ${i + 1}`);
      fixedLines.push(line.replace(/'unknown'/g, "'unknown')"));
      continue;
    }
  }
  
  fixedLines.push(line);
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', fixedLines.join('\n'));
console.log('Applied fix for source_path missing closing parenthesis');