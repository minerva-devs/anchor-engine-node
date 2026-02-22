# Anchor UI Testing Guide

**Version:** 1.0.0  
**Last Updated:** February 20, 2026

---

## 🚀 Quick Start

```bash
# Run tests in watch mode (development)
pnpm test

# Run tests once (CI/CD)
pnpm test:run

# Run tests with coverage report
pnpm test:coverage

# Open Vitest UI dashboard
pnpm test:ui
```

---

## 📁 Test File Organization

Tests are **colocated** with their source files:

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx ← Test file right next to source!
│   └── features/
│       ├── SearchColumn.tsx
│       └── SearchColumn.test.tsx
├── services/
│   ├── api.ts
│   └── api.test.ts
└── utils/
    ├── navigation.ts
    └── navigation.test.ts
```

**Benefits:**
- ✅ Obvious what's tested (no `.test.tsx` = no tests)
- ✅ Easy refactoring (move file, tests move with it)
- ✅ Better IDE navigation (jump between test and source)
- ✅ Natural documentation (tests show how to use code)

---

## 🧪 Testing Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner (native Vite integration) |
| **Testing Library** | Component testing (user-centric) |
| **MSW** | API mocking (Mock Service Worker) |
| **jsdom** | DOM simulation |
| **user-event** | Realistic user interactions |

---

## 📝 Writing Tests

### **Component Test Example**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders button with children', () => {
    render(<Button>Click Me</Button>);
    
    expect(screen.getByRole('button', { name: /click me/i }))
      .toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click</Button>);
    
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### **Service Test Example**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { api } from '../api';

const server = setupServer();

describe('API Service', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('fetches buckets from API', async () => {
    server.use(
      http.get('/v1/buckets', () => HttpResponse.json(['inbox', 'code']))
    );

    const buckets = await api.getBuckets();

    expect(buckets).toEqual(['inbox', 'code']);
  });
});
```

---

## 🎯 Testing Patterns

### **1. Arrange-Act-Assert (AAA)**

```typescript
it('does something', () => {
  // Arrange - Set up test data
  const mockData = { id: '1', content: 'test' };
  
  // Act - Perform action
  render(<Component data={mockData} />);
  
  // Assert - Verify result
  expect(screen.getByText('test')).toBeInTheDocument();
});
```

### **2. Testing User Interactions**

```typescript
it('handles form submission', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();
  
  render(<Form onSubmit={handleSubmit} />);
  
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(handleSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'test@example.com' })
  );
});
```

### **3. Testing Async Operations**

```typescript
it('loads data on mount', async () => {
  render(<DataLoader />);
  
  // Wait for data to appear
  const item = await screen.findByText(/loaded data/i);
  expect(item).toBeInTheDocument();
});

it('shows loading state', () => {
  render(<DataLoader />);
  
  // Immediate assertion
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### **4. Testing Error States**

```typescript
it('shows error message on failure', async () => {
  server.use(
    http.get('/api/data', () => HttpResponse.json(
      { error: 'Failed' },
      { status: 500 }
    ))
  );
  
  render(<DataLoader />);
  
  const error = await screen.findByText(/error loading data/i);
  expect(error).toBeInTheDocument();
});
```

---

## 🔧 Mocking

### **Mock Functions**

```typescript
const handleClick = vi.fn();
render(<Button onClick={handleClick} />);
await user.click(screen.getByRole('button'));
expect(handleClick).toHaveBeenCalledTimes(1);
```

### **Mock Modules**

```typescript
vi.mock('../api', () => ({
  api: {
    search: vi.fn().mockResolvedValue({ results: [] }),
    getBuckets: vi.fn().mockResolvedValue(['inbox']),
  },
}));
```

### **MSW API Mocks**

```typescript
server.use(
  http.post('/v1/memory/search', async ({ request }) => {
    const body = await request.json();
    expect(body.query).toBe('test');
    return HttpResponse.json({ results: [], context: '' });
  })
);
```

---

## 📊 Test Coverage

Run coverage report:

```bash
pnpm test:coverage
```

**Coverage Thresholds:**
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

**Coverage Files:**
- `coverage/index.html` - HTML report
- `coverage/coverage-final.json` - JSON report

---

## 🎯 What to Test

### **Test These:**
- ✅ Component rendering (does it appear?)
- ✅ User interactions (clicks, typing, etc.)
- ✅ API calls (correct params, error handling)
- ✅ State changes (loading → success/error)
- ✅ Props behavior (different variants, disabled, etc.)
- ✅ Edge cases (empty data, long text, etc.)

### **Don't Test These:**
- ❌ Implementation details (internal state)
- ❌ Third-party libraries (trust React/Vite)
- ❌ Browser behavior (trust jsdom)
- ❌ Every single line (focus on critical paths)

---

## 🐛 Debugging Tests

### **Verbose Output**

```bash
pnpm test -- --reporter=verbose
```

### **Run Specific Test File**

```bash
pnpm test Button.test.tsx
```

### **Run Tests Matching Pattern**

```bash
pnpm test -t "Button"
```

### **Debug with Console Logs**

```typescript
it('debugs something', () => {
  const { container } = render(<Component />);
  console.log(container.innerHTML); // See rendered HTML
});
```

### **Testing Library Debug Helpers**

```typescript
import { screen } from '@testing-library/react';

it('debugs', () => {
  render(<Component />);
  
  // Log entire DOM
  console.log(screen.debug());
  
  // Log specific element
  console.log(screen.debug(screen.getByRole('button')));
});
```

---

## 🚦 CI/CD Integration

### **GitHub Actions Example**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Run tests
        run: pnpm test:run
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet/)

---

## 🎓 Best Practices

1. **Test behavior, not implementation** - Test what user sees/experiences
2. **Use realistic data** - Don't test with "foo/bar"
3. **Keep tests independent** - Each test should pass/fail on its own
4. **Test edge cases** - Empty states, errors, loading
5. **Update tests when code changes** - Tests are living documentation
6. **Name tests clearly** - `it('shows error message when API fails')`
7. **Use userEvent over fireEvent** - More realistic interactions
8. **Query by role first** - `getByRole('button')` > `getByTestId`

---

## 🆘 Common Issues

### **"Cannot find module"**
```bash
# Make sure vitest.config.ts has correct aliases
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### **"window.matchMedia is not defined"**
Already handled in `src/__tests__/setup.ts`

### **"Act warning"**
```typescript
// Wrap state updates in act (Testing Library does this automatically)
await user.click(button); // ✅ Good
```

### **MSW handlers not working**
```typescript
// Make sure to call server.use() BEFORE the action
server.use(http.get('/api', handler));
await user.click(button); // ✅ Correct order
```

---

**Happy Testing! 🎉**
