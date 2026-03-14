# Standard 131: Async File I/O for Non-blocking APIs

**Status:** ✅ Active | **Version:** 1.0 | **Date:** 2026-03-08
**Introduced:** v4.5.4

---

## 1. Purpose

Define requirements for using asynchronous file I/O in API endpoints to prevent event loop blocking and ensure concurrent request handling.

This standard was established following the optimization of `/v1/settings` endpoints which replaced synchronous `fs.readFileSync` with `fs.promises.readFile`.

---

## 2. Core Principle: Never Block the Event Loop

Node.js operates on a single-threaded event loop. Synchronous file operations block all concurrent requests until completion.

### The Problem

```typescript
// ❌ NEVER DO THIS in API routes
app.get('/v1/settings', (req, res) => {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    res.json(settings);
});
```

**Impact:** During the sync read, ALL other requests are queued:
- 500 concurrent `/v1/settings` requests = 500 sequential blocking operations
- Ping endpoint (`/v1/ping`) blocked behind file reads
- Ingestion, search, and all other endpoints stall

### The Solution

```typescript
// ✅ CORRECT: Use async/await with promises
app.get('/v1/settings', async (req, res) => {
    const settings = JSON.parse(await fs.promises.readFile(SETTINGS_PATH, 'utf-8'));
    res.json(settings);
});
```

**Impact:** Event loop remains free to handle other requests:
- File I/O runs in background (libuv thread pool)
- Other endpoints continue processing
- Concurrent requests don't queue behind each other

---

## 3. Implementation Requirements

### 3.1 API Endpoints MUST Use Async File I/O

All Express routes that read or write files MUST use:
- `fs.promises.readFile()` instead of `fs.readFileSync()`
- `fs.promises.writeFile()` instead of `fs.writeFileSync()`
- `fs.promises.readdir()` instead of `fs.readdirSync()`
- `fs.promises.stat()` instead of `fs.statSync()`

### 3.2 Exception: Startup/Initialization Code

Synchronous file I/O is acceptable during:
- Server startup (before listening on port)
- Configuration loading (before first request)
- One-time initialization scripts

```typescript
// ✅ Acceptable: Startup configuration
const SETTINGS_PATH = path.join(__dirname, '../../../user_settings.json');
const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
// Server starts AFTER config loaded
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### 3.3 Error Handling

Async file operations MUST include proper error handling:

```typescript
app.get('/v1/settings', async (req, res) => {
    try {
        const settings = JSON.parse(await fs.promises.readFile(SETTINGS_PATH, 'utf-8'));
        res.status(200).json({ status: 'success', settings });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: `Failed to read settings: ${error.message}`
        });
    }
});
```

---

## 4. Benchmark Validation

### 4.1 Test Scenario

```typescript
// Simulate 500 concurrent settings requests + ping latency measurement
for (let i = 0; i < 500; i++) {
    axios.get('http://localhost:3001/settings').catch(() => {});
}

// Measure ping latency during concurrent load
for (let i = 0; i < 50; i++) {
    const start = performance.now();
    await axios.get('http://localhost:3001/ping');
    pingLatencies.push(performance.now() - start);
}
```

### 4.2 Expected Results

| Metric | Sync API | Async API | Improvement |
|--------|----------|-----------|-------------|
| Avg Ping Latency | High (blocked) | Low (non-blocking) | 50-90% reduction |
| Request Throughput | Sequential | Parallel | 10-50x improvement |
| Event Loop Lag | High | Minimal | 80%+ reduction |

### 4.3 Running the Benchmark

```bash
# Run the settings concurrency benchmark
cd engine/tests/benchmarks
node settings_concurrency_bench.ts
```

**Output:**
```
Starting benchmark...
Avg Ping Latency (Sync Settings API): 245.32ms
Avg Ping Latency (Async Settings API): 12.45ms
Improvement: 94.93%
```

---

## 5. Code Review Checklist

When reviewing API route changes:

- [ ] No `fs.readFileSync` in route handlers
- [ ] No `fs.writeFileSync` in route handlers
- [ ] All file operations use `await fs.promises.*`
- [ ] Error handling wraps async file operations
- [ ] JSON.parse wrapped in try-catch
- [ ] Route handler marked as `async`

---

## 6. Related Patterns

### 6.1 Batch File Operations

When reading multiple files, use `Promise.all` for parallelism:

```typescript
const files = await fs.promises.readdir(directory);
const contents = await Promise.all(
    files.map(f => fs.promises.readFile(path.join(directory, f), 'utf-8'))
);
```

### 6.2 Streaming Large Files

For files >1MB, use streams instead of loading entire file:

```typescript
const stream = fs.createReadStream(largeFilePath, { encoding: 'utf-8' });
for await (const chunk of stream) {
    // Process chunk
}
```

### 6.3 Write with Atomic Semantics

For critical writes, use temp file + rename pattern:

```typescript
const tempPath = SETTINGS_PATH + '.tmp';
await fs.promises.writeFile(tempPath, JSON.stringify(settings, null, 4), 'utf-8');
await fs.promises.rename(tempPath, SETTINGS_PATH); // Atomic on POSIX
```

---

## 7. Performance Impact

### Before (Sync API)

```
Request Timeline:
[Settings 1] ████████████████████ (blocks event loop)
[Settings 2] ░░░░████████████████ (waits for #1)
[Settings 3] ░░░░░░░░████████████ (waits for #2)
[Ping]       ░░░░░░░░░░░░████████ (waits for #3)
```

### After (Async API)

```
Request Timeline:
[Settings 1] ████░░░░░░░░░░░░░░░░ (async, event loop free)
[Settings 2] ████░░░░░░░░░░░░░░░░ (parallel)
[Settings 3] ████░░░░░░░░░░░░░░░░ (parallel)
[Ping]       ░░██░░░░░░░░░░░░░░░░ (not blocked!)
```

---

## 8. Related Standards

- **Standard 127:** PGlite Memory Optimization (async database operations)
- **Standard 119:** PGlite-First Architecture (async transaction support)
- **Standard 088:** Server Startup Sequence (initialization patterns)

---

## 9. References

- [Node.js Event Loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [fs.promises API](https://nodejs.org/api/fs.html#fs-promises-api)
- [Don't Block the Event Loop](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)

---

**Introduced:** v4.5.4
**Owner:** Anchor Engine Performance Team
