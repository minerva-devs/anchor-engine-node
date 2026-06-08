import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/distillation/radial-distiller-v2.ts', 'utf8');

// The correct block template that should replace all broken versions
const correctBlock = `        currentBlock = {
          id: \\\`block-\${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}\\\`,
          type: level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3',
          content: trimmed,
          heading: heading,
          level: level,
          source_path: generateRelativePath(row.source_path || row.provenance || 'unknown'),
          provenance: [generateRelativePath(row.source_path || row.provenance || 'unknown')],
          mtime: row.timestamp * 1000,
          simhash: computeSimHash(trimmed),
          tags: extractTags(trimmed),
        };`;

const correctBlockNoHeading = `        currentBlock = {
          id: \\\`block-\${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}\\\`,
          type: 'problem' | 'solution' | 'rationale' | 'status' | 'content',
          content: trimmed,
          heading: undefined,
          level: 1,
          source_path: generateRelativePath(row.source_path || row.provenance || 'unknown'),
          provenance: [generateRelativePath(row.source_path || row.provenance || 'unknown')],
          mtime: row.timestamp * 1000,
          simhash: computeSimHash(trimmed),
          tags: extractTags(trimmed),
        };`;

// Find and replace ALL occurrences of the broken pattern with correct code
// Pattern to find: currentBlock = { ... source_path: generateRelativePath(...,, provenance: [...] ... mtime: ...,, simhash: ..., tags: ... };

const patternsToFix = [
  // Heading blocks (with heading field)
  /currentBlock\s*=\s*\{[\s\S]*?type:\s*(level\s*[^\,]+,\)?[\s\S]*?\},\s*\n\s*heading:\s*heading,?[\s\S]*?simhash: computeSimHash\(trimmed\),?[\s\S]*?tags: extractTags\(trimmed\),?\s*\};/g,
  // Non-heading blocks (with undefined heading)  
  /type:\s*'problem'/g, 'type: "problem" | "solution" | "rationale" | "status" | "content"',
];

// Fix the mtime double comma issue first
content = content.replace(/mtime:\s*row\.timestamp\s*\*\s*1000,,,/g, 'mtime: row.timestamp * 1000,');
content = content.replace(/simhash:\s*computeSimHash\(trimmed\),,/g, 'simhash: computeSimHash(trimmed),');

// Now add clean mode processing to assembleDecisionRecords
const isCompactModeCheck = /const\s+isCompactMode\s*=\s*request\?\.output_format\?\.includes/g;
if (!isCompactModeCheck.test(content)) {
  const insertPattern = /\/\/ Build unified content from all blocks - OPTIMIZED for clean mode[\s\S]{0,300}/;
  if (insertPattern.test(content)) {
    content = content.replace(insertPattern, match => 
      match + '\n' +
      "    // Clean Mode: Process unified content for compact output\n" +
      "    const isCompactMode = request?.output_format?.includes('compact') || \n" +
      "                         request?.output_format === 'decision-records-compact';\n" +
      "\n" +
      "    if (isCompactMode) {\n" +
      "      const MAX_CONTENT_LENGTH = parseInt(process.env.CLEAN_MAX_CHARS, 10) || 500;\n" +
      "      \n" +
      "      let processedContent = conceptBlocks\n" +
      "        .map(b => b.content)\n" +
      "        .filter(Boolean)\n" +
      "        .join('\\n\\n');\n" +
      "      \n" +
      "      // Strip artifacts using compiled patterns for speed\n" +
      "      for (const pattern of COMPILED_PATTERNS) {\n" +
      "        processedContent = processedContent.replace(pattern, '[REDACTED]');\n" +
      "      }\n" +
      "      \n" +
      "      // Truncate if too long with ellipsis marker\n" +
      "      if (processedContent.length > MAX_CONTENT_LENGTH) {\n" +
      "        processedContent = processedContent.substring(0, MAX_CONTENT_LENGTH - 3) + '...';\n" +
      "      }\n" +
      "      \n" +
      "      unifiedContent = processedContent;\n" +
      "    }";
  }
}

writeFileSync('engine/src/services/distillation/radial-distiller-v2.ts', content);
console.log('Applied block rewrite fixes');