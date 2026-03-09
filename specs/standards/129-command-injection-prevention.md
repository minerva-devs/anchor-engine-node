# Standard 129: Command Injection Prevention

**Status:** ✅ Active | **Version:** 1.0 | **Date:** 2026-03-08
**Introduced:** v4.5.4

---

## 1. Purpose

Define security requirements for preventing command injection vulnerabilities when executing system commands from web-accessible endpoints.

This standard was established following security patches to `/v1/git/run` (#111) and `/v1/system/explorer` (#106) endpoints.

---

## 2. Core Security Principles

### 2.1 Never Use `exec` with User Input

**Vulnerable Pattern:**
```typescript
// ❌ NEVER DO THIS
import { exec } from 'child_process';
exec(`git ${userCommand}`, (error, stdout, stderr) => { ... });
```

**Why:** `exec` passes the entire string to a shell for interpretation. User input can inject additional commands:
```
userCommand = "status; rm -rf /"
// Shell executes: "git status; rm -rf /"
```

### 2.2 Use `execFile` with Argument Arrays

**Secure Pattern:**
```typescript
// ✅ CORRECT: Use execFile with explicit argument arrays
import { execFile } from 'child_process';

const commandMap: Record<string, string[]> = {
  'status': ['status'],
  'log': ['log', '--oneline', '-10'],
  'diff': ['diff', '--stat'],
};

const args = commandMap[userAction];
if (!args) return res.status(400).json({ error: 'Unauthorized command' });

execFile('git', args, { cwd: validatedWorkingDir }, (error, stdout, stderr) => {
  // Handle response
});
```

**Why:** `execFile` does not invoke a shell. Arguments are passed directly to the executable without interpretation.

---

## 3. Implementation Requirements

### 3.1 Command Whitelist

All executable commands MUST be mapped in a strict whitelist:

```typescript
const ALLOWED_COMMANDS: Record<string, {
  args: string[];
  requiresAuth?: boolean;
  allowedPaths?: string[];
}> = {
  'git-status': { args: ['status'] },
  'git-log': { args: ['log', '--oneline', '-10'] },
  'git-diff': { args: ['diff', '--stat'] },
  'git-fetch': { args: ['fetch'] },
  'git-pull': { args: ['pull'] },
  'explorer-linux': { args: ['xdg-open'] },
  'explorer-macos': { args: ['open'] },
  'explorer-windows': { args: ['explorer'] },
};
```

### 3.2 Path Validation

Working directory MUST be validated against a whitelist of allowed paths:

```typescript
async function validateWorkingDir(requestedPath: string): Promise<string> {
  const allowedPaths = await getDiscoveredRepos(); // Returns ['/path/to/repo1', '/path/to/repo2']
  
  const normalizedRequested = path.resolve(requestedPath);
  const isAllowed = allowedPaths.some(allowed => normalizedRequested.startsWith(allowed));
  
  if (!isAllowed) {
    throw new Error('Unauthorized directory access');
  }
  
  return normalizedRequested;
}
```

### 3.3 Response Handling

- **Unauthorized command:** Return HTTP 400 with error message
- **Unauthorized directory:** Return HTTP 403 with error message
- **Execution error:** Return HTTP 500 with sanitized error details
- **Success:** Return HTTP 200 with stdout/stderr

---

## 4. Endpoint-Specific Guidelines

### 4.1 Git Route (`/v1/git/run`)

**Threat Model:** User controls `command` and `working_dir` parameters.

**Mitigations:**
1. Command whitelist — only predefined git operations allowed
2. No custom command strings — frontend sends action name, not shell command
3. Working directory validated against discovered git repositories
4. `execFile` used instead of `exec`

**Example Request/Response:**
```json
// Request
POST /v1/git/run
{
  "command": "git-log",
  "working_dir": "/path/to/validated/repo"
}

// Response (200)
{
  "output": "b1300b5 Fix Command Injection\n2b8c60c Improve test coverage\n..."
}

// Response (400 - Unauthorized command)
{
  "error": "Command 'custom-command' is not allowed"
}

// Response (403 - Unauthorized directory)
{
  "error": "Directory '/etc' is not in allowed repositories"
}
```

### 4.2 System Explorer (`/v1/system/explorer`)

**Threat Model:** User controls `path` parameter for file explorer launch.

**Mitigations:**
1. Platform-specific command mapping (xdg-open, open, explorer)
2. Path validated against allowed directories (inbox, mirrored_brain, backups, etc.)
3. `execFile` with path as array element, not string interpolation

---

## 5. Testing Requirements

### 5.1 Unit Tests

Test the following scenarios:

```typescript
describe('Command Injection Prevention', () => {
  test('rejects unauthorized commands', async () => {
    const response = await request(app)
      .post('/v1/git/run')
      .send({ command: 'rm -rf /', working_dir: '/tmp' });
    
    expect(response.status).toBe(400);
  });

  test('rejects path traversal attempts', async () => {
    const response = await request(app)
      .post('/v1/git/run')
      .send({ command: 'git-status', working_dir: '../../../etc' });
    
    expect(response.status).toBe(403);
  });

  test('rejects shell injection in arguments', async () => {
    const response = await request(app)
      .post('/v1/git/run')
      .send({ command: 'git-status', working_dir: '/tmp; cat /etc/passwd' });
    
    expect(response.status).toBe(403);
  });

  test('allows whitelisted commands in valid directories', async () => {
    const response = await request(app)
      .post('/v1/git/run')
      .send({ command: 'git-status', working_dir: '/path/to/allowed/repo' });
    
    expect(response.status).toBe(200);
  });
});
```

### 5.2 Integration Tests

- Verify `execFile` is called (not `exec`)
- Verify command arguments are not shell-interpolated
- Verify path validation runs before execution

---

## 6. Code Review Checklist

When reviewing code that executes system commands:

- [ ] Uses `execFile` or `spawn` (not `exec`)
- [ ] Commands are from a hardcoded whitelist
- [ ] Arguments are passed as arrays (not interpolated strings)
- [ ] Working directory is validated against allowed paths
- [ ] User input never reaches shell interpreter
- [ ] Error responses do not leak sensitive path information
- [ ] Tests cover injection attempts

---

## 7. Related Standards

- **Standard 099:** SQL Injection Prevention
- **Standard 103:** Safe DNS and SSRF Prevention
- **Standard 200:** Deployment Security

---

## 8. References

- [Node.js child_process documentation](https://nodejs.org/api/child_process.html)
- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)

---

**Introduced:** v4.5.4
**Owner:** Anchor Engine Security Team
