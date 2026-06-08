import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Comprehensive fix: Add missing commas after generateRelativePath calls and fix provenance syntax
const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Fix source_path line - add comma at end if it's followed by provenance line
  if (/source_path:\s*generateRelativePath\(/.test(line)) {
    const nextLine = lines[i + 1] || '';
    if (/provenance:/.test(nextLine)) {
      // Add trailing comma to source_path line and fix any syntax issues
      fixedLines.push(line.trim() + ',');
      continue;
    }
  }
  
  // Fix provenance lines with syntax errors
  if (/provenance:\s*\[generateRelativePath/.test(line)) {
    // Make sure it has proper closing ] and comma if followed by mtime
    const nextLine = lines[i + 1] || '';
    if (/mtime:/.test(nextLine)) {
      fixedLines.push(line.trim() + '],');
      continue;
    }
  }
  
  // Also add trailing commas to provenance lines that end with ] (if followed by mtime)
  if (/provenance:\s*\[[^\]]+\]/.test(line)) {
    const nextLine = lines[i + 1] || '';
    if (/mtime:/.test(nextLine) && !line.endsWith('],')) {
      fixedLines.push(line.trim() + '],');
      continue;
    }
  }
  
  // Also need to add commas after mtime if followed by semicolon in object (fix comma placement)
  if (/mtime:\s*row\.timestamp/.test(line)) {
    const nextLine = lines[i + 1] || '';
    if (nextLine.includes('simhash:')) {
      fixedLines.push(line.trim() + ',');
      continue;
    }
  }
  
  // Add commas after simhash lines too
  if (/simhash:\s*computeSimHash/.test(line)) {
    const nextLine = lines[i + 1] || '';
    if (nextLine.includes('tags:') || nextLine.includes(';')) {
      fixedLines.push(line.trim() + ',');
      continue;
    }
  }
  
  fixedLines.push(line);
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', fixedLines.join('\n'));
console.log('Applied comprehensive syntax fixes');