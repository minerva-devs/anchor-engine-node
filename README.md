---

## Quick Start

### Option 1: From Source (Recommended)

```bash
# Clone repo
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node

# Install and build
pnpm install
pnpm build

# Start
pnpm start

# Open in browser
open http://localhost:3160
```

### Option 2: npm Install (Coming Soon)

```bash
# Install globally (not yet published)
# npm install -g anchor-engine

# Start the engine
# anchor start

# Open in browser
# open http://localhost:3160
```

### Requirements
- Node.js v18+ (v20+ recommended)
- PNPM package manager
- Minimum 1GB RAM (4GB+ recommended)
- 10GB free storage space

### Commands

```bash
# After installing from source:
pnpm start         # Start the engine
pnpm status        # Check if engine is running
pnpm init          # Initialize config in current directory
pnpm help          # Show all commands
pnpm --version     # Show version

# Or use the binary directly:
node bin/anchor.js start
node bin/anchor.js status
```

### Configuration

- **Config file:** `~/.config/anchor/user_settings.json`
- **Data directory:** `~/.local/share/anchor/`
- **Default port:** 3160

---

## Docker Deployment
