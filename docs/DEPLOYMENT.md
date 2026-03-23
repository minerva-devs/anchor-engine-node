# Anchor Engine - Deployment Guide

**Version:** 4.8.0 | **Last Updated:** March 18, 2026

---

## Quick Deploy

### Local Development
```bash
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node
pnpm install
pnpm build
pnpm start
```

### Docker (Recommended for Production)
```bash
docker-compose up -d
docker-compose logs -f
```

---

## Deployment Options

### Option 1: Local Machine

**Best for:** Personal use, development, testing

**Requirements:**
- Node.js v18+ (v20+ recommended)
- PNPM package manager
- 1GB RAM minimum (4GB+ recommended)
- 10GB free storage

**Steps:**
1. Clone repository
2. Install dependencies: `pnpm install`
3. Build: `pnpm build`
4. Start: `pnpm start`
5. Open: http://localhost:3160

**Configuration:** Edit `user_settings.json`

---

### Option 2: Docker

**Best for:** Production, isolated environments

**Requirements:**
- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM allocated to container

**Steps:**
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Volumes:**
- `./inbox` → **Source of Truth** - Permanent storage for ingested files
- `./external-inbox` → **Source of Truth** - External data imports
- `./mirrored_brain` → Rebuildable cache (regenerated on startup)
- `./backups` → Phoenix Protocol backups
- `anchor-data` → PGlite database (ephemeral, wiped on startup)

**Important:** The database is ephemeral and wiped on every startup. Only `inbox/` and `external-inbox/` need persistent volumes. See [Standard 020](../specs/current-standards/020-ephemeral-database.md).

**Environment Variables:**
```yaml
environment:
  - PROJECT_ROOT=/app
  - CONTEXT_DIR=/app/engine/context_data
  - NOTEBOOK_DIR=/app/notebook
```

---

### Option 3: Cloud VPS

**Best for:** Team access, 24/7 availability

**Recommended Providers:**
- DigitalOcean Droplet ($12/mo - 2GB RAM)
- Linode Nanode ($5/mo - 1GB RAM)
- AWS EC2 t3.small ($15/mo - 2GB RAM)

**Steps:**
1. Provision Ubuntu 22.04 server
2. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Install PNPM:
   ```bash
   sudo npm install -g pnpm
   ```
4. Clone and setup:
   ```bash
   git clone https://github.com/RSBalchII/anchor-engine-node.git
   cd anchor-engine-node
   pnpm install
   pnpm build
   ```
5. Run as systemd service:
   ```bash
   sudo nano /etc/systemd/system/anchor-engine.service
   ```
   
   ```ini
   [Unit]
   Description=Anchor Engine
   After=network.target
   
   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/anchor-engine-node
   ExecStart=/usr/bin/pnpm start
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   ```bash
   sudo systemctl enable anchor-engine
   sudo systemctl start anchor-engine
   sudo systemctl status anchor-engine
   ```

6. Configure firewall:
   ```bash
   sudo ufw allow 3160/tcp
   sudo ufw enable
   ```

---

### Option 4: Kubernetes

**Best for:** Enterprise, auto-scaling

**Requirements:**
- Kubernetes 1.25+
- PersistentVolume for data

**Deployment YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: anchor-engine
spec:
  replicas: 1
  selector:
    matchLabels:
      app: anchor-engine
  template:
    metadata:
      labels:
        app: anchor-engine
    spec:
      containers:
      - name: anchor-engine
        image: anchor-engine:latest
        ports:
        - containerPort: 3160
        volumeMounts:
        - name: data
          mountPath: /app/mirrored_brain
        - name: backups
          mountPath: /app/backups
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: anchor-data-pvc
      - name: backups
        persistentVolumeClaim:
          claimName: anchor-backups-pvc
```

---

## Ephemeral Database Architecture

Anchor Engine uses an **ephemeral database** pattern. The PGlite database is automatically wiped and rebuilt on every startup. This is an intentional design decision that prevents corruption and ensures a clean state.

### Source of Truth

| Directory | Role | Persistence |
|-----------|------|-------------|
| `inbox/` | **Source of Truth** | ✅ Permanent - never deleted |
| `external-inbox/` | **Source of Truth** | ✅ Permanent - never deleted |
| `mirrored_brain/` | Rebuildable Cache | 🔄 Wiped on startup |
| PGlite Database | Ephemeral Index | 🔄 Wiped on startup |

### Why Wipe on Startup?

1. **Prevents Corruption**: PGlite (WASM PostgreSQL) can become corrupted from unclean shutdowns
2. **Eliminates "Hanging Ingestion"**: Corrupted databases cause ingestion to hang silently
3. **Deterministic State**: Every startup begins from a known good state
4. **No Data Loss**: Data is preserved in `inbox/` and rebuilt automatically

### Startup Sequence

```
1. Wipe PGlite database directory
2. Wipe mirrored_brain/ directory
3. Initialize fresh PGlite instance
4. Mirror Protocol: Copy inbox/ → mirrored_brain/
5. Ingest mirrored_brain/ into database
6. Start accepting queries
```

### Configuration

**Default (Recommended):**
```json
{
  "database": {
    "wipe_on_startup": true
  }
}
```

⚠️ **Never set `wipe_on_startup: false`** for performance reasons. This causes corruption accumulation and leads to the "hanging ingestion" bug.

### Recovery from Corruption

If the engine hangs during ingestion:

```bash
# 1. Force kill
pkill -9 -f "anchor-engine"

# 2. Restart (automatic wipe and rebuild)
pnpm start

# 3. Monitor progress
tail -f engine/logs/server.log
```

See [Standard 020: Ephemeral Database](../specs/current-standards/020-ephemeral-database.md) for complete details.

---

## Configuration

### user_settings.json

**Location:** `~/.config/anchor/user_settings.json` or project root

**Key Settings:**
```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3160,
    "api_key": "your-secret-key"
  },
  "database": {
    "wipe_on_startup": true  // Default: wipe and rebuild on every startup
  },
  "watcher": {
    "debounce_ms": 2000,
    "exclude_patterns": ["**/*.log", "**/node_modules/**"]
  },
  "search": {
    "max_chars_default": 524288,
    "strategy": "hybrid"
  },
  "adaptive_concurrency": {
    "environment": "auto",
    "sequential_threshold_mb": 2048,
    "parallel_threshold_mb": 8192
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANCHOR_URL` | `http://localhost:3160` | API endpoint |
| `ANCHOR_API_KEY` | (none) | API authentication |
| `PROJECT_ROOT` | (auto-detect) | Project root path |
| `CONTEXT_DIR` | (auto-detect) | Context data directory |

---

## Security

### Firewall Rules

**Minimum Required:**
```bash
# Allow Anchor Engine port
sudo ufw allow 3160/tcp

# If using MCP remotely (not recommended)
sudo ufw allow 3161/tcp
```

### API Key Authentication

1. Generate key:
   ```bash
   openssl rand -hex 32
   ```

2. Add to `user_settings.json`:
   ```json
   {
     "server": {
       "api_key": "your-generated-key"
     }
   }
   ```

3. Use in requests:
   ```bash
   curl -H "Authorization: Bearer your-key" \
     http://localhost:3160/v1/stats
   ```

### HTTPS/TLS (Production)

**With Nginx Reverse Proxy:**
```nginx
server {
    listen 443 ssl;
    server_name anchor.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/anchor.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anchor.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3160;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Monitoring

### Health Checks

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "uptime": "2d 4h 15m",
  "memory_mb": 512
}
```

**Uptime Monitoring:**
```bash
# Cron job every 5 minutes
*/5 * * * * curl -f http://localhost:3160/health || echo "Anchor Engine DOWN" | mail -s "Alert" admin@example.com
```

### Logs

**Location:** `engine/logs/server.log`

**Log Rotation:**
```bash
sudo nano /etc/logrotate.d/anchor-engine
```

```
/var/log/anchor-engine/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
}
```

---

## Backup & Restore

### Manual Backup
```bash
# Create backup
curl -X POST http://localhost:3160/v1/backup

# Backup location: ./backups/backup-YYYY-MM-DDTHH-MM-SS/
```

### Automated Backup
```bash
# Cron job daily at 2am
0 2 * * * curl -X POST http://localhost:3160/v1/backup
```

### Restore
```bash
curl -X POST http://localhost:3160/v1/backup/restore \
  -H "Content-Type: application/json" \
  -d '{"filename": "backup-2026-03-18T02-00-00"}'
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3160
lsof -i :3160

# Kill process
kill -9 <PID>
```

### Out of Memory
```json
{
  "adaptive_concurrency": {
    "environment": "low_memory"
  }
}
```

### Database Corruption
```bash
# Stop engine
pnpm stop

# Delete database (data preserved in mirrored_brain/)
rm -rf engine/context_data

# Restart (auto-rebuilds)
pnpm start
```

### Permission Errors
```bash
# Fix ownership
sudo chown -R $USER:$USER ~/.config/anchor
sudo chown -R $USER:$USER ~/.local/share/anchor
```

---

## Performance Tuning

### Low Memory (<2GB RAM)
```json
{
  "adaptive_concurrency": {
    "environment": "low_memory",
    "sequential_threshold_mb": 512
  },
  "search": {
    "max_chars_default": 262144
  }
}
```

### High Performance (>8GB RAM)
```json
{
  "adaptive_concurrency": {
    "environment": "high_memory",
    "parallel_threshold_mb": 4096,
    "max_concurrency": 10
  },
  "search": {
    "max_chars_default": 1048576
  }
}
```

---

## Support

- **Documentation:** [`docs/`](./)
- **Issues:** https://github.com/RSBalchII/anchor-engine-node/issues
- **Discussions:** https://github.com/RSBalchII/anchor-engine-node/discussions
