# Standard 132: API Versioning Strategy

**Status:** ✅ ACTIVE  
**Version:** 1.0  
**Created:** March 9, 2026

---

## Purpose

Define a clear versioning strategy for the Anchor Engine REST API to ensure backward compatibility and smooth upgrades for integrators.

---

## Versioning Scheme

### URL-Based Versioning

All API endpoints use a major version prefix:

```
/v1/atoms
/v1/search
/v1/memory/distill
```

- **Current Version:** `v1`
- **Format:** `/v{major}/resource`

### Semantic Versioning for API

The API follows semantic versioning principles:

| Change Type | Example | URL Change Required |
|-------------|---------|---------------------|
| **Breaking** | Remove endpoint, change request/response shape | Yes (`/v2/`) |
| **Non-Breaking** | Add optional field, add endpoint | No |
| **Fix** | Bug fix, performance improvement | No |

---

## Breaking Changes Policy

### What Constitutes a Breaking Change

1. **Removing an endpoint**
2. **Renaming required request fields**
3. **Changing response structure** (field names, types)
4. **Changing authentication requirements**
5. **Changing error response codes**

### What is NOT a Breaking Change

1. **Adding new endpoints**
2. **Adding optional request fields**
3. **Adding new response fields**
4. **Performance improvements**
5. **Bug fixes**

---

## Deprecation Process

When a breaking change is required:

1. **Announce deprecation** in CHANGELOG and API response header:
   ```
   X-API-Deprecated: true
   X-API-Sunset: 2026-06-01
   ```

2. **Maintain both versions** for at least 3 months

3. **Log warnings** when deprecated endpoints are called

4. **Document migration path** in CHANGELOG

---

## Version Lifecycle

| Stage | Duration | Description |
|-------|----------|-------------|
| **Current** | Ongoing | Active development, all features |
| **Deprecated** | 3 months | No new features, security fixes only |
| **Sunset** | End of life | Endpoint returns 410 Gone |

---

## Implementation

### Request Header

Clients SHOULD send:
```
Accept: application/json
X-API-Version: 1
```

### Response Header

Server ALWAYS returns:
```
X-API-Version: 1.0
```

---

## Current API Version

| Version | Status | Release Date |
|---------|--------|--------------|
| `v1` | ✅ Active | 2024-01-15 |

---

## See Also

- [Standard 105: API Contracts](105-api-contracts.md)
- [CHANGELOG.md](../../CHANGELOG.md)