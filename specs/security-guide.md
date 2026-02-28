# Security Guide - Anchor Engine Deployment

**Version:** 1.0.0  
**Date:** February 27, 2026  
**Classification:** Deployment Guidance

---

## Overview

This guide provides security recommendations for deploying Anchor Engine in production environments. Anchor Engine is designed as "local-first" software, but additional hardening may be required depending on your threat model.

---

## Threat Model

### What "Local-First" Protects Against

✅ **Cloud provider data breaches** - Your data never leaves your machine  
✅ **Vendor lock-in** - Full data ownership and portability  
✅ **Third-party surveillance** - No telemetry or data collection  
✅ **API rate limiting** - No external dependencies  
✅ **Network outages** - Fully functional offline  

### What "Local-First" Does NOT Protect Against

❌ **Physical access attacks** - Someone with physical access to your machine  
❌ **Malware on host** - Keyloggers, screen capture, file access  
❌ **Multi-user exposure** - Other users on the same machine  
❌ **Backup leakage** - Unencrypted backups  
❌ **Network exposure** - If you expose the API to the network  

---

## Filesystem Security

### mirrored_brain/ Directory

The `mirrored_brain/` directory contains raw content files. Protect it:

**Windows:**
```powershell
# Set restrictive permissions (current user only)
icacls "C:\Users\rsbii\Projects\anchor-engine-node\engine\mirrored_brain" /grant:r "$env:USERNAME:(OI)(CI)F" /inheritance:r
```

**Linux/Mac:**
```bash
# Set restrictive permissions (owner only)
chmod 700 /path/to/anchor-engine-node/engine/mirrored_brain
chown $USER:$USER /path/to/anchor-engine-node/engine/mirrored_brain
```

### Database Directory

The `context_data/` directory contains the PGlite database:

**Recommended permissions:**
```bash
chmod 700 context_data
```

### user_settings.json

Contains API keys and configuration:

**Recommended:**
```bash
chmod 600 user_settings.json
```

---

## Multi-User Machine Considerations

### Risk Assessment

| Scenario | Risk Level | Mitigation |
|----------|------------|------------|
| Personal laptop | Low | Standard user account isolation |
| Shared workstation | Medium | Encrypted home directory |
| Server with multiple users | High | Containerization, encryption |
| Cloud VM | Medium | Full disk encryption |

### Hardening Checklist

- [ ] **Encrypted home directory** (LUKS, FileVault, BitLocker)
- [ ] **Restrictive file permissions** (see above)
- [ ] **No world-readable files** in project directory
- [ ] **API key not shared** in version control
- [ ] **Database not exposed** to network

---

## Network Security

### Default Configuration (Recommended)

By default, Anchor Engine binds to `0.0.0.0:3160`, which is accessible from all network interfaces.

**For local-only access:**
```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 3160
  }
}
```

### Firewall Rules

**Linux (ufw):**
```bash
# Allow only localhost
ufw allow from 127.0.0.1 to any port 3160

# Or block entirely if not needed externally
ufw deny 3160
```

**Windows Firewall:**
```powershell
# Block external access
New-NetFirewallRule -DisplayName "Anchor Engine" -Direction Inbound -LocalPort 3160 -Protocol TCP -Action Block
```

### API Key Authentication

Always use API keys in production:

```json
{
  "api_key": "generate-a-strong-random-key-here"
}
```

**Generate strong key:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Include in requests:
```bash
curl -H "X-API-Key: your-secret-key" http://localhost:3160/v1/...
```

---

## Backup Security

### What to Backup

**Essential:**
- `user_settings.json` - Configuration
- `inbox/` - Source files
- `external-inbox/` - External sources
- `mirrored_brain/` - Raw content (if not synced from inbox)

**Optional:**
- `engine/context_data/` - Database (can be rebuilt from mirrored_brain)

**Don't need to backup:**
- `node_modules/` - Can reinstall
- `dist/` - Can rebuild
- `benchmarks/test_db/` - Test data

### Encryption

**Encrypt backups containing sensitive data:**

**Linux (gpg):**
```bash
tar czf anchor-backup.tar.gz user_settings.json inbox/ mirrored_brain/
gpg -c anchor-backup.tar.gz
rm anchor-backup.tar.gz
```

**Mac (Time Vault):**
- Enable FileVault
- Use encrypted disk image for backups

**Windows (BitLocker):**
- Enable BitLocker on drive containing backups
- Or use encrypted ZIP:
```powershell
Compress-Archive -Path user_settings.json,inbox,mirrored_brain -DestinationPath backup.zip
# Then encrypt with BitLocker or third-party tool
```

### Cloud Backup Considerations

If using Dropbox, Google Drive, etc.:

1. **Encrypt before syncing** - Use cryptomator, Veracrypt, or similar
2. **Don't sync mirrored_brain/** - Only sync inbox/ and settings
3. **Use selective sync** - Only sync necessary directories

---

## Containerization (Advanced)

### Docker Deployment

For isolated deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
VOLUME ["/app/inbox", "/app/mirrored_brain", "/app/engine/context_data"]
EXPOSE 3160
CMD ["node", "engine/dist/index.js"]
```

**Docker Compose:**
```yaml
version: '3'
services:
  anchor-engine:
    build: .
    ports:
      - "127.0.0.1:3160:3160"  # Localhost only
    volumes:
      - ./inbox:/app/inbox
      - ./mirrored_brain:/app/mirrored_brain
      - ./context_data:/app/engine/context_data
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

---

## Audit & Monitoring

### Access Logs

Monitor API access:

```javascript
// Add to index.ts middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip;
  const path = req.path;
  console.log(`[${timestamp}] ${ip} -> ${path}`);
  next();
});
```

### File Integrity

Monitor for unauthorized changes:

**Linux (aide/tripwire):**
```bash
# Install and initialize
aide --init

# Check for changes
aide --check
```

**Windows (PowerShell):**
```powershell
# Create hash baseline
Get-ChildItem -Recurse | Get-FileHash | Export-Csv baseline.csv

# Check for changes
$current = Get-ChildItem -Recurse | Get-FileHash
$baseline = Import-Csv baseline.csv
Compare-Object $current $baseline -Property Hash, Path
```

---

## Incident Response

### If You Suspect Compromise

1. **Stop the service**
   ```bash
   pkill -f "node.*anchor-engine"
   ```

2. **Preserve logs**
   ```bash
   cp -r logs/ incident-logs-$(date +%Y%m%d)
   ```

3. **Rotate API keys**
   - Edit `user_settings.json`
   - Update all clients

4. **Audit file changes**
   - Check `mirrored_brain/` for unexpected files
   - Review access logs

5. **Rebuild from trusted backup**
   - Restore from encrypted backup
   - Verify hashes

---

## Security Checklist

### Deployment

- [ ] File permissions set correctly
- [ ] API key configured and strong
- [ ] Network binding restricted (localhost if possible)
- [ ] Firewall rules configured
- [ ] Backups encrypted
- [ ] Logs enabled and monitored

### Ongoing Maintenance

- [ ] Regular security updates (Node.js, dependencies)
- [ ] Periodic access log review
- [ ] Backup verification (test restores)
- [ ] File integrity checks
- [ ] API key rotation (quarterly)

---

## Known Limitations

### Current Version

- No built-in encryption at rest
- No role-based access control
- No audit logging to external systems
- No rate limiting by IP

### Planned (Future Versions)

- Optional database encryption
- Multi-user support with RBAC
- SIEM integration (Syslog, etc.)
- Advanced rate limiting

---

## Reporting Security Issues

**Contact:** Report vulnerabilities to the project maintainers via GitHub Issues (for public issues) or direct message (for sensitive issues).

**Response Time:** We aim to respond within 48 hours.

**Embargo Policy:** We request 30 days to develop and release a patch before public disclosure.

---

## Related Documentation

- [Architecture Tradeoffs](./architecture-tradeoffs.md) - Pointer-only index security implications
- [API Contracts](./api-contracts.md) - Authentication details
- [Deployment Guide](../README.md#deployment) - Installation instructions

---

**Last Updated:** February 27, 2026  
**Next Review:** Q3 2026
