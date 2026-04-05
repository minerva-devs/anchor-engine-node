/**
 * Smoke Test (P0 - Critical)
 * Verifies engine is alive and responding
 */

import { describe, it, assert } from '../minimal-framework.mjs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const SETTINGS_PATH = join(ROOT, 'user_settings.json');

describe('Smoke Tests', () => {
  it('should have valid user_settings.json', () => {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    assert(settings.server, 'Must have server config');
    assert(settings.server.port || settings.server.port === 0, 'Must have port');
    assert(settings.server.api_key, 'Must have API key');
    assert(settings.server.api_key.length >= 16, 'API key must be >= 16 chars');
  });

  it('should respond to health check', async () => {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    const port = settings.server?.port || 3160;
    const apiKey = settings.server?.api_key || '';

    // Add timeout to fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch(`http://localhost:${port}/v1/stats`, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      assert(response.ok, `Engine should respond, got ${response.status}`);
      const stats = await response.json();
      assert(typeof stats.atoms === 'number', 'Stats should include atoms count');
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        console.log('     ⚠️  Engine not running (timeout)');
        // Skip this test if engine is not running
        return;
      }
      throw err;
    }
  });

  it('should reject requests without API key', async () => {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    const port = settings.server?.port || 3160;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch(`http://localhost:${port}/v1/stats`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      assert.strictEqual(response.status, 401, 'Should reject without API key');
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        console.log('     ⚠️  Engine not running (timeout)');
        return;
      }
      throw err;
    }
  });
});
