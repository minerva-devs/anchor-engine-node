# Block-Level Encryption for Anchor Engine Node

## Overview

Enable distillation of knowledge base while protecting sensitive content from corporate LLM content filters. Sensitive blocks are encrypted, but surrounding context remains readable.

---

## Requirements

### 1. Sensitive Pattern Detection

Detect and mask these pattern types (keep metadata, not content):

| Category | Examples | Detection Method |
|----------|----------|------------------|
| **Credentials** | passwords, API keys, tokens, secrets | Regex + entropy analysis |
| **Personal Info** | emails, phone numbers, addresses | Regex patterns |
| **Financial** | credit cards, bank accounts | Regex + Luhn validation |
| **NSFW/Explicit** | sexually explicit content, graphic descriptions | Local classifier model |
| **Identifiers** | SSN, ID numbers, passport numbers | Regex patterns |

### 2. Block-Level Encryption Strategy

For each sensitive block found:

```
[SENSITIVE_TYPE: hash_of_original]
[ENCRYPTED_BLOCK_START]
[base64_encrypted_content]
[ENCRYPTED_BLOCK_END]
```

Where:
- `SENSITIVE_TYPE` = PASSWORD, EMAIL, API_KEY, NSFW, PHONE, CREDIT_CARD, etc.
- `hash_of_original` = SHA-256 hash of original content (for deduplication)
- Encrypted content uses **AES-256-GCM** with key derived from user's master password

### 3. Decryption for Compactions

- When Anchor needs full context for compactions, decrypt on-the-fly
- Keep decrypted content in memory only (**never write to disk**)
- Use master password from secure storage (environment variable or local encrypted file)

### 4. Integration Points

1. **Pre-distillation**: Run encryption pass before distillation
2. **Pre-compaction**: Run decryption pass before compaction operations
3. **Storage**: Keep encrypted version as "canonical" in repo
4. **Ingestion**: Optionally encrypt during file ingestion

### 5. Configuration

Add to `user_settings.json`:

```json
{
  "encryption": {
    "enabled": true,
    "master_password_env": "ANCHOR_MASTER_PASSWORD",
    "auto_encrypt_on_ingest": true,
    "auto_decrypt_on_search": true,
    "sensitive_patterns": {
      "email": "regex_for_email_detection",
      "phone": "regex_for_phone_detection",
      "api_key": "regex_for_api_keys",
      "credit_card": "regex_for_credit_cards"
    },
    "nsfw_detection": {
      "enabled": true,
      "method": "local_model",
      "threshold": 0.85
    }
  }
}
```

---

## Implementation Details

### File Structure

```
engine/src/
├── services/
│   └── encryption/
│       ├── crypto-service.ts       # AES-256-GCM encryption/decryption
│       ├── pattern-detector.ts     # Regex + heuristic pattern detection
│       ├── nsfw-classifier.ts      # Local NSFW content classifier
│       ├── encryption-pipeline.ts  # Orchestration of encryption passes
│       └── key-manager.ts          # Master password & key derivation
├── routes/v1/
│   └── encryption.ts               # API endpoints for encryption ops
└── config/
    └── encryption-config.ts        # Encryption configuration schema
```

### Cryptographic Implementation

```typescript
// crypto-service.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class CryptoService {
  private key: Buffer | null = null;

  // Derive key from master password using PBKDF2
  deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(password, salt, KEY_LENGTH, {
        N: 16384, // CPU/memory cost parameter
        r: 8,     // Block size
        p: 1,     // Parallelization parameter
      }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  // Encrypt sensitive content
  encrypt(plaintext: string, key: Buffer): { 
    ciphertext: string; 
    iv: string; 
    salt: string;
    authTag: string;
  } {
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64')
    };
  }

  // Decrypt sensitive content
  decrypt(
    ciphertext: string, 
    key: Buffer, 
    iv: Buffer, 
    authTag: Buffer
  ): string {
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Pattern Detection

```typescript
// pattern-detector.ts
export const SENSITIVE_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?1?[-.\s]?)?\(?(?:[0-9]{3})\)?[-.\s]?(?:[0-9]{3})[-.\s]?(?:[0-9]{4})/g,
  creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g,
  apiKey: /(?:api[_-]?key|apikey|api_secret)[\s:=]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
  password: /(?:password|passwd|pwd)[\s:=]+['"]?([^\s'"]{8,})['"]?/gi,
  ssn: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,
  ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  awsKey: /\b(AKIA[0-9A-Z]{16})\b/g,
  githubToken: /\b(gh[pousr]_[A-Za-z0-9_]{36,})\b/g,
};

export interface SensitiveBlock {
  type: string;
  originalHash: string; // SHA-256 hash for deduplication
  start: number;
  end: number;
  originalText: string;
}

export function detectSensitiveBlocks(content: string): SensitiveBlock[] {
  const blocks: SensitiveBlock[] = [];
  
  for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      blocks.push({
        type: type.toUpperCase(),
        originalHash: sha256(match[0]),
        start: match.index,
        end: match.index + match[0].length,
        originalText: match[0],
      });
    }
  }
  
  // Sort by position to handle overlapping matches
  return blocks.sort((a, b) => a.start - b.start);
}
```

### NSFW Detection (Local Model)

```typescript
// nsfw-classifier.ts
// Use a lightweight local model for NSFW detection
// Options:
// 1. @xenova/transformers (Hugging Face) - runs in Node.js
// 2. Simple keyword-based heuristic fallback

export class NSFWClassifier {
  private model: any = null;
  private threshold: number = 0.85;

  async load(): Promise<void> {
    // Load lightweight NSFW classification model
    // Cache model in engine/context_data/models/
  }

  async isNSFW(text: string): Promise<{ 
    isNSFW: boolean; 
    confidence: number;
    categories: string[];
  }> {
    if (!this.model) await this.load();
    
    // Run classification
    const result = await this.model.predict(text);
    
    return {
      isNSFW: result.score > this.threshold,
      confidence: result.score,
      categories: result.categories || []
    };
  }
}
```

### Encryption Pipeline

```typescript
// encryption-pipeline.ts
export class EncryptionPipeline {
  private cryptoService: CryptoService;
  private patternDetector: PatternDetector;
  private nsfwClassifier: NSFWClassifier;

  // Encrypt file content before storage
  async encryptContent(
    content: string, 
    filePath: string
  ): Promise<{
    encryptedContent: string;
    blocksEncrypted: number;
    blockMap: BlockMap;
  }> {
    // 1. Detect sensitive patterns
    const blocks = this.patternDetector.detect(content);
    
    // 2. Check for NSFW content (split into chunks if large)
    const nsfwBlocks = await this.detectNSFWBlocks(content);
    blocks.push(...nsfwBlocks);
    
    // 3. Encrypt each block
    const blockMap = new Map();
    let encryptedContent = content;
    let offset = 0;
    
    for (const block of blocks) {
      const encrypted = await this.cryptoService.encrypt(
        block.originalText, 
        this.masterKey
      );
      
      const placeholder = `[${block.type}: ${block.originalHash}]\n` +
        `[ENCRYPTED_BLOCK_START]\n` +
        `[TYPE: ${block.type}]\n` +
        `[HASH: ${block.originalHash}]\n` +
        `[IV: ${encrypted.iv}]\n` +
        `[SALT: ${encrypted.salt}]\n` +
        `[AUTH: ${encrypted.authTag}]\n` +
        `${encrypted.ciphertext}\n` +
        `[ENCRYPTED_BLOCK_END]`;
      
      // Replace original with encrypted block
      const start = block.start + offset;
      const end = block.end + offset;
      encryptedContent = 
        encryptedContent.substring(0, start) + 
        placeholder + 
        encryptedContent.substring(end);
      
      offset += placeholder.length - (block.end - block.start);
      blockMap.set(block.originalHash, block.type);
    }
    
    return {
      encryptedContent,
      blocksEncrypted: blocks.length,
      blockMap: Object.fromEntries(blockMap)
    };
  }

  // Decrypt file content for search/compaction
  async decryptContent(encryptedContent: string): Promise<string> {
    const blockRegex = /\[ENCRYPTED_BLOCK_START\]([\s\S]*?)\[ENCRYPTED_BLOCK_END\]/g;
    
    let decryptedContent = encryptedContent;
    let match;
    
    while ((match = blockRegex.exec(encryptedContent)) !== null) {
      const blockContent = match[1];
      
      // Parse block metadata
      const typeMatch = blockContent.match(/\[TYPE: (\w+)\]/);
      const ivMatch = blockContent.match(/\[IV: ([^\]]+)\]/);
      const saltMatch = blockContent.match(/\[SALT: ([^\]]+)\]/);
      const authMatch = blockContent.match(/\[AUTH: ([^\]]+)\]/);
      const ciphertextMatch = blockContent.match(/\n([A-Za-z0-9+/=]+)\n/);
      
      if (!typeMatch || !ivMatch || !saltMatch || !authMatch || !ciphertextMatch) {
        console.warn('[Encryption] Invalid encrypted block format');
        continue;
      }
      
      // Decrypt
      const key = await this.cryptoService.deriveKey(
        this.masterPassword, 
        Buffer.from(saltMatch[1], 'base64')
      );
      
      const decrypted = this.cryptoService.decrypt(
        ciphertextMatch[1],
        key,
        Buffer.from(ivMatch[1], 'base64'),
        Buffer.from(authMatch[1], 'base64')
      );
      
      // Replace encrypted block with original content
      const start = match.index;
      const end = match.index + match[0].length;
      decryptedContent = 
        decryptedContent.substring(0, start) + 
        decrypted + 
        decryptedContent.substring(end);
    }
    
    return decryptedContent;
  }
}
```

---

## API Endpoints

### POST /v1/encryption/encrypt

Encrypt a file or content block.

```json
// Request
{
  "content": "string (optional if file_path provided)",
  "file_path": "string (optional if content provided)",
  "master_password": "string"
}

// Response
{
  "encrypted_content": "string",
  "blocks_encrypted": 42,
  "block_types": {
    "EMAIL": 15,
    "PHONE": 10,
    "API_KEY": 5,
    "NSFW": 12
  }
}
```

### POST /v1/encryption/decrypt

Decrypt encrypted content (in-memory only).

```json
// Request
{
  "encrypted_content": "string",
  "master_password": "string"
}

// Response
{
  "decrypted_content": "string",
  "blocks_decrypted": 42
}
```

### GET /v1/encryption/status

Check encryption configuration and status.

```json
// Response
{
  "enabled": true,
  "master_password_set": true,
  "encrypted_files_count": 156,
  "total_blocks_encrypted": 2847
}
```

---

## Output Example

### Before Encryption

```markdown
Contact me at robert@example.com or call 555-123-4567.
My API key is sk_live_abc123xyz789.
Password: SuperSecret123!

[NSFW content block - explicit description...]
```

### After Encryption

```markdown
Contact me at [EMAIL: 8a7f3c2d9e1b4f5a]
[ENCRYPTED_BLOCK_START]
[TYPE: EMAIL]
[HASH: 8a7f3c2d9e1b4f5a]
[IV: xK9mP2nQ5rS8tU1v]
[SALT: wX3yZ6aB9cD2eF5g]
[AUTH: hI8jK1lM4nO7pQ0r]
U2FsdGVkX1+abc123def456...
[ENCRYPTED_BLOCK_END]

or call [PHONE: 9b8e4f1a2c3d5e6f]
[ENCRYPTED_BLOCK_START]
[TYPE: PHONE]
[HASH: 9b8e4f1a2c3d5e6f]
[IV: yL0nR3oS6tV9uW2x]
[SALT: zA4bC7dE0fG3hI6j]
[AUTH: kL9mN2oP5qR8sT1u]
U2FsdGVkX2+def456ghi789...
[ENCRYPTED_BLOCK_END]

My API key is [API_KEY: c3d4e5f6g7h8i9j0]
[ENCRYPTED_BLOCK_START]
[TYPE: API_KEY]
[HASH: c3d4e5f6g7h8i9j0]
[IV: zM1oS4pT7uW0vX3y]
[SALT: aB5cD8eF1gH4iJ7k]
[AUTH: lM0nP3qR6sT9uV2w]
U2FsdGVkX3+ghi789jkl012...
[ENCRYPTED_BLOCK_END]

Password: [PASSWORD: d4e5f6g7h8i9j0k1]
[ENCRYPTED_BLOCK_START]
[TYPE: PASSWORD]
[HASH: d4e5f6g7h8i9j0k1]
[IV: aN2pT5qU8vX1wY4z]
[SALT: bC6dE9fG2hI5jK8l]
[AUTH: cD0eF3gH6iJ9kL2m]
U2FsdGVkX4+jkl012mno345...
[ENCRYPTED_BLOCK_END]

[NSFW: e5f6g7h8i9j0k1l2]
[ENCRYPTED_BLOCK_START]
[TYPE: NSFW]
[HASH: e5f6g7h8i9j0k1l2]
[IV: bO3qU6rV9wY2xZ5a]
[SALT: cD7eF0gH3iJ6kL9m]
[AUTH: dE1fG4hI7jK0lM3n]
U2FsdGVkX5+mno345pqr678...
[ENCRYPTED_BLOCK_END]
```

---

## Security Considerations

1. **Master Password Storage**
   - Never store master password in plaintext
   - Use environment variable (`ANCHOR_MASTER_PASSWORD`)
   - Or encrypt with system keychain (Android Keystore / macOS Keychain)

2. **Key Derivation**
   - Use PBKDF2 or Argon2 for key derivation
   - High iteration count (N=16384 minimum)
   - Unique salt per encryption operation

3. **Memory Safety**
   - Clear decrypted content from memory after use
   - Use `Buffer.fill(0)` to overwrite sensitive data
   - Never log encrypted or decrypted content

4. **File Integrity**
   - Use AES-GCM for authenticated encryption
   - Verify auth tag before decryption
   - Detect tampering attempts

5. **Backup & Recovery**
   - If master password is lost, encrypted content is unrecoverable
   - Provide option to export encrypted block map (encrypted)
   - Document recovery procedures

---

## Testing Requirements

1. **Unit Tests**
   - Pattern detection accuracy
   - Encryption/decryption round-trip
   - Key derivation consistency

2. **Integration Tests**
   - Full pipeline: detect → encrypt → decrypt
   - NSFW classifier accuracy
   - Performance with large files

3. **Security Tests**
   - Auth tag verification
   - Tamper detection
   - Memory clearing verification

---

## Migration Path

For existing installations:

1. **Opt-in Feature**
   - Default: `encryption.enabled = false`
   - User must explicitly enable and set master password

2. **Backfill Encryption**
   - Provide CLI command: `anchor encrypt-existing --all`
   - Encrypts all existing files in inbox/
   - Creates backup before encryption

3. **Gradual Rollout**
   - Phase 1: Pattern detection only (no encryption)
   - Phase 2: Optional encryption for new files
   - Phase 3: Full encryption pipeline

---

## Dependencies

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.14.0",
    "node-cache": "^5.1.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

---

## Implementation Priority

### Phase 1: Core Encryption (Week 1)
- [ ] `crypto-service.ts` - AES-256-GCM encryption
- [ ] `pattern-detector.ts` - Regex pattern detection
- [ ] `key-manager.ts` - Master password handling
- [ ] Basic API endpoints

### Phase 2: NSFW Detection (Week 2)
- [ ] `nsfw-classifier.ts` - Local model integration
- [ ] Content chunking for large files
- [ ] Threshold configuration

### Phase 3: Integration (Week 3)
- [ ] `encryption-pipeline.ts` - Full orchestration
- [ ] Pre-ingestion encryption hook
- [ ] Pre-search decryption hook
- [ ] Settings UI for encryption config

### Phase 4: Testing & Polish (Week 4)
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Documentation

---

## Questions for Clarification

1. **Key Storage**: Should we support Android Keystore integration for Termux, or is environment variable sufficient?

2. **NSFW Detection**: Use Hugging Face transformers (heavier) or keyword-based heuristic (lighter)?

3. **Performance**: What's the acceptable overhead for encryption/decryption during ingestion/search?

4. **Backup**: Should we provide a recovery key export feature?

5. **Granularity**: Encrypt at file level or block level within files? (Spec assumes block level)

---

## Contact

For questions or clarifications on this spec, refer to the Anchor Engine Node repository issues.
