#!/usr/bin/env node

/**
 * Model-Agnostic Orchestrator for Bolt Memory
 * 
 * Supports multiple LLM backends:
 * - llama.cpp (local GGUF models)
 * - Ollama
 * - LM Studio
 * - OpenAI-compatible APIs
 * 
 * Usage:
 *   node orchestrator-v2.js "your task"
 *   node orchestrator-v2.js --chat
 *   node orchestrator-v2.js --config  # Edit configuration
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const CONFIG_PATH = path.join(__dirname, 'orchestrator-config.json');
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

class LLMProvider {
  constructor(config) {
    this.config = config;
    this.serverProcess = null;
  }

  async start() {
    // Override in subclass
  }

  async stop() {
    // Override in subclass
  }

  async complete(prompt, systemPrompt = '') {
    // Override in subclass
    throw new Error('Not implemented');
  }
}

class LlamaCppProvider extends LLMProvider {
  async start() {
    const provider = this.config.providers.llama_cpp;
    const model = provider.models.find(m => m.default) || provider.models[0];
    
    if (!model || !model.path) {
      throw new Error('No model configured for llama.cpp');
    }

    console.log(`🚀 Starting llama.cpp server with ${model.name}...`);
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn(provider.server_binary, [
        '-m', model.path,
        '-p', provider.default_port.toString(),
        '-c', model.context_size.toString(),
        '-t', provider.settings.threads.toString(),
        '--host', '127.0.0.1',
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('HTTP server listening')) {
          console.log('✅ LLM server ready');
          resolve(true);
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      setTimeout(() => reject(new Error('Server startup timeout')), 30000);
    });
  }

  async stop() {
    if (this.serverProcess) {
      console.log('🛑 Stopping LLM server...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }

  async complete(prompt, systemPrompt = '') {
    const provider = this.config.providers.llama_cpp;
    const url = `http://localhost:${provider.default_port}/completion`;
    
    const fullPrompt = systemPrompt 
      ? `<|system|>\n${systemPrompt}</s>\n<|user|>\n${prompt}</s>\n<|assistant|>\n`
      : `<|user|>\n${prompt}</s>\n<|assistant|>\n`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          n_predict: provider.settings.max_tokens,
          temperature: provider.settings.temperature,
          stop: ['</s>', '<|user|>', '<|system|>'],
        }),
      });

      const data = await response.json();
      return data.content || data.stop || '';
    } catch (error) {
      console.error('LLM query error:', error.message);
      return null;
    }
  }
}

class OllamaProvider extends LLMProvider {
  async complete(prompt, systemPrompt = '') {
    const provider = this.config.providers.ollama;
    const url = `${provider.base_url}${provider.api_endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.models[0]?.name || 'qwen2.5:0.5b',
          prompt: prompt,
          system: systemPrompt,
          stream: false,
          options: {
            temperature: provider.settings.temperature,
            num_predict: provider.settings.max_tokens,
          }
        }),
      });

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error('Ollama error:', error.message);
      return null;
    }
  }
}

class LMStudioProvider extends LLMProvider {
  async complete(prompt, systemPrompt = '') {
    const provider = this.config.providers.lm_studio;
    const url = `${provider.base_url}${provider.api_endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.models[0]?.name || 'local-model',
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          max_tokens: provider.settings.max_tokens,
          temperature: provider.settings.temperature,
          stream: false,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.text || '';
    } catch (error) {
      console.error('LM Studio error:', error.message);
      return null;
    }
  }
}

class OpenAIProvider extends LLMProvider {
  async complete(prompt, systemPrompt = '') {
    const provider = this.config.providers.openai_compatible;
    const url = `${provider.base_url}${provider.api_endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.api_key}`,
        },
        body: JSON.stringify({
          model: provider.models[0]?.name || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: provider.settings.max_tokens,
          temperature: provider.settings.temperature,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error.message);
      return null;
    }
  }
}

class BoltMemoryClient {
  constructor(config) {
    this.url = config.bolt_memory.url;
    this.apiKey = config.bolt_memory.api_key;
  }

  async search(query, tokenBudget = 2000) {
    try {
      const response = await fetch(`${this.url}/v1/memory/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ query, token_budget: tokenBudget }),
      });

      if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Memory search error:', error.message);
      return [];
    }
  }

  async save(content, source, type = 'text') {
    try {
      const response = await fetch(`${this.url}/v1/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ content, source, type, buckets: ['orchestrator'] }),
      });
      return await response.json();
    } catch (error) {
      console.error('Memory save error:', error.message);
      return null;
    }
  }

  async distill(query = 'orchestrator session') {
    try {
      const response = await fetch(`${this.url}/v1/memory/distill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          seed: { query, buckets: ['orchestrator'] },
          radius: 2,
          output_format: 'json',
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Distill error:', error.message);
      return null;
    }
  }
}

class Orchestrator {
  constructor(config) {
    this.config = config;
    this.provider = null;
    this.memory = new BoltMemoryClient(config);
    this.sessionId = `session-${Date.now()}`;
  }

  async init(providerName = this.config.orchestrator.default_provider) {
    console.log(`🔧 Initializing ${providerName} provider...`);
    
    switch (providerName) {
      case 'llama_cpp':
        this.provider = new LlamaCppProvider(this.config);
        break;
      case 'ollama':
        this.provider = new OllamaProvider(this.config);
        break;
      case 'lm_studio':
        this.provider = new LMStudioProvider(this.config);
        break;
      case 'openai_compatible':
        this.provider = new OpenAIProvider(this.config);
        break;
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }

    await this.provider.start();
  }

  async orchestrate(task, systemPromptKey = 'orchestrator') {
    console.log(`\n🎯 Task: ${task}\n`);

    // Search memory if enabled
    let contextText = '';
    if (this.config.orchestrator.bolt_memory.auto_search) {
      console.log('🔍 Searching memory for context...');
      const context = await this.memory.search(task);
      
      if (context.length > 0) {
        contextText = `\n\nRelevant context from memory:\n${context.map(r => `- ${r.content?.substring(0, 200)}`).join('\n')}`;
        console.log(`   Found ${context.length} relevant items`);
      } else {
        console.log('   No relevant context found');
      }
    }

    // Query LLM
    console.log('🤔 Consulting LLM...');
    const systemPrompt = this.config.orchestrator.system_prompts[systemPromptKey] || '';
    const prompt = `Task: ${task}${contextText}\n\nPlease provide:\n1. Analysis of the task\n2. Step-by-step plan\n3. Any decisions or recommendations`;
    
    const response = await this.provider.complete(prompt, systemPrompt);
    
    if (response) {
      console.log('\n💡 LLM Response:');
      console.log(response);
      
      // Save to memory if enabled
      if (this.config.orchestrator.bolt_memory.auto_save) {
        console.log('\n💾 Saving to memory...');
        await this.memory.save(
          `Task: ${task}\n\nResponse: ${response}`,
          this.sessionId,
          'orchestrator_decision'
        );
        console.log('   ✓ Saved');
      }
    }

    return response;
  }

  async chatMode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n💬 Interactive Chat Mode (type "exit" to quit)\n');

    const ask = () => new Promise((resolve) => {
      process.stdout.write('You: ');
      rl.on('line', (line) => {
        rl.removeAllListeners('line');
        resolve(line);
      });
    });

    while (true) {
      const input = await ask();
      
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        break;
      }

      if (!input) continue;

      await this.orchestrate(input);
      console.log('');
    }

    rl.close();
  }

  async shutdown() {
    if (this.config.orchestrator.bolt_memory.checkpoint_on_complete) {
      console.log('\n📸 Creating checkpoint...');
      await this.memory.distill(this.sessionId);
      console.log('   ✓ Checkpoint created');
    }
    
    await this.provider.stop();
  }
}

// Main execution
async function main() {
  const orchestrator = new Orchestrator(CONFIG);
  
  try {
    const args = process.argv.slice(2);
    
    // Parse arguments
    const providerArg = args.find(a => a.startsWith('--provider='));
    const provider = providerArg ? providerArg.split('=')[1] : undefined;
    
    await orchestrator.init(provider);
    
    if (args.includes('--chat') || args.includes('-i') || args.length === 0) {
      await orchestrator.chatMode();
    } else {
      const task = args.filter(a => !a.startsWith('--')).join(' ');
      await orchestrator.orchestrate(task);
    }
    
  } catch (error) {
    console.error('Orchestrator error:', error.message);
    process.exit(1);
  } finally {
    await orchestrator.shutdown();
  }
}

main();
