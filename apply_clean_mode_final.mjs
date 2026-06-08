import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// Read the actual isCompactMode definition from the file to use it correctly
const defIdx = content.indexOf('const isCompactMode = request.output_format?.includes');
if (defIdx >= 0) {
  const endIdx = content.indexOf(';', defIdx + 150);
  const extractedCode = content.substring(defIdx, endIdx + 2);
  console.log('Extracted isCompactMode code:');
  console.log(extractedCode);
  
  // Now create the clean mode processing code using the actual variable definition
  const cleanModeProcessing = "    let unifiedContent = conceptBlocks\n" +
                              "      .map(b => b.content)\n" +
                              "      .filter(Boolean)\n" +
                              "      .join('\\n\\n');\n" +
                              "\n" +
                              "    // Clean Mode: Strip artifacts and truncate to max length (for small model context windows)\n" +
                              extractedCode.trim() + "\n" +
                              "        const MAX_CONTENT_LENGTH = 500;\n" +
                              "        \n" +
                              "        // Strip artifacts using compiled patterns for speed\n" +
                              "        for (const pattern of COMPILED_PATTERNS) {\n" +
                              "          unifiedContent = unifiedContent.replace(pattern, '[REDACTED]');\n" +
                              "        }\n" +
                              "        \n" +
                              "        // Truncate if too long with ellipsis marker\n" +
                              "        if (unifiedContent.length > MAX_CONTENT_LENGTH) {\n" +
                              "          unifiedContent = unifiedContent.substring(0, MAX_CONTENT_LENGTH - 3) + '...';\n" +
                              "        }";
  
  const newCode = "    // Build unified content from all blocks - OPTIMIZED for clean mode\n" +
                  cleanModeProcessing;
  
  const unifyIdx = content.indexOf('// Build unified content from all blocks');
  if (unifyIdx > defIdx) {
    const afterUnify = content.substring(unifyIdx);
    const joinEndIdx = afterUnify.indexOf('.join(\'\\n\\n\');') + afterUnify.indexOf('\n\n', afterUnify.indexOf('const unifiedContent')) + 2;
    
    // Find where to insert the clean mode code - right after .join('\n\n');
    const joinAbsoluteIdx = unifyIdx + afterUnify.indexOf('.join(\'\\n\\n\');') + 10;
    
    if (joinAbsoluteIdx > unifyIdx) {
      const before = content.substring(0, joinAbsoluteIdx);
      const after = content.substring(joinAbsoluteIdx + 20); // Skip past .join('\n\n');
      
      writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', before + newCode + after);
      console.log('\n=== CLEAN MODE CODE APPLIED ===');
    } else {
      console.log('Could not find join absolute index');
    }
  } else {
    console.log('Unified content marker is before isCompactMode definition - need different approach');
  }
} else {
  console.log('Could not find isCompactMode definition');
}

console.log('\nDone!');