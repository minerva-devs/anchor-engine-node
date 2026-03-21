#!/usr/bin/env node

/**
 * Qwen 3.5 2B Orchestrator for Bolt Memory
 * 
 * This script orchestrates tasks between:
 * - Qwen 3.5 2B (llama.cpp) for reasoning and task planning
 * - Bolt Memory (Anchor Engine on port 3161) for persistent context
 * 
 * Usage:
 *   node orchestrator.js "your task or query"
 *   node orchestrator.js --chat    # Interactive chat mode
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Qwen 3.5 2B settings
  modelPath: '/data/data/com.termux/files/home/models/qwen3.5-2b-instruct-q4_k_m.gguf',
  llamaServer: '/data/data/com.termux/files/usr/bin/llama-server',
  llamaPort: 8080,
  llamaContext: 8192,
  llamaGPULayers: 0, // CPU-only on Termux
  
  // Bolt Memory settings
  boltMemoryUrl: 'http://localhost:3161',
  apiKey: 'bolt-memory-secret',
  
  // Orchestrator settings
  tempDir: path.join(__dirname, 'orchestrator-temp'),
  maxTokens: 2048,
  temperature: 0.7,
};

// Ensure temp directory exists
if (!fs.existsSync(CONFIG.tempDir)) {
  fs.mkdirSync(CONFIG.tempDir, { recursive: true });
}

class Orchestrator {
  constructor() {
    this.serverProcess = null;
    this.sessionId = `session-${Date.now()}`;
    this.context = [];
  }

  /**
   * Start llama.cpp server
   */
  async startServer() {
    console.log('🚀 Starting Qwen 3.5 2B server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn(CONFIG.llamaServer, [
        '-m', CONFIG.modelPath,
        '-p', CONFIG.llamaPort.toString(),
        '-c', CONFIG.llamaContext.toString(),
        '-t', '4', // 4 threads
        '--host', '127.0.0.1',
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('HTTP server listening')) {
          console.log('✅ Qwen 3.5 2B server ready');
          resolve(true);
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);
    });
  }

  /**
   * Stop llama.cpp server
   */
  async stopServer() {
    if (this.serverProcess) {
      console.log('🛑 Stopping Qwen server...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }

  /**
   * Query Qwen 3.5 2B
   */
  async queryQwen(prompt, systemPrompt = '') {
    const url = `http://localhost:${CONFIG.llamaPort}/completion`;
    
    const fullPrompt = systemPrompt 
      ? `<|system|>\n${systemPrompt}</s>\n<|user|>\n${prompt}</s>\n<|assistant|>\n`
      : `<|user|>\n${prompt}</s>\n<|assistant|>\n`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          n_predict: CONFIG.maxTokens,
          temperature: CONFIG.temperature,
          stop: ['</s>', '<|user|>', '<|system|>'],
        }),
      });

      const data = await response.json();
      return data.content || data.stop || '';
    } catch (error) {
      console.error('Qwen query error:', error.message);
      return null;
    }
  }

  /**
   * Search Bolt Memory
   */
  async searchMemory(query, tokenBudget = 2000) {
    try {
      const response = await fetch(`${CONFIG.boltMemoryUrl}/v1/memory/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          query,
          token_budget: tokenBudget,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Memory search error:', error.message);
      return [];
    }
  }

  /**
   * Save to Bolt Memory
   */
  async saveToMemory(content, source, type = 'text') {
    try {
      const response = await fetch(`${CONFIG.boltMemoryUrl}/v1/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          content,
          source: source || this.sessionId,
          type,
          buckets: ['orchestrator'],
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Memory save error:', error.message);
      return null;
    }
  }

  /**
   * Create checkpoint distillation
   */
  async createCheckpoint(query = 'orchestrator session decisions') {
    try {
      const response = await fetch(`${CONFIG.boltMemoryUrl}/v1/memory/distill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          seed: { query, buckets: ['orchestrator'] },
          radius: 2,
          output_format: 'json',
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Checkpoint error:', error.message);
      return null;
    }
  }

  /**
   * Main orchestration flow
   */
  async orchestrate(task) {
    console.log(`\n🎯 Task: ${task}\n`);

    // Step 1: Search memory for relevant context
    console.log('🔍 Searching memory for context...');
    const context = await this.searchMemory(task);
    
    let contextText = '';
    if (context.length > 0) {
      contextText = `\n\nRelevant context from memory:\n${context.map(r => `- ${r.content?.substring(0, 200)}`).join('\n')}`;
      console.log(`   Found ${context.length} relevant items`);
    } else {
      console.log('   No relevant context found');
    }

    // Step 2: Ask Qwen to plan/execute
    console.log('🤔 Consulting Qwen 3.5 2B...');
    const systemPrompt = `You are an AI orchestrator. You help break down tasks, make decisions, and track progress. Be concise and practical.`;
    
    const prompt = `Task: ${task}${contextText}\n\nPlease provide:\n1. Analysis of the task\n2. Step-by-step plan\n3. Any decisions or recommendations`;
    
    const response = await this.queryQwen(prompt, systemPrompt);
    
    if (response) {
      console.log('\n💡 Qwen Response:');
      console.log(response);
      
      // Step 3: Save decision to memory
      console.log('\n💾 Saving to memory...');
      await this.saveToMemory(
        `Task: ${task}\n\nResponse: ${response}`,
        this.sessionId,
        'orchestrator_decision'
      );
      console.log('   ✓ Saved');
    }

    return response;
  }

  /**
   * Interactive chat mode
   */
  async chatMode() {
    console.log('\n💬 Interactive Chat Mode (type "exit" to quit)\n');
    
    while (true) {
      const input = await new Promise((resolve) => {
        process.stdout.write('You: ');
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim());
        });
      });

      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        break;
      }

      if (!input) continue;

      await this.orchestrate(input);
      console.log('');
    }
  }
}

// Main execution
async function main() {
  const orchestrator = new Orchestrator();
  
  try {
    // Start server
    await orchestrator.startServer();
    
    // Check if interactive mode or single task
    const args = process.argv.slice(2);
    
    if (args.includes('--chat') || args.includes('-i')) {
      // Interactive mode
      await orchestrator.chatMode();
    } else if (args.length > 0) {
      // Single task
      const task = args.join(' ');
      await orchestrator.orchestrate(task);
    } else {
      console.log('Usage:');
      console.log('  node orchestrator.js "your task"');
      console.log('  node orchestrator.js --chat  # Interactive mode');
    }
    
  } catch (error) {
    console.error('Orchestrator error:', error.message);
    process.exit(1);
  } finally {
    await orchestrator.stopServer();
  }
}

main();
