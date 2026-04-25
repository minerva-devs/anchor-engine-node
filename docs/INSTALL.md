# Installation & Setup Guide

## Quick Start (Recommended)

### Prerequisites
- Node.js 18+ installed from [nodejs.org](https://nodejs.org/)
- Git Bash or PowerShell available

### Step 1: Clone the Repository
```bash
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node
```

### Step 2: Install Dependencies & Build
```bash
pnpm install   # Installs dependencies (includes build via postinstall)
pnpm build     # Builds all TypeScript packages
```

### Step 3: Configure Settings
Copy and configure the settings template:
```bash
copy user_settings.json.template user_settings.json
```
Edit `user_settings.json` with your desired configuration, especially:
- `server.api_key` - Required! Set a secure key (min 32 chars, mixed case + digit)
- `paths.anchor_root` - Where to store data

### Step 4: Start the Engine
```bash
pnpm start
```

The engine will start on `http://localhost:3160`. Visit [http://localhost:3160](http://localhost:3160) in your browser.

## Alternative Installation Methods

### Windows (PowerShell)
```powershell
.\install.ps1
```

### macOS / Linux (Bash)
```bash
./install.sh
```

### Using anchor.bat (Windows only)
Double-click `anchor.bat` or run:
```cmd
anchor.bat
```

## Configuration

See [user_settings.json.template](../user_settings.json.template) for all options.

### Required Settings
- **`server.api_key`**: Authentication key for API access
  - Min length: 32 characters
  - Must contain: uppercase, lowercase, digit
  - Example: `MySecureKey123!` or use crypto random: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### Paths Configuration
The engine uses these directories (relative to project root):
- `local-data/inbox/` - Content to be ingested
- `local-data/external-inbox/` - External imports
- `local-data/mirrored_brain/` - Derived knowledge graph data
- `logs/` - Log files

## Common Issues

### "Cannot find module" Errors
If you see TypeScript compilation errors about `fileURLToPath`, ensure you're using Node.js 18+ and the project was cloned from a clean state (not a fork with modified paths).

### Database Initialization
The engine creates its PostgreSQL database on first start. This may take 30-60 seconds. Wait for the health check to return `healthy` before proceeding.

## Post-Installation Checklist

- [ ] Engine starts without errors
- [ ] Browser access: http://localhost:3160 works
- [ ] Health check returns: `http://localhost:3160/health` → `{ "status": "healthy" }`
- [ ] API key is set in `user_settings.json`

## Next Steps

1. **Add watch paths**: Use the Settings UI to add directories to watch (notebook, inbox, etc.)
2. **Configure MCP** (optional): See [MCP Documentation](./../mcp-server/README.md) for AI agent integration
3. **Start ingesting content**: Drag files into the inbox or use the API

## Troubleshooting

See [TROUBLESHOOTING.md](./../docs/TROUBLESHOOTING.md) for common issues and solutions.

---

*Last updated: April 2026*