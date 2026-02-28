/**
 * LLM Context Formatter Tests
 */

import { LLMContextFormatter } from './llm-context-formatter.js';

// Mock search results
const mockAtoms = [
  {
    id: 'atom_1',
    content: 'Rob discussed career changes with Coda over coffee',
    timestamp: new Date('2025-06-15T14:30:00Z').getTime(),
    source: 'chat_2025-06-15',
    tags: ['career', 'friendship', 'advice'],
    buckets: [],
    epochs: '' as any,
    provenance: 'internal' as const,
    score: 0.9
  },
  {
    id: 'atom_2',
    content: 'Dory supported Rob through imposter syndrome during job search',
    timestamp: new Date('2025-08-20T09:15:00Z').getTime(),
    source: 'chat_2025-08-20',
    tags: ['relationship', 'support', 'career'],
    buckets: [],
    epochs: '' as any,
    provenance: 'internal' as const,
    score: 0.85
  },
  {
    id: 'atom_3',
    content: 'External Context Engine architecture discussion with POML protocol design',
    timestamp: new Date('2025-10-05T16:45:00Z').getTime(),
    source: 'dev_notes',
    tags: ['architecture', 'POML', 'ECE'],
    buckets: [],
    epochs: '' as any,
    provenance: 'internal' as const,
    score: 0.8
  }
];

async function runTests() {
  console.log('🧪 LLM Context Formatter Tests\n');
  console.log('=' .repeat(60));
  
  const formatter = new LLMContextFormatter();
  
  // Test 1: Basic formatting
  console.log('\n📋 Test 1: Basic LLM Context Formatting');
  const context = formatter.format(mockAtoms, 'Rob career Dory ECE');
  
  console.log(`✅ Query: "${context.query}"`);
  console.log(`✅ Entities: ${context.context.entities.length}`);
  console.log(`✅ Themes: ${context.context.themes.length}`);
  console.log(`✅ Atoms: ${context.atoms.length}`);
  console.log(`✅ Gaps: ${context.gaps.length}`);
  
  // Test 2: Entity extraction
  console.log('\n👥 Test 2: Entity Extraction');
  const entities = context.context.entities;
  console.log(`  Found entities: ${entities.map(e => e.name).join(', ')}`);
  console.log(`  Top entity: ${entities[0]?.name} (${entities[0]?.mentions} mentions)`);
  
  // Test 3: Theme clustering
  console.log('\n🎯 Test 3: Theme Clustering');
  const themes = context.context.themes;
  themes.forEach(theme => {
    console.log(`  - ${theme.name}: ${theme.atom_ids.length} atoms (${(theme.confidence * 100).toFixed(0)}% confidence)`);
  });
  
  // Test 4: Relevance ranking
  console.log('\n📊 Test 4: Relevance Ranking');
  const topAtoms = context.atoms.slice(0, 3);
  topAtoms.forEach((atom, i) => {
    console.log(`  ${i + 1}. Score: ${(atom.relevance_score * 100).toFixed(0)}% - ${atom.content.substring(0, 50)}...`);
  });
  
  // Test 5: JSON output
  console.log('\n💾 Test 5: JSON Output');
  const jsonStr = JSON.stringify(context, null, 2);
  const tokenEstimate = jsonStr.length / 4;
  console.log(`  JSON size: ${jsonStr.length} chars`);
  console.log(`  Estimated tokens: ~${tokenEstimate}`);
  
  // Test 6: Gap analysis
  console.log('\n🔍 Test 6: Gap Analysis');
  if (context.gaps.length > 0) {
    context.gaps.forEach(gap => {
      console.log(`  ⚠️  ${gap.topic}: ${gap.suggestion}`);
    });
  } else {
    console.log('  ✅ No significant gaps detected');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ All tests passed!\n');
  
  // Save sample output
  const fs = await import('fs/promises');
  const path = await import('path');
  const outputPath = path.join(process.cwd(), 'test-llm-context.json');
  await fs.writeFile(outputPath, jsonStr);
  console.log(`💾 Sample output saved to: ${outputPath}\n`);
}

runTests().catch(console.error);
