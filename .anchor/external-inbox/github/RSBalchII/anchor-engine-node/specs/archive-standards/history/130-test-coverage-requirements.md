# Standard 130: Test Coverage Requirements

**Status:** ✅ Active | **Version:** 1.0 | **Date:** 2026-03-08
**Introduced:** v4.5.4

---

## 1. Purpose

Define minimum test coverage requirements and testing patterns for the Anchor Engine codebase.

This standard was established following the addition of comprehensive test suites for core modules in v4.5.4 (#89, #90, #91, #92, #98, #101, #103, #104, #105, #110, #114).

---

## 2. Coverage Targets

### 2.1 Module Coverage Requirements

| Module Type | Minimum Coverage | Critical Paths |
|-------------|------------------|----------------|
| **Core Services** (engine/src/services/) | 80% | 100% |
| **API Routes** (engine/src/routes/) | 75% | 95% |
| **UI Components** (packages/anchor-ui/src/) | 70% | 90% |
| **UI Services** (packages/anchor-ui/src/services/) | 80% | 95% |
| **Utility Functions** (*/src/utils/) | 90% | 100% |
| **Native Modules** (cpp/, native/) | 85% | 100% |

### 2.2 Critical Path Definition

Critical paths MUST have 100% coverage:
- Security-sensitive code (auth, input validation, command execution)
- Data integrity operations (database writes, backup/restore)
- Error handling that could expose vulnerabilities
- Performance-critical hot paths

---

## 3. Testing Frameworks

### 3.1 Framework Selection

| Package | Framework | Rationale |
|---------|-----------|-----------|
| **engine/** | Vitest + Jest | Vitest for ES modules, Jest for legacy tests |
| **packages/anchor-ui/** | Vitest | Native ESM support, fast parallel execution |
| **cpp/tests/** | CMake + GoogleTest | Native C++ testing |

### 3.2 Test File Naming

```typescript
// Unit tests: *.test.ts or *.vitest.ts
NativeModuleManager.test.ts
routing.test.ts

// Integration tests: *.integration.test.ts
backup-restore.integration.test.ts

// Component tests: *.test.tsx
GitCommandsModal.test.tsx
```

---

## 4. Required Test Patterns

### 4.1 Singleton Testing

Test singleton instantiation and cache behavior:

```typescript
describe('NativeModuleManager', () => {
  test('returns same instance on multiple calls', () => {
    const instance1 = NativeModuleManager.getInstance();
    const instance2 = NativeModuleManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('caches module after first load', () => {
    NativeModuleManager.getInstance();
    const status = NativeModuleManager.getAllStatus();
    expect(status.ece_native.loaded).toBe(true);
  });
});
```

### 4.2 Fallback Mechanism Testing

Test native module fallback to JavaScript implementations:

```typescript
describe('Fallback Mode', () => {
  beforeEach(() => {
    jest.mock('native-module', () => {
      throw new Error('Module not found');
    });
  });

  test('activates fallback when native module fails', () => {
    const manager = NativeModuleManager.getInstance();
    expect(manager.isUsingFallback()).toBe(true);
  });

  test('fallback implements all native methods', () => {
    const result = NativeModuleManager.cleanse('test input');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});
```

### 4.3 Mocking External Dependencies

#### GPU Detection Mocking

```typescript
describe('GPU Detection', () => {
  test('handles missing GPU', () => {
    Object.defineProperty(navigator, 'gpu', {
      value: undefined,
      writable: true,
    });
    
    const device = await getDeviceInfo();
    expect(device.gpu).toBe('Not available');
  });

  test('detects integrated GPU', async () => {
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: jest.fn().mockResolvedValue({
          requestDevice: jest.fn().mockResolvedValue({
            adapterInfo: { architecture: 'integrated' },
          }),
        }),
      },
    });
    
    const device = await getDeviceInfo();
    expect(device.gpu).toBe('Integrated GPU');
  });
});
```

#### Fetch Mocking

```typescript
describe('Model Loading', () => {
  test('handles successful model fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-length', '1048576']]),
    });
    
    const result = await verifyModel('model-id');
    expect(result.success).toBe(true);
    expect(result.estimatedTime).toBeLessThan(60);
  });

  test('handles fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await verifyModel('model-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });
});
```

#### DNS Mocking

```typescript
describe('Safe DNS Lookup', () => {
  test('resolves public IP addresses', () => {
    const mockLookup = jest.spyOn(dns, 'lookup');
    mockLookup.mockImplementation((hostname, callback) => {
      callback(null, { address: '8.8.8.8', family: 4 });
    });
    
    const result = await safeLookup('example.com');
    expect(result.isPrivate).toBe(false);
  });

  test('detects private IP addresses', () => {
    const mockLookup = jest.spyOn(dns, 'lookup');
    mockLookup.mockImplementation((hostname, callback) => {
      callback(null, { address: '192.168.1.1', family: 4 });
    });
    
    const result = await safeLookup('internal.local');
    expect(result.isPrivate).toBe(true);
  });
});
```

### 4.4 Error Handling Tests

```typescript
describe('Error Handling', () => {
  test('handles OOM warnings for high VRAM', async () => {
    const result = await verifyModel('large-model', { vram: 24000000000 });
    expect(result.warnings).toContain('OOM');
    expect(result.estimatedTime).toBeGreaterThan(60);
  });

  test('truncates long token counts', () => {
    const truncated = truncateTokens('a'.repeat(10000), 1000);
    expect(truncated.length).toBeLessThanOrEqual(1000);
  });

  test('handles empty input gracefully', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(truncateTokens('', 100)).toBe('');
  });
});
```

### 4.5 Concurrent Request Testing

```typescript
describe('Concurrent Requests', () => {
  test('handles multiple simultaneous initialization requests', async () => {
    const promises = Array(5).fill(null).map(() => 
      WebLLMService.initialize()
    );
    
    const results = await Promise.all(promises);
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });

  test('prevents race conditions in singleton', async () => {
    const instance1 = NativeModuleManager.getInstance();
    const instance2 = NativeModuleManager.getInstance();
    expect(instance1).toBe(instance2);
  });
});
```

### 4.6 SSR/Non-DOM Environment Testing

```typescript
describe('SSR Safety', () => {
  test('handles missing window object', () => {
    const originalWindow = global.window;
    delete (global as any).window;
    
    expect(() => navigate('/test')).not.toThrow();
    
    global.window = originalWindow;
  });

  test('handles empty paths', () => {
    navigate('');
    expect(window.history.pushState).toHaveBeenCalled();
  });

  test('handles paths with hash fragments', () => {
    navigate('/test#section');
    expect(window.location.hash).toBe('#section');
  });
});
```

### 4.7 Test Cleanup Patterns

```typescript
describe('ResourceManager', () => {
  afterEach(() => {
    // Stop monitoring to prevent test runner hang
    ResourceManager.stopMonitoring();
    jest.clearAllMocks();
  });

  test('triggers GC at critical threshold', () => {
    const mockGC = jest.spyOn(global, 'gc');
    ResourceManager.updateLimits({ criticalThreshold: 90 });
    // Simulate memory pressure
    expect(mockGC).toHaveBeenCalled();
  });
});
```

---

## 5. Test Coverage for Security Code

### 5.1 Command Injection Prevention Tests

```typescript
describe('Command Injection Prevention', () => {
  test('rejects unauthorized commands', async () => {
    const response = await request(app)
      .post('/v1/git/run')
      .send({ command: 'rm -rf /', working_dir: '/tmp' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('not allowed');
  });

  test('rejects path traversal attempts', async () => {
    const response = await request(app)
      .post('/v1/git/run')
      .send({ command: 'git-status', working_dir: '../../../etc' });
    
    expect(response.status).toBe(403);
  });

  test('uses execFile not exec', () => {
    const { execFile } = require('child_process');
    const execSpy = jest.spyOn(child_process, 'execFile');
    
    // Trigger git command
    execSpy.mockClear();
    
    expect(execSpy).toHaveBeenCalledWith(
      'git',
      expect.any(Array),
      expect.any(Object),
      expect.any(Function)
    );
  });
});
```

### 5.2 SQL Injection Prevention Tests

```typescript
describe('SQL Injection Prevention', () => {
  test('parameterized queries prevent injection', async () => {
    const maliciousInput = "'; DROP TABLE atoms; --";
    const result = await searchService.search(maliciousInput);
    
    // Should return results, not crash
    expect(result.results).toBeDefined();
    expect(result.results.length).toBeGreaterThanOrEqual(0);
  });

  test('removed endpoints return 404', async () => {
    const response = await request(app).get('/v1/db/query');
    expect(response.status).toBe(404);
  });
});
```

---

## 6. C++ Testing Requirements

### 6.1 Test Structure

```cpp
// cpp/tests/test_graph_traversal.cpp
#include <gtest/gtest.h>
#include "graph_traversal.h"
#include "database.h"

TEST(GraphTraversalTest, FindTagNeighbors) {
    Database db(":memory:");
    // Setup test data
    
    auto neighbors = findTagNeighbors(db, "atom_123");
    
    EXPECT_NE(neighbors.size(), 0);
    // Verify deduplication
    // Verify source atom is excluded
}
```

### 6.2 CMake Integration

```cmake
# cpp/tests/CMakeLists.txt
add_executable(test_graph_traversal test_graph_traversal.cpp)
target_link_libraries(test_graph_traversal gtest gtest_main anchor_core)
add_test(NAME GraphTraversal COMMAND test_graph_traversal)
```

---

## 7. Coverage Reporting

### 7.1 Generate Coverage Reports

```bash
# Vitest coverage
pnpm test -- --coverage

# Jest coverage
pnpm test:unit --coverage

# View HTML report
open coverage/index.html
```

### 7.2 Coverage Threshold Enforcement

```json
// package.json
{
  "vitest": {
    "coverage": {
      "thresholds": {
        "lines": 80,
        "functions": 80,
        "branches": 70,
        "statements": 80
      }
    }
  }
}
```

---

## 8. Test Maintenance

### 8.1 When to Add Tests

- New feature or endpoint
- Bug fix (add regression test)
- Refactoring (ensure existing tests pass)
- Security-sensitive code (mandatory)
- Performance-critical code (benchmark + unit tests)

### 8.2 Test Review Checklist

- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests cover edge cases (empty input, max values, Unicode)
- [ ] Mocks are properly isolated
- [ ] Tests are deterministic (no flaky tests)
- [ ] Test names describe the scenario being tested
- [ ] Critical paths have 100% coverage

---

## 9. Related Standards

- **Standard 099:** SQL Injection Prevention
- **Standard 129:** Command Injection Prevention
- **Standard 105:** API Contracts (includes testing requirements)

---

## 10. References

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [GoogleTest Documentation](https://google.github.io/googletest/)
- [Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/)

---

**Introduced:** v4.5.4
**Owner:** Anchor Engine Quality Team
