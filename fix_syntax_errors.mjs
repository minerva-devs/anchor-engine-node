import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Fix syntax errors - missing closing parentheses in generateRelativePath calls
const fixes = [
  // Pattern: source_path: generateRelativePath(row.source_path || row.provenance || 'unknown', -> should be just the path, no extra comma
  { 
    pattern: /source_path:\s*generateRelativePath\(row\.source_path\s*\|\|[^)]+unknown,[\s\S]*?mtime:/g,
    replacement: (match) => match.replace(/unknown,[\s\S]*?mtime:/, 'unknown)\n          mtime:') 
  },
  // Pattern: provenance: [generateRelativePath(...unknown], -> should be provenance: [...]
  { 
    pattern: /provenance:\s*\[generateRelativePath\(row\.source_path\s*\|\|[^)]+unknown\]/g,
    replacement: (match) => match.replace(/unknown\]/, 'unknown')]') 
  }
];

// Find all patterns to fix
let errorCount = 0;
for (const { pattern, replacement } of fixes) {
  const matches = content.match(pattern) || [];
  if (matches.length > 0) {
    console.log(`Found ${matches.length} occurrences of issue, fixing...`);
    content = content.replace(pattern, replacement);
  }
}

// Now add clean mode processing in assembleDecisionRecords after unifiedContent is built
const cleanModeCode = `    
    // Clean Mode: Process unified content for compact output (strip artifacts, truncate)
    if (${isCompactMode}) {
      const MAX_CONTENT_LENGTH = parseInt(process.env.CLEAN_MAX_CHARS, 10) || 500;
      
      let processedContent = conceptBlocks
        .map(b => b.content)
        .filter(Boolean)
        .join('\n\n');
      
      // Strip artifacts using compiled patterns for speed
      for (const pattern of COMPILED_PATTERNS) {
        processedContent = processedContent.replace(pattern, '[REDACTED]');
      }
      
      // Truncate if too long with ellipsis marker
      if (processedContent.length > MAX_CONTENT_LENGTH) {
        processedContent = processedContent.substring(0, MAX_CONTENT_LENGTH - 3) + '...';
      }
      
      unifiedContent = processedContent;
    }`;

// Insert clean mode processing right after "Build unified content from all blocks" section
const insertPattern = /\/\/ Build unified content from all blocks[\s\S]*?const id = `concept-/;
content = content.replace(insertPattern, (match) => match + cleanModeCode);

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', content);
console.log('\n=== SYNTAX FIXES APPLIED ===');
console.log('Fixed generateRelativePath syntax errors and added clean mode processing');