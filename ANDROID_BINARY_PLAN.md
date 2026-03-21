# 🤖 Anchor Engine Android Binary - Complete Build Plan

**Goal:** Create a one-command installable Anchor Engine MCP server for Termux/Android

---

## 📦 **What We're Building**

A standalone binary that:
1. ✅ Bundles Node.js runtime (no separate install needed)
2. ✅ Includes all native modules precompiled for arm64-android
3. ✅ Starts MCP server automatically
4. ✅ Connects to Qwen Code out of the box
5. ✅ Runs entirely on Android (Termux)

**End User Experience:**
```bash
# One command install
curl -L https://anchor-engine.io/install-android.sh | sh

# That's it! MCP server is running.
# Qwen Code automatically detects it.
```

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────┐
│                 Qwen Code (AI Agent)                │
│                    MCP Client                        │
└────────────────────┬────────────────────────────────┘
                     │ MCP Protocol (stdio)
┌────────────────────▼────────────────────────────────┐
│          anchor-mcp (Standalone Binary)             │
│  ┌──────────────────────────────────────────────┐   │
│  │  Node.js Runtime (bundled via pkg)           │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │  MCP Server (mcp-server/dist/index.js) │  │   │
│  │  │  - anchor_query                          │  │   │
│  │  │  - anchor_distill                        │  │   │
│  │  │  - anchor_ingest_text                    │  │   │
│  │  │  - anchor_ingest_file                    │  │   │
│  │  │  - etc.                                  │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │ HTTP API (localhost:3161)
┌────────────────────▼────────────────────────────────┐
│          Anchor Engine Core (Background)            │
│  ┌──────────────────────────────────────────────┐   │
│  │  - PGlite Database (embedded SQLite)         │   │
│  │  - STAR Algorithm (semantic search)          │   │
│  │  - Watchdog (file ingestion)                 │   │
│  │  - Distillation (checkpoint creation)        │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  Native Modules (prebuilt .node files)       │   │
│  │  - @rbalchii/native-fingerprint              │   │
│  │  - @rbalchii/native-atomizer                 │   │
│  │  - @rbalchii/native-keyextract               │   │
│  │  - @rbalchii/native-tagwalker                │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 📋 **Build Steps**

### **Phase 1: Fix GitHub Authentication** ✅ (In Progress)

**Current Blocker:** Can't push updates to GitHub

**Solution Options:**

#### Option A: Personal Access Token (Recommended)
```bash
# Generate token at: https://github.com/settings/tokens
# Scopes: repo, workflow

# Store in git credential helper
git config --global credential.helper store
git push

# Or use environment variable
export GH_TOKEN=ghp_xxxxxxxxxxxxx
git push
```

#### Option B: SSH Keys
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "robert@termux"

# Add to GitHub: https://github.com/settings/keys
# Test connection
ssh -T git@github.com

# Switch remote to SSH
cd /data/data/com.termux/files/home/projects/anchor-engine-node
git remote set-url origin git@github.com:RSBalchII/anchor-engine-node.git
git push
```

---

### **Phase 2: Build Native Modules for Android arm64**

**Problem:** Native modules fail to install on Termux (need NDK)

**Solution:** Prebuild on CI/CD and publish to npm

#### 2.1: Set Up Prebuild CI

Create `.github/workflows/prebuild-android.yml`:

```yaml
name: Prebuild Android Binaries

on:
  push:
    tags:
      - 'v*'

jobs:
  prebuild-android:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package:
          - @rbalchii/native-fingerprint
          - @rbalchii/native-atomizer
          - @rbalchii/native-keyextract
          - @rbalchii/native-tagwalker

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install prebuildify
        run: npm install -g prebuildify

      - name: Download Android NDK
        run: |
          wget https://dl.google.com/android/repository/android-ndk-r26-linux.zip
          unzip android-ndk-r26-linux.zip
          export ANDROID_NDK_HOME=$PWD/android-ndk-r26

      - name: Build for arm64-android
        run: |
          cd packages/${{ matrix.package }}
          prebuildify --target 20 --arch arm64 --platform android

      - name: Upload prebuilds
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.package }}-android
          path: packages/${{ matrix.package }}/prebuilds/
```

#### 2.2: Alternative - Build Locally in Termux

```bash
# Install build tools in Termux
pkg install python nodejs-lts clang llvm lld binutils

# Install node-gyp
npm install -g node-gyp

# Build each native module
cd /data/data/com.termux/files/home/projects/anchor-engine-node
npm rebuild @rbalchii/native-fingerprint
npm rebuild @rbalchii/native-atomizer
npm rebuild @rbalchii/native-keyextract
npm rebuild @rbalchii/native-tagwalker

# Copy prebuilds to package
mkdir -p node_modules/@rbalchii/native-fingerprint/prebuilds/android-arm64
cp build/Release/fingerprint.node node_modules/@rbalchii/native-fingerprint/prebuilds/android-arm64/
```

---

### **Phase 3: Create Standalone MCP Binary**

#### 3.1: Install pkg (Node.js to Binary Compiler)

```bash
npm install -g pkg
```

#### 3.2: Create MCP Entry Point

Create `mcp-server/bin/anchor-mcp`:

```javascript
#!/usr/bin/env node
/**
 * Anchor MCP - Standalone Binary Entry Point
 * Bundled with pkg for Android
 */

// Set default env vars if not provided
process.env.ANCHOR_API_URL = process.env.ANCHOR_API_URL || 'http://localhost:3161';
process.env.ANCHOR_API_KEY = process.env.ANCHOR_API_KEY || '';

// Import and run MCP server
import('../dist/index.js').then(server => {
  console.error('🔌 Anchor MCP Server starting...');
}).catch(err => {
  console.error('❌ Failed to start MCP server:', err);
  process.exit(1);
});
```

#### 3.3: Build Binary with pkg

Add to `mcp-server/package.json`:

```json
{
  "bin": {
    "anchor-mcp": "bin/anchor-mcp"
  },
  "pkg": {
    "scripts": "dist/**/*.js",
    "assets": [
      "dist/**/*"
    ],
    "targets": [
      "node20-android-arm64"
    ],
    "outputPath": "bin"
  }
}
```

Build command:

```bash
cd /data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server
pkg . --targets node20-android-arm64 --output bin/anchor-mcp-android
```

**Output:** `mcp-server/bin/anchor-mcp-android` (~70MB standalone binary)

---

### **Phase 4: Bundle Complete Anchor Engine**

#### 4.1: Create Install Script

Create `scripts/install-android.sh`:

```bash
#!/data/data/com.termux/files/usr/bin/bash
# Anchor Engine Android Installer

set -e

echo "🚀 Installing Anchor Engine for Android..."

# Check Termux
if [ ! -d "/data/data/com.termux" ]; then
  echo "❌ This script must run in Termux on Android"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pkg update
pkg install -y nodejs-lts python clang llvm lld

# Create app directory
APP_DIR="/data/data/com.termux/files/home/.anchor-engine"
mkdir -p $APP_DIR

# Download prebuilt binary
echo "⬇️  Downloading MCP server binary..."
curl -L https://github.com/RSBalchII/anchor-engine-node/releases/latest/download/anchor-mcp-android \
  -o $APP_DIR/anchor-mcp
chmod +x $APP_DIR/anchor-mcp

# Download engine binary
echo "⬇️  Downloading Anchor Engine binary..."
curl -L https://github.com/RSBalchII/anchor-engine-node/releases/latest/download/anchor-engine-android \
  -o $APP_DIR/anchor-engine
chmod +x $APP_DIR/anchor-engine

# Create systemd service (or termux-boot)
echo "⚙️  Setting up autostart..."
cat > $APP_DIR/start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Start Anchor Engine in background
$APP_DIR/anchor-engine --port 3161 &
sleep 3
# Start MCP server
exec $APP_DIR/anchor-mcp
EOF
chmod +x $APP_DIR/start.sh

# Add to shell startup
echo "" >> ~/.bashrc
echo "# Anchor Engine MCP Server" >> ~/.bashrc
echo "$APP_DIR/start.sh &" >> ~/.bashrc

# Start now
echo "🔥 Starting Anchor Engine..."
$APP_DIR/anchor-engine --port 3161 &
sleep 3
$APP_DIR/anchor-mcp &

echo ""
echo "✅ Anchor Engine installed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Restart Qwen Code - it will auto-detect the MCP server"
echo "   2. Or manually configure: ~/.qwen/mcp.json"
echo "   3. Check status: curl http://localhost:3161/health"
echo ""
echo "🎉 Ready to use!"
```

---

### **Phase 5: GitHub Releases Setup**

Create `.github/workflows/release-android.yml`:

```yaml
name: Build Android Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-android:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Build engine
        run: pnpm build

      - name: Build MCP binary for Android
        run: |
          cd mcp-server
          npm install -g pkg
          pkg . --targets node20-android-arm64 --output anchor-mcp-android

      - name: Build engine binary for Android
        run: |
          npm install -g pkg
          pkg engine/dist/index.js \
            --targets node20-android-arm64 \
            --output anchor-engine-android \
            --public

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            mcp-server/anchor-mcp-android
            anchor-engine-android
            scripts/install-android.sh
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📊 **Timeline & Milestones**

| Phase | Task | Estimated Time | Status |
|-------|------|----------------|--------|
| 1 | Fix GitHub Auth | 30 min | 🔴 Blocked |
| 2 | Build Native Modules | 2-4 hours | ⏳ Pending |
| 3 | Create MCP Binary | 1-2 hours | ⏳ Pending |
| 4 | Create Install Script | 1 hour | ⏳ Pending |
| 5 | GitHub Releases CI | 1-2 hours | ⏳ Pending |
| 6 | Test on Clean Device | 1 hour | ⏳ Pending |

**Total Estimated Time:** 6-10 hours

---

## 🧪 **Testing Checklist**

### On Clean Termux Installation:

- [ ] Fresh Termux install
- [ ] Run `curl ... | sh` install script
- [ ] Verify binaries in `~/.anchor-engine/`
- [ ] Check port 3161 listening
- [ ] Test MCP server starts
- [ ] Qwen Code auto-detects
- [ ] Test `anchor_query` tool
- [ ] Test `anchor_ingest_text` tool
- [ ] Verify data persists after restart
- [ ] Check memory usage (<1GB RAM)

---

## 📦 **Deliverables**

1. **GitHub Release** (v4.8.2-android)
   - `anchor-mcp-android` (70MB)
   - `anchor-engine-android` (80MB)
   - `install-android.sh` (3KB)

2. **Documentation**
   - `ANDROID_INSTALL.md` - User guide
   - `ANDROID_BUILD.md` - Build from source
   - `QWEN_CODE_INTEGRATION.md` - Already done ✅

3. **npm Package Update**
   - `@rbalchii/anchor-engine@4.8.2-android`
   - Includes prebuilt native modules

---

## 🚀 **Quick Start (After Build)**

```bash
# User runs this one command:
curl -L https://github.com/RSBalchII/anchor-engine-node/releases/latest/download/install-android.sh | sh

# That's it! Everything else is automatic.
```

---

**Created:** 2026-03-21  
**Version:** 1.0  
**Target:** Android arm64 (Termux)  
**Next Action:** Fix GitHub authentication (Phase 1)
