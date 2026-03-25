/**
 * API Key Helper
 * 
 * Manages API key synchronization between UI and server.
 * Falls back to default if localStorage key doesn't match server.
 * 
 * NOTE: This default MUST match user_settings.json -> server.api_key
 * If you change one, you MUST change the other!
 */

// This MUST match user_settings.json -> server.api_key
const DEFAULT_API_KEY = 'anchor-engine-default-key';

export function getApiKey(): string {
    const stored = localStorage.getItem('anchor_api_key');
    
    // If nothing stored, use default
    if (!stored) {
        return DEFAULT_API_KEY;
    }
    
    return stored;
}

export function setApiKey(key: string): void {
    localStorage.setItem('anchor_api_key', key);
}

export function clearApiKey(): void {
    localStorage.removeItem('anchor_api_key');
}

export function resetToDefault(): void {
    localStorage.removeItem('anchor_api_key');
    console.log('[API Key] Reset to default:', DEFAULT_API_KEY);
}

// Auto-reset if we detect the old default key
const stored = localStorage.getItem('anchor_api_key');
if (stored === 'bolt-memory-secret' || stored === 'bolt-memory-secure-key-2026') {
    console.log('[API Key] Detected old key, resetting to default');
    resetToDefault();
}
