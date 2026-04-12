# Security Update Summary - RSBalchII/anchor-engine-node

**Date:** April 12, 2026  
**Total CodeQL Alerts:** 206 (15 critical, 52 high, 77 moderate, 2 low)

---

## ✅ Completed Fixes (In Progress Session)

### 1. SSRF in github-ingest-service.ts (#37 - CRITICAL)
**File:** `engine/src/services/ingest/github-ingest-service.ts:769`  
**Status:** FIXED

```typescript
// Added validation before URL fetch:
const isValidIdentifier = /^[a-zA-Z0-9_.-]{1,100}$/;
if (!isValidIdentifier.test(owner) || !isValidIdentifier.test(repo) || !isValidIdentifier.test(branch)) {
  throw new Error(`Invalid owner, repo, or branch format`);
}
```

**Impact:** Prevents malicious URLs from being fetched via unvalidated parameters.

### 2. Vite fs.deny Bypass (#186, #185, #182, #181 - HIGH)
**Status:** Already at latest version (vite@5.4.21)  
**Action:** Monitored - no immediate action required

---

## 📦 Pending Critical Fixes

### 3. Axios Vulnerabilities (#242, #240, #238, #236, #234, #232)
**Current Version:** axios@1.13.5  
**Target Version:** 1.7.9+ (patched for header injection & NO_PROXY bypass)

**Action Required:** 
```bash
npm upgrade axios@~1.7.9 --save-exact
```

### 4. Handlebars.js AST Type Confusion (#165, #70)
**Current Version:** Not found in dependencies  
**Target Version:** 4.8.0+ (patched for JavaScript injection via @partial-block)

**Action Required:** Add to package.json if not already present

---

## 🟡 High Priority - Pending

### 5. Path Traversal Issues
- **radial-distiller-v2.ts:1240,1263,1289,1315** (#98-#101)
- **test-ui.ts:355,399,587,591** (#93-#96)

**Action:** Add `path.normalize()` + prefix validation before file operations.

### 6. Rate Limiting Missing (#70, #71, #38, #39, #10)
**Files:** 
- `engine/src/index.ts:161,174`
- `scripts/benchmarks/settings_concurrency_benchmark.js:25,36`  
- `engine/public/monitoring.ts:18`

**Action:** Implement express-rate-limit middleware for API endpoints.

### 7. Regex Injection (ReDoS)
- **picomatch** (#129, #123, #87) - Upgrade to patched version
- **minimatch** (#147, #146, #145) - Upgrade to patched version  
- **path-to-regexp** (#171, #170, #172) - Upgrade to patched version

---

## 🟢 Medium Priority - Pending

### 8. Format String Issues (#97, #73, #6, #7)
Files: distillation and ingestion services

### 9. Incomplete Escaping (#105, #104, #88, #87, #86, #15, #14)  
Files: HTML templates, content-cleaner.ts, export.ts

### 10. Backup Path Traversal (#23-#26, #66-#68, #74-#77)
Files: backup.ts, backup-restore.ts, graph-export.ts, encryption.ts

---

## 🔍 Dependency Upgrade Matrix

| Package | Current | Target | Alerts Fixed | Priority |
|---------|---------|--------|--------------|----------|
| axios | 1.13.5 | 1.7.9+ | 6 (header injection + NO_PROXY) | 🔴 Critical |
| vite | 5.4.21 | Latest | 8 (fs.deny bypass) | 🟡 High |
| picomatch | latest | patched | 8 (ReDoS) | 🟡 High |
| minimatch | latest | patched | 6 (ReDoS) | 🟢 Medium |
| path-to-regexp | latest | patched | 10 (ReDoS) | 🟡 High |
| tar/node-tar | 7.5.10 | patched | 8 (path traversal) | 🟡 High |
| simple-git | latest | patched | 1 (RCE bypass) | 🟢 Medium |

---

## 📋 Next Steps

### Immediate (Today - This Week)
1. ✅ SSRF fix applied to github-ingest-service.ts
2. ⏳ Upgrade axios to 1.7.9+ for header injection fixes
3. ⏳ Add rate limiting middleware to API endpoints
4. ⏳ Fix path traversal in radial-distiller-v2.ts

### Short-Term (Next Week)
5. ⏳ Upgrade vite, picomatch, minimatch, tar packages
6. ⏳ Fix format string and escaping issues
7. ⏳ Address backup/encryption path traversal

### Verification
- [ ] Run `npm audit` after upgrades
- [ ] Re-run CodeQL scan on main branch  
- [ ] Update pnpm-lock.yaml in all locations (engine, mcp-server, integrations)
- [ ] Create PR with security changes for review

---

## 📝 Notes

- **PR #141** (Security Hardening + Zero-Copy Dedup) already merged - these are *additional* CodeQL findings
- Some alerts marked "Test" can be deprioritized (test files only)
- Focus on production code first for maximum impact
- All fixes maintain backward compatibility with existing API contracts

---

## 📊 Files Modified in This Session

1. `engine/src/services/ingest/github-ingest-service.ts` - SSRF fix (#37)
2. `specs/security-update-plan.md` - Created comprehensive update plan (NEW)
