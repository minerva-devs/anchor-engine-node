/**
 * Custom Mock Utility for vitest@4.x compatibility
 * 
 * Provides queue-based mockResolvedValueOnce and mockRejectedValueOnce support
 * that works seamlessly with vitest's fn() spy system.
 */

import { vi, fn } from 'vitest';

interface QueueableMock<T = unknown> {
  /** Queue a value to be resolved on the next call */
  mockResolvedValueOnce(value: Awaited<T>): this;
  
  /** Queue a value to be rejected on the next call */
  mockRejectedValueOnce(error: unknown): this;
  
  /** Set permanent return value */
  mockReturnValue(value: T): this;
  
  /** Set permanent resolved value for async mocks */
  mockResolvedValue(value: Awaited<T>): this;
  
  /** Get the next queued value and remove it from queue */
  getNextQueuedResult(): { type: 'resolve' | 'reject', value: unknown } | null;
  
  /** Clear all queued values */
  clearQueue(): void;
}

/**
 * Enhanced mock function with queue-based once resolution support.
 * This utility extends vitest's fn() to ensure proper async handling.
 */
function createEnhancedMock<T = unknown>(originalFn?: (args: any[]) => T): QueueableMock<T> {
  const mockQueue: Array<{ type: 'resolve' | 'reject'; value: unknown }> = [];
  
  // Create base mock with vitest.fn()
  const baseMock = fn(originalFn || (() => undefined)) as any;
  
  // Override methods to add queue support
  (baseMock as any).mockResolvedValueOnce = function(value: Awaited<T>) {
    mockQueue.push({ type: 'resolve', value });
    return this;
  };
  
  (baseMock as any).mockRejectedValueOnce = function(error: unknown) {
    mockQueue.push({ type: 'reject', value: error });
    return this;
  };
  
  // Override mockReturnValue to work with queue
  const originalMockReturnValue = baseMock.mockReturnValue;
  (baseMock as any).mockReturnValue = function(value: T) {
    // If there are queued values, use them first
    if (mockQueue.length > 0) {
      return this;
    }
    return originalMockReturnValue.call(this, value);
  };
  
  // Override mockResolvedValue to work with queue  
  const originalMockResolvedValue = baseMock.mockResolvedValue;
  (baseMock as any).mockResolvedValue = function(value: Awaited<T>) {
    if (mockQueue.length > 0) {
      return this;
    }
    return originalMockResolvedValue.call(this, value);
  };
  
  // Add queue management methods
  (baseMock as any).getNextQueuedResult = function() {
    if (mockQueue.length === 0) {
      return null;
    }
    const result = mockQueue.shift();
    return result || null;
  };
  
  (baseMock as any).clearQueue = function() {
    mockQueue.splice(0);
  };
  
  // Enhanced implementation that respects queue
  baseMock.mockImplementation(function(this: unknown, ...args: any[]) {
    const queuedResult = (this as any).getNextQueuedResult();
    if (queuedResult) {
      return queuedResult.type === 'resolve' 
        ? Promise.resolve(queuedResult.value)
        : Promise.reject(queuedResult.value);
    }
    // Fall back to original implementation or undefined
    return baseMock.getMockImplementation() 
      ? baseMock.getMockImplementation()(this, ...args)
      : undefined;
  });
  
  return baseMock as unknown as QueueableMock<T>;
}

/**
 * Create a mock function with default async resolution behavior.
 */
function createAsyncMock<T = unknown>(): QueueableMock<Promise<T>> {
  const mockFn = fn<Awaited<T>>(() => Promise.resolve(undefined as Awaited<T>)) as any;
  
  // Add queue support to async mocks
  mockFn.mockResolvedValueOnce = function(value: T) {
    mockQueue.push({ type: 'resolve', value });
    return this;
  };
  
  mockFn.mockRejectedValueOnce = function(error: unknown) {
    mockQueue.push({ type: 'reject', value: error });
    return this;
  };
  
  const originalMockResolvedValue = mockFn.mockResolvedValue;
  mockFn.mockResolvedValue = function(value: T) {
    if (mockQueue.length > 0) {
      return this;
    }
    return originalMockResolvedValue.call(this, value);
  };
  
  // Enhanced implementation for async mocks
  mockFn.mockImplementation(function(...args: any[]) {
    const queuedResult = mockFn.getNextQueuedResult();
    if (queuedResult) {
      return queuedResult.type === 'resolve' 
        ? Promise.resolve(queuedResult.value as T)
        : Promise.reject(queuedResult.value);
    }
    return Promise.resolve(undefined as T);
  });
  
  return mockFn as unknown as QueueableMock<Promise<T>>;
}

/**
 * Utility to track and manage multiple mock functions.
 */
class MockRegistry {
  private mocks: Array<{ id: string; mock: any }> = [];
  private nextId = 0;
  
  register(name: string, mockFn: any): string {
    const id = `mock_${this.nextId++}`;
    this.mocks.push({ id, mock: mockFn });
    return id;
  }
  
  unregister(id: string): void {
    const index = this.mocks.findIndex(m => m.id === id);
    if (index !== -1) {
      this.mocks.splice(index, 1);
    }
  }
  
  clearAll(): void {
    this.mocks.forEach(({ mock }) => {
      mock.clearQueue();
      mock.mockClear();
    });
  }
}

// Export singleton instance
const mockRegistry = new MockRegistry();

export { createEnhancedMock, createAsyncMock, mockRegistry };
export type { QueueableMock };
