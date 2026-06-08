import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Find the "Build unified content from all blocks" section and add clean mode processing
const searchPattern = new RegExp('// Build unified content from all blocks\\s+' + 
                                 '/\\/\\*' + 
                                 'const content = conceptBlocks' + 
                                 '\\.map\\(b => b\\.content\\)' + 
                                 '\\.filter\\(Boolean\\)' + 
                                 '\\.join', 'm');

const replacement = `// Build unified content from all blocks - OPTIMIZED for clean mode
      let unifiedContent = conceptBlocks
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

content = content.replace(searchPattern, replacement);

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', content);
console.log('Added clean mode artifact stripping to radial-distiller-v2.ts');