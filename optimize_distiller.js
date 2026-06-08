import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Pattern: Replace source_path: row.source_path || row.provenance with relative path version
const pattern1 = /source_path:\s*row\.source_path\s*\|\|/g;
content = content.replace(pattern1, `source_path: generateRelativePath(row.source_path ||`);

const pattern2 = /provenance:\s*\[row\.source_path\s*\|\|/g;
content = content.replace(pattern2, `provenance: [generateRelativePath(row.source_path ||`);

// Add the helper function after imports section (after PGLITE_CHUNK_IDS definition)
const helperFunction = `
/**
 * Generate relative path from absolute path for compact provenance storage
 */
function generateRelativePath(absPath: string, baseDir?: string): string {
  if (!absPath || absPath === 'unknown' || absPath === '') return absPath;
  
  // Normalize paths (handle Windows backslashes)
  const abs = absPath.replace(/\\/g, '/');
  const base = (baseDir || process.cwd()).replace(/\\/g, '/');
  
  // Check if base is a prefix of the absolute path
  if (abs.startsWith(base + '/') && base.length > 10) {
    return abs.substring(base.length);
  }
  
  return absPath;
}

`;

// Find insertion point after PGLITE_CHUNK_IDS definition
const insertIndex = content.indexOf('const PGLITE_CHUNK_IDS');
if (insertIndex > 0) {
  const endOfLine = content.indexOf('\n', insertIndex);
  if (endOfLine > 0) {
    content = content.substring(0, endOfLine + 1) + helperFunction + content.substring(endOfLine + 1);
  }
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', content);
console.log('Optimized radial-distiller-v2.ts with relative path generation');