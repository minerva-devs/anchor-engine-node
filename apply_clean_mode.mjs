import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Read the current isCompactMode definition to preserve it
const idx1 = content.indexOf('// Determine output mode');
const idx2 = content.indexOf('const isCorpusMode', idx1 + 50);

if (idx1 >= 0 && idx2 > idx1) {
  const existingCode = content.substring(idx1, idx2);
  console.log('Found isCompactMode definition at:', idx1, '-', idx2);
  console.log('Existing code:\n', existingCode);
  
  // Now let's add the clean mode processing right after unifiedContent is created
  // Find the exact location of "Build unified content from all blocks"
  const unifyIdx = content.indexOf('// Build unified content from all blocks');
  
  if (unifyIdx > idx2) {
    console.log('\nFound unified content section at:', unifyIdx);
    
    // Create the new code to insert after .join('\n\n')
    const insertAfter = '.join(\'\\n\\n\');';
    const insertIdx = content.indexOf(insertAfter, unifyIdx);
    
    if (insertIdx >= 0) {
      const codeToInsert = "\n" +
        "    let unifiedContent = conceptBlocks\n" +
        "      .map(b => b.content)\n" +
        "      .filter(Boolean)\n" +
        "      .join('\\n\\n');\n" +
        "\n" +
        "    // Clean Mode: Strip artifacts and truncate to max length (for small model context windows)\n" +
        "    if (" + isCompactMode + ") {\n" +
        "      const MAX_CONTENT_LENGTH = " + (process.env.CLEAN_MAX_CHARS || 500) + ";\n" +
        "      \n" +
        "      // Strip artifacts using compiled patterns for speed\n" +
        "      for (const pattern of COMPILED_PATTERNS) {\n" +
        "        unifiedContent = unifiedContent.replace(pattern, '[REDACTED]');\n" +
        "      }\n" +
        "      \n" +
        "      // Truncate if too long with ellipsis marker\n" +
        "      if (unifiedContent.length > MAX_CONTENT_LENGTH) {\n" +
        "        unifiedContent = unifiedContent.substring(0, MAX_CONTENT_LENGTH - 3) + '...';\n" +
        "      }\n" +
        "    }";
      
      // We need to replace the old .join pattern with our new code
      const beforeJoin = content.substring(0, insertIdx);
      const afterJoin = content.substring(insertIdx + insertAfter.length);
      
      const combined = beforeJoin + codeToInsert + afterJoin;
      
      writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', combined);
      console.log('\n=== CHANGES APPLIED ===');
      console.log('Code inserted at line ' + insertIdx);
    } else {
      console.log('\nCould not find join pattern');
    }
  } else {
    console.log('\nisCompactMode definition found after unified content section');
  }
} else {
  console.log('Could not find isCompactMode definition');
}

console.log('\nDone!');