/**
 * Sample Corpus Generator for Reproducible Benchmarks
 * 
 * Generates a deterministic dataset of 200 documents with timestamps and tags.
 * Uses a fixed seed for reproducibility across machines.
 * 
 * Run with: node benchmarks/sample-corpus-generator.js --seed 42 --output benchmarks/sample_corpus.jsonl
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Seeded random number generator for reproducibility
class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick(array) {
    return array[this.nextInt(0, array.length - 1)];
  }
}

// Sample data templates
const TOPICS = [
  'artificial intelligence', 'machine learning', 'neural networks',
  'context retrieval', 'semantic search', 'knowledge graphs',
  'natural language processing', 'vector embeddings', 'similarity search',
  'data structures', 'algorithms', 'software architecture',
  'database systems', 'distributed systems', 'cloud computing',
  'cybersecurity', 'encryption', 'privacy',
  'user experience', 'interface design', 'human-computer interaction'
];

const TAGS = [
  '#research', '#technical', '#meeting', '#notes', '#ideas',
  '#code', '#documentation', '#design', '#architecture', '#ai',
  '#ml', '#nlp', '#database', '#security', '#ux'
];

const DOCUMENT_TYPES = [
  'meeting-notes', 'research-paper', 'code-snippet',
  'design-doc', 'tutorial', 'bug-report',
  'feature-request', 'analysis', 'review'
];

const PEOPLE = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve',
  'Frank', 'Grace', 'Henry', 'Iris', 'Jack'
];

function generateDocument(rng, id) {
  const topic = rng.pick(TOPICS);
  const type = rng.pick(DOCUMENT_TYPES);
  const numTags = rng.nextInt(2, 5);
  const numPeople = rng.nextInt(0, 3);
  
  // Generate timestamp (spread over 6 months)
  const baseTime = 1700000000000; // Nov 2023
  const timeRange = 180 * 24 * 60 * 60 * 1000; // 180 days in ms
  const timestamp = baseTime + rng.nextInt(0, timeRange);
  
  // Select tags
  const tags = [];
  for (let i = 0; i < numTags; i++) {
    const tag = rng.pick(TAGS);
    if (!tags.includes(tag)) tags.push(tag);
  }
  
  // Generate content
  const people = [];
  for (let i = 0; i < numPeople; i++) {
    const person = rng.pick(PEOPLE);
    if (!people.includes(person)) people.push(person);
  }
  
  const contentTemplates = [
    `Discussion about ${topic} with ${people.join(', ')}. Key points covered: implementation strategy, performance considerations, and next steps.`,
    `Research notes on ${topic}. Important findings include novel approaches to optimization and potential applications in production systems.`,
    `Code review for ${topic} module. Suggested improvements: better error handling, optimized algorithms, and comprehensive test coverage.`,
    `Design document for ${topic} feature. Architecture decisions: microservices approach, RESTful API design, and database schema updates.`,
    `Analysis of ${topic} trends. Market research shows growing demand and competitive landscape analysis. Recommendations for strategic positioning.`,
    `Tutorial on ${topic}. Step-by-step guide covers installation, configuration, basic usage, and advanced techniques.`,
    `Bug report: ${topic} module crashes under high load. Root cause: memory leak in caching layer. Fix: implement proper resource cleanup.`,
    `Feature request: enhance ${topic} capabilities. User feedback indicates need for better integration with existing tools and workflows.`,
    `Meeting summary: ${topic} roadmap planning. Q1 priorities include performance optimization, user experience improvements, and documentation updates.`,
    `Technical review of ${topic} implementation. Strengths: clean architecture, good test coverage. Areas for improvement: error messages, logging.`
  ];
  
  const content = rng.pick(contentTemplates);
  
  return {
    id: `doc-${String(id).padStart(4, '0')}`,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${topic}`,
    text: content,
    tags: tags,
    timestamp: timestamp,
    type: type,
    people: people
  };
}

function generateCorpus(numDocuments = 200, seed = 42) {
  const rng = new SeededRandom(seed);
  const documents = [];
  
  for (let i = 1; i <= numDocuments; i++) {
    documents.push(generateDocument(rng, i));
  }
  
  return documents;
}

function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let seed = 42;
  let numDocuments = 200;
  let outputFile = join(__dirname, 'sample_corpus.jsonl');
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed' && args[i + 1]) {
      seed = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    } else if (args[i] === '--count' && args[i + 1]) {
      numDocuments = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  console.log(`Generating sample corpus...`);
  console.log(`  Seed: ${seed}`);
  console.log(`  Documents: ${numDocuments}`);
  console.log(`  Output: ${outputFile}`);
  
  const documents = generateCorpus(numDocuments, seed);
  
  // Write as JSONL (one JSON object per line)
  const jsonl = documents.map(doc => JSON.stringify(doc)).join('\n');
  writeFileSync(outputFile, jsonl, 'utf-8');
  
  // Also write summary statistics
  const stats = {
    totalDocuments: documents.length,
    uniqueTags: [...new Set(documents.flatMap(d => d.tags))].length,
    uniqueTopics: [...new Set(documents.map(d => d.title.split(': ')[1]))].length,
    dateRange: {
      start: new Date(Math.min(...documents.map(d => d.timestamp))).toISOString(),
      end: new Date(Math.max(...documents.map(d => d.timestamp))).toISOString()
    },
    seed: seed
  };
  
  const statsFile = outputFile.replace('.jsonl', '_stats.json');
  writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf-8');
  
  console.log(`\n✅ Corpus generated successfully!`);
  console.log(`  Unique tags: ${stats.uniqueTags}`);
  console.log(`  Unique topics: ${stats.uniqueTopics}`);
  console.log(`  Date range: ${stats.dateRange.start} to ${stats.dateRange.end}`);
  console.log(`\nStats saved to: ${statsFile}`);
}

main();
