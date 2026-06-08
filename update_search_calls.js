import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('engine/src/services/search/search.ts', 'utf8');

// Pattern to match executeSearch calls that are missing mode parameter
const fixes = [
  {
    old: /executeSearch\(query,\s*buckets,\s*maxChars,\s*provenance,\s*tags,\s*undefined,\s*useMaxRecall,\s*userContext\)/g,
    new: 'executeSearch(query, buckets, maxChars, provenance, tags, undefined, useMaxRecall, userContext, mode)'
  },
  {
    old: /executeSearch\(strictQuery,\s*buckets,\s*maxChars,\s*provenance,\s*tags,\s*undefined,\s*false,\s*userContext\)/g,
    new: 'executeSearch(strictQuery, buckets, maxChars, provenance, tags, undefined, false, userContext, mode)'
  },
  {
    old: /executeSearch\(entityQuery,\s*buckets,\s*maxChars,\s*provenance,\s*tags,\s*undefined,\s*false,\s*userContext\)/g,
    new: 'executeSearch(entityQuery, buckets, maxChars, provenance, tags, undefined, false, userContext, mode)'
  }
];

fixes.forEach(({ old, new: newText }) => {
  content = content.toString().replace(old, newText);
});

writeFileSync('engine/src/services/search/search.ts', content);
console.log('Updated executeSearch calls with mode parameter');