import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Find the exact location of "Build unified content" and add clean mode processing right after
const unifyIdx = content.indexOf('// Build unified content from all blocks');
console.log('Found unified content marker at index:', unifyIdx);

if (unifyIdx > 0) {
  // Find where .join('\n\n') ends in the next few hundred characters
  const afterUnify = content.substring(unifyIdx + 50);
  
  // Look for the pattern: .join('\n\n');\n    // Generate ID
  const joinIdx = afterUnify.indexOf('.join(\'\\n\\n\');');
  console.log('Found .join at relative index:', joinIdx, '(absolute:', unifyIdx + joinIdx + 50 + 10, ')');
  
  if (joinIdx >= 0) {
    const absoluteJoinIdx = unifyIdx + joinIdx;
    
    // Get the code we want to insert - read from file as a string constant
    const cleanModeCode = `      // Clean Mode: Strip artifacts and truncate to max length (for small model context windows)\n` +
                          `      if (${isCompactMode}) {\n` +
                          `        const MAX_CONTENT_LENGTH = ${process.env.CLEAN_MAX_CHARS || 500};\n` +
                          `        \n` +
                          `        // Strip artifacts using compiled patterns for speed\n` +
                          `        for (const pattern of COMPILED_PATTERNS) {\n` +
                          `          unifiedContent = unifiedContent.replace(pattern, '[REDACTED]');\n` +
                          `        }\n` +
                          `        \n` +
                          `        // Truncate if too long with ellipsis marker\n` +
                          `        if (unifiedContent.length > MAX_CONTENT_LENGTH) {\n` +
                          `          unifiedContent = unifiedContent.substring(0, MAX_CONTENT_LENGTH - 3) + '...';\n` +
                          `        }\n` +
                          `      }`;
    
    const newCode = "    // Build unified content from all blocks\n" +
                    "    let unifiedContent = conceptBlocks\n" +
                    "      .map(b => b.content)\n" +
                    "      .filter(Boolean)\n" +
                    "      .join('\\n\\n');\n" +
                    "\n" +
                    cleanModeCode;
    
    // Replace the old pattern with new code
    const before = content.substring(0, unifyIdx);
    const after = content.substring(absoluteJoinIdx + 20); // After .join('\n\n');
    
    writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', before + newCode + after);
    console.log('\n=== CLEAN MODE CODE APPLIED ===');
    console.log('Total file size:', content.length, '->', (before + newCode + after).length);
  } else {
    console.log('Could not find .join pattern after unified content marker');
  }
} else {
  console.log('Could not find unified content marker');
}

console.log('\nDone!');