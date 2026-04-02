#!/usr/bin/env node

/**
 * Batch ingest chat files from .qwen/chats into Anchor Engine
 * Reads .md files and ingests them via the API in batches
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Configuration
const CHAT_SOURCE_DIR = 'C:\\Users\\rsbiiw\\.qwen\\chats';
const API_URL = 'http://localhost:3160';
const API_KEY = 'anchor-engine-default-key';
const BATCH_SIZE = 2; // Process 2 files at a time (rate limit is 10/min)
const DELAY_MS = 12000; // 12 second delay between batches (60s / 10 = 6s per request buffer)
const MAX_RETRIES = 3;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function ingestFile(filePath, bucket = 'inbox', retryCount = 0) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    
    const response = await api.post('/v1/ingest', {
      content,
      filename,
      bucket
    });
    
    return {
      success: true,
      filename,
      atoms: response.data.atoms || 0,
      molecules: response.data.molecules || 0
    };
  } catch (error) {
    // Handle rate limiting with retry
    if (error.response?.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = error.response.data?.retryAfter || 60;
      console.log(`    ⏳ Rate limited, waiting ${retryAfter}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return ingestFile(filePath, bucket, retryCount + 1);
    }
    
    return {
      success: false,
      filename: path.basename(filePath),
      error: error.message,
      retryCount
    };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Batch Chat Ingestion Script');
  console.log('='.repeat(60));
  console.log(`Source: ${CHAT_SOURCE_DIR}`);
  console.log(`API: ${API_URL}`);
  console.log('');
  
  // Get all subdirectories
  const subdirs = fs.readdirSync(CHAT_SOURCE_DIR).filter(item => {
    const itemPath = path.join(CHAT_SOURCE_DIR, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  let totalFiles = 0;
  let totalSuccess = 0;
  let totalFail = 0;
  let totalAtoms = 0;
  let totalMolecules = 0;
  
  for (const subdir of subdirs) {
    const sourceDir = path.join(CHAT_SOURCE_DIR, subdir);
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
    
    console.log(`\nProcessing ${subdir}/ (${files.length} files):`);
    
    // Process in batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);
      
      console.log(`  Batch ${batchNum}/${totalBatches}...`);
      
      const results = await Promise.all(
        batch.map(file => ingestFile(path.join(sourceDir, file)))
      );
      
      results.forEach(result => {
        totalFiles++;
        if (result.success) {
          totalSuccess++;
          totalAtoms += result.atoms;
          totalMolecules += result.molecules;
        } else {
          totalFail++;
          console.log(`    ✗ ${result.filename}: ${result.error}`);
        }
      });
      
      // Delay between batches
      if (i + BATCH_SIZE < files.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Ingestion Summary:');
  console.log(`  Total files processed: ${totalFiles}`);
  console.log(`  Successful: ${totalSuccess}`);
  console.log(`  Failed: ${totalFail}`);
  console.log(`  Total atoms created: ${totalAtoms}`);
  console.log(`  Total molecules created: ${totalMolecules}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('✅ Batch ingestion complete!');
  console.log('Use anchor_query to search your chat memory.');
}

main().catch(console.error);
