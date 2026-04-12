/**
 * Simple Mock Helper Utility for Test Queue Management
 *
 * Provides queue-based mockResolvedValueOnce and mockRejectedValueOnce support.
 */

// Internal per-instance queue storage for mocked values
interface MockQueueItem {
  type: 'resolve' | 'reject';
  value: unknown;
}

/**
 * Create a simple mock function with queue-based once resolution support.
 */
export class MockHelper {
  private _queue: Array<MockQueueItem> = [];
  private _customImpl?: Function;

  /**
   * Queue a single resolved value that will be used on the next call.
   */
  mockResolvedValueOnce(value: any): this {
    this._queue.push({ type: 'resolve', value });
    return this;
  }

  /**
   * Queue a single rejected value (error) that will be used on the next call.
   */
  mockRejectedValueOnce(error: any): this {
    this._queue.push({ type: 'reject', value: error });
    return this;
  }

  /**
   * Set a custom implementation function to override default behavior.
   */
  mockImplementation(impl: Function): this {
    this._customImpl = impl;
    return this;
  }

  /**
   * Clear all queued mock values for this instance.
   */
  clearQueue(): void {
    this._queue.splice(0);
  }

  /**
   * Return a wrapped version of the given function that uses our queue.
   *
   * @param fn - The original function to wrap/mock
   * @returns A callable wrapper that respects the mock queue and custom implementation
   */
  apply(fn: Function): (...args: any[]) => Promise<unknown> | unknown {
    const _fn = fn; // Capture reference to original function
    
    return async (...args: any[]): Promise<any> => {
      // Check if there's a custom implementation set via mockImplementation()
      if (this._customImpl) {
        return this._customImpl(...args);
      }
      
      // Otherwise check the mock queue for queued values
      if (this._queue.length > 0) {
        const nextItem = this._queue.shift();
        if (nextItem) {
          return nextItem.type === 'resolve'
            ? Promise.resolve(nextItem.value)
            : Promise.reject(nextItem.value);
        }
      }
      
      // Fall through to original function implementation
      return _fn.apply(this, args);
    };
  }
}
"}}</tool_call>; Check if the directory exists and create it if necessary. If not, I'll need to create both the directory and the file. Let me start with writing the file directly since write_file should handle creating directories automatically in Node.js environments. The file path is C:\\Users\\rsbiiw\\Projects\\aen\\engine\\src\\test-utils\\mock-helper.ts - this includes a new directory "}}</tool_call>; Update model-verifier.test.ts to use MockHelper instead of vi.mock() patterns for global.fetch mocking. Looking at the test file: ```typescript
vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as any);
```

This needs replacement. Since mock-helper provides an `apply()` method that wraps functions and respects the queue, I can do something like:
```typescript
new MockHelper().apply(global.fetch).mockResolvedValueOnce(...);
```

But wait - there's still an issue. The `apply()` method returns a wrapped function, but that returned wrapper doesn't have `.mockResolvedValueOnce` attached to it - those methods are only on the MockHelper instance itself.

I need to reconsider the design again. Let me think about what makes most sense here:

Option 1: Keep MockHelper as-is but add instance-level queue management that apply() uses
- The MockHelper instance maintains its own queue
- When you call `mockResolvedValueOnce()` on it, it adds to that queue
- The `apply()` method returns a wrapped function that reads from that same queue