# Standard 113: Automatic Max-Recall Trigger

**Status:** ✅ Production Ready | **Version:** 1.1.0 | **Date:** March 3, 2026

---

## Overview

Standard 113 defines the **automatic max-recall trigger** mechanism. When a user requests a large token budget (>16k tokens / 65k chars), the search automatically switches to max-recall mode for comprehensive retrieval.

**Updated (v1.1):** Added search serialization and memory pressure downgrade to prevent OOM crashes during concurrent max-recall searches.

---

## Trigger Threshold

**Automatic activation when:**
```typescript
estimated_tokens = max_chars / 4 > 16000
// Equivalently: max_chars > 65,536
```

---

## Implementation

### API Route Detection

```typescript
// engine/src/routes/api.ts (lines 250-260)
const maxChars = body.max_chars || 100000;
const estimatedTokens = maxChars / 4;

let useMaxRecall = strategy === 'max-recall';
if (!useMaxRecall && estimatedTokens > 16000) {
  useMaxRecall = true;
  StructuredLogger.info('SEARCH_AUTO_MAX_RECALL', {
    reason: 'token_budget > 16k',
    estimated_tokens: estimatedTokens,
    max_chars: maxChars
  });
}
```

### Logging

```json
{
  "event": "SEARCH_AUTO_MAX_RECALL",
  "reason": "token_budget > 16k",
  "estimated_tokens": 131072,
  "max_chars": 524288
}
```

---

## User Experience

### UI Behavior

1. **Volume Slider** - When user slides to >65k chars, max-recall auto-triggers
2. **Deep Research Button** - Explicitly sets `strategy: 'max-recall'`
3. **No User Action Required** - Seamless automatic switching

### API Behavior

1. **Implicit Trigger** - Large `max_chars` automatically enables max-recall
2. **Explicit Trigger** - `strategy: 'max-recall'` overrides budget check
3. **Logged** - `SEARCH_AUTO_MAX_RECALL` event for debugging

---

## Rationale

### Why 16k Tokens?

- **Below 16k:** Standard search sufficient for quick lookups
- **Above 16k:** User wants comprehensive context → max-recall mode

### Why Automatic?

- **User-Friendly** - No need to understand search strategies
- **Optimal Performance** - Right tool for the job automatically
- **Transparent** - Logging shows what happened

---

## Performance Impact

| Budget | Strategy | Expected Latency | Context |
|--------|----------|------------------|---------|
| <65k chars | Standard | 150-300ms | 16k-32k chars |
| >65k chars | Max-Recall | 25-50s | 512k-618k chars |

---

## Examples

### Automatic Trigger

```javascript
// User sets volume to maximum (524k chars)
fetch('/v1/memory/search', {
  method: 'POST',
  body: JSON.stringify({
    query: 'Coda C-001 Rob Dory',
    max_chars: 524288  // Auto-triggers max-recall
  })
});

// Log: SEARCH_AUTO_MAX_RECALL { reason: 'token_budget > 16k', ... }
```

### Explicit Trigger

```javascript
// User clicks "Deep Research" button
fetch('/v1/memory/search', {
  method: 'POST',
  body: JSON.stringify({
    query: 'Coda C-001 Rob Dory',
    max_chars: 16384,      // Small budget
    strategy: 'max-recall' // Explicit override
  })
});
```

---

## Related Standards

- **Standard 086** - Dual-Strategy Search
- **Standard 116** - Phoenix Protocol Backup/Restore

---

**Repository:** https://github.com/RSBalchII/anchor-engine-node
**Status:** ✅ Production Ready (February 22, 2026)
