/**
 * Model Verifier Service Tests
 *
 * Updated to use simple queue-based mocking instead of vi.mock() patterns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyModel, getDeviceInfo } from './model-verifier';

/**
 * Simple mock helper for queue-based once resolution support.
 * Provides the same functionality as engine/src/test-utils/mock-helper.ts
 * but inline for package-isolated testing.
 */
class MockHelper {
  private _queue: Array<{ type: 'resolve' | 'reject'; value: unknown }> = [];
  private _customImpl?: Function;
n
  mockResolvedValueOnce(value: any): this {
    this._queue.push({ type: 'resolve', value });
    return this;
  }
n
  mockRejectedValueOnce(error: any): this {
    this._queue.push({ type: 'reject', value: error });
    return this;
  }
n
  mockImplementation(impl: Function): this {
    this._customImpl = impl;
    return this;
  }
n
  clearQueue(): void {
    this._queue.splice(0);
  }
n
  apply(fn: Function): (...args: any[]) => Promise<unknown> | unknown {
    const _fn = fn;
n    
    return async (...args: any[]): Promise<any> => {
      if (this._customImpl) {
        return this._customImpl(...args);
      }
n      
      if (this._queue.length > 0) {
        const nextItem = this._queue.shift();
        if (nextItem) {
          return nextItem.type === 'resolve'
            ? Promise.resolve(nextItem.value)
            : Promise.reject(nextItem.value);
        }
      }
n      
      return _fn.apply(this, args);
    };
  }
}
n
/**
 * Mock fetch helper for test isolation.
 */
class FetchMock {
  private _queue: Array<{ type: 'resolve' | 'reject'; value: unknown }> = [];
n
  mockResolvedValueOnce(value: any): this {
    this._queue.push({ type: 'resolve', value });
    return this;
  }
n
  mockRejectedValueOnce(error: any): this {
    this._queue.push({ type: 'reject', value: error });
    return this;
  }
n
  clearQueue(): void {
    this._queue.splice(0);
  }
n
  async call(url: string, options?: RequestInit): Promise<Response> {
    if (this._queue.length > 0) {
      const item = this._queue.shift();
      if (item && item.type === 'resolve') {
        // Convert plain object to Response-like object
        const responseObj = item.value as { ok?: boolean; json?: any };
        return new Response(responseObj.ok ? '{}' : '', { status: responseObj.ok ? 200 : 404 });
      }
    }
    throw new Error('No mock value set for fetch');
  }
}
n
/**
 * Helper to replace global.fetch with a mocked version.
 */
let originalFetch: typeof fetch | undefined;
let _fetchMock: FetchMock | null = null;
nfunction setupFetchMock(): FetchMock {
  if (!_fetchMock) {
    _fetchMock = new FetchMock();
  }
  return _fetchMock;
n}
nfunction restoreOriginalFetch() {
  if (originalFetch) {
    global.fetch = originalFetch;
  } else {
    delete (global as any).fetch;
  }
}
describe('Model Verifier Service', () => {\n    let originalGpu: any;
n    beforeEach(() => {
        originalGpu = (navigator as any).gpu;
n        // Setup fetch mock for each test
        setupFetchMock().clearQueue();
n        Object.defineProperty(global, 'fetch', { value: setupFetchMock().call.bind(setupFetchMock()), writable: true, configurable: true });
    });
n    afterEach(() => {
        restoreOriginalFetch();
n      Object.defineProperty(navigator, 'gpu', {
            value: originalGpu,
            writable: true,
            configurable: true,
n          });
n  });
n    const mockGpu = (adapter: any | null = {}, throwError = false) => {
n        Object.defineProperty(navigator, 'gpu', {
            value: {
                requestAdapter: () => {
n                    if (throwError) {
                        return Promise.reject(new Error('GPU request failed'));
                    }
                    return Promise.resolve(adapter);
n                  },
            },
            writable: true,
            configurable: true,
n          });
n      }; 
n    const removeGpu = () => {
        Object.defineProperty(navigator, 'gpu', {
            value: undefined,
            writable: true,
            configurable: true,
n          });
n      };
n    describe('getDeviceInfo', () => {\n        it('returns "WebGPU not supported" when navigator.gpu is undefined', async () => {
            removeGpu();
n            const info = await getDeviceInfo();
            expect(info).toEqual({
                gpu_name: "WebGPU not supported",
                vram_estimate_MB: 0,
                is_integrated: false
            });
n        }); 
n        it('returns "No GPU adapter found" when adapter is null', async () => {
n            mockGpu(null);
            const info = await getDeviceInfo();
            expect(info).toEqual({
                gpu_name: "No GPU adapter found",
                vram_estimate_MB: 0,
                is_integrated: false
            });
n        }); 
n        it('estimates 2048MB VRAM for integrated GPU', async () => {
n            mockGpu({
                info: {
                    device: 'Intel(R) UHD Graphics',
                    architecture: 'integrated',
                }
            });
            const info = await getDeviceInfo();
            expect(info).toEqual({
                gpu_name: 'Intel(R) UHD Graphics',
                vram_estimate_MB: 2048,
                is_integrated: true
            });
n        }); 
n        it('estimates 8192MB VRAM for dedicated GPU', async () => {
n            mockGpu({
                info: {
                    device: 'NVIDIA GeForce RTX 4090',
                    architecture: 'dedicated',
                }
            });
            const info = await getDeviceInfo();
            expect(info).toEqual({
                gpu_name: 'NVIDIA GeForce RTX 4090',
                vram_estimate_MB: 8192,
                is_integrated: false
            });
n        }); 
n        it('handles unknown GPU device name gracefully', async () => {
n            mockGpu({
                info: {
                    architecture: 'dedicated',
                }
            });
            const info = await getDeviceInfo();
            expect(info.gpu_name).toBe('Unknown GPU');
n        }); 
    });
n    describe('verifyModel', () => {
        const mockModel = {
n            model_id: 'test-model',
n            model_lib: 'https://example.com/model',
n            vram_required_MB: 4096,
n          };
n        it('returns not compatible when WebGPU is not supported', async () => {
n            removeGpu();
            const result = await verifyModel(mockModel);
            expect(result.compatible).toBe(false);
            expect(result.error).toContain('WebGPU not supported');
n        }); 
n        it('returns not compatible when requestAdapter fails or returns null', async () => {
n            mockGpu(null);
            const result = await verifyModel(mockModel);
            expect(result.compatible).toBe(false);
            expect(result.error).toContain('Failed to get GPU adapter');
n        }); 
n        it('returns error when requestAdapter throws', async () => {
n            mockGpu(null, true);
            const result = await verifyModel(mockModel);
            expect(result.compatible).toBe(false);
            expect(result.error).toContain('GPU check failed: GPU request failed');
n        }); 
n        it('estimates load time under 60 seconds correctly', async () => {
n            mockGpu({ info: {} });
n            setupFetchMock().mockResolvedValueOnce({ ok: true } as any);
n            // vram_required_MB = 1024 -> estimatedSizeGB = 0.8 -> estimatedLoadSeconds = (0.8 * 1024) / 50 = 16.384
            const result = await verifyModel({ ...mockModel, vram_required_MB: 1024 });
            expect(result.compatible).toBe(true);
            expect(result.estimated_load_time).toBe('16s');
            expect(result.warnings).toHaveLength(0);
n        }); 
n        it('estimates load time over 60 seconds correctly', async () => {
n            mockGpu({ info: {} });
n            setupFetchMock().mockResolvedValueOnce({ ok: true } as any);
n            // vram_required_MB = 8192 -> estimatedSizeGB = 6.4 -> estimatedLoadSeconds = (6.4 * 1024) / 50 = 131.072 (2m 11s)
            const result = await verifyModel({ ...mockModel, vram_required_MB: 8192 });
            expect(result.compatible).toBe(true);
            expect(result.estimated_load_time).toBe('2m 11s');
n        }); 
n        it('adds warning when VRAM requirement with buffer is high', async () => {
n            mockGpu({ info: {} });
n            setupFetchMock().mockResolvedValueOnce({ ok: true } as any);
n            // 8192 * 1.2 = 9830.4 > 8192
            const result = await verifyModel({ ...mockModel, vram_required_MB: 8192 });
            expect(result.warnings).toContain('High VRAM requirement (8192MB). May cause OOM on integrated GPUs.');
n        }); 
n        it('adds warning when model library URL is unreachable', async () => {
n            mockGpu({ info: {} });
n            setupFetchMock().mockResolvedValueOnce({ ok: false } as any);
n            const result = await verifyModel(mockModel);
            expect(result.warnings).toContain('Model library URL may be unreachable. Load may fail.');
n        }); 
n        it('adds warnings when fetch throws an error', async () => {
n            mockGpu({ info: {} });
n            setupFetchMock().mockRejectedValueOnce(new Error('Network error'));
n            const result = await verifyModel(mockModel);
            expect(result.warnings.some(w => w.includes('Could not verify model library URL: Error: Network error'))).toBe(true);
            expect(result.warnings).toContain('Model library URL may be unreachable. Load may fail.');
n        }); 
n        it('uses default vram if not provided', async () => {
n            mockGpu({ info: {} });
n            setupFetchMock().mockResolvedValueOnce({ ok: true } as any);
n            const result = await verifyModel({ model_id: 'test-model', model_lib: 'https://example.com/model' });
            expect(result.vram_required_MB).toBe(4096);
n        }); 
    });
n});