var fs = require('fs');

// Read file as plain text (CommonJS)
let content = fs.readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

const lines = content.split('\n');
let totalFixes = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Fix provenance line - should end with ], not ]
  if (/provenance:\s*\[[^\]]+\]$/.test(line)) {
    console.log('Line ' + (i+1) + ': Found provenance without trailing comma');
    totalFixes++;
    lines[i] = line.trim() + ',';
  }
  
  // Fix mtime double comma - replace ,, with , and remove blank lines before it
  if (/mtime:\s*row\.timestamp\s*\*\s*1000,,/.test(line)) {
    console.log('Line ' + (i+1) + ': Found double comma after mtime');
    totalFixes++;
    lines[i] = line.replace(/,,/g, ',');
  }
  
  // Fix simhash double comma - replace ,, with , and remove blank lines before it
  if (/simhash:\s*computeSimHash\(trimmed\),,/.test(line)) {
    console.log('Line ' + (i+1) + ': Found double comma after simhash');
    totalFixes++;
    lines[i] = line.replace(/,,/g, ',');
  }
}

// Also fix any remaining double commas in the file
content = lines.join('\n');
const finalContent = content.replace(/,\s*\n\s*[^=]/g, ',').replace(/\n\s+\w+:/g, '\n');

fs.writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', finalContent);
console.log('\nApplied ' + totalFixes + ' syntax fixes');