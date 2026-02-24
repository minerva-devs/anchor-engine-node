# C++ Startup & Packaging Guide

## Quick Start

### Build C++ Core

```bash
cd cpp
.\build.bat          # Windows - builds anchor_core.dll
```

**Output:** `cpp/build/Release/anchor_core.dll` (1.22 MB)

### Use in Node.js

```bash
cd packages/native
npm install
node tests/test.js   # Run tests
```

---

## Build Process Explained

### What Gets Built

```
build.bat
    ↓
CMake Configuration
    ↓
MSVC Compilation
    ↓
Output Artifacts
```

### Detailed Steps

1. **CMake Configuration**
   - Detects MSVC compiler
   - Finds bundled dependencies (SQLite3, Node.js headers)
   - Fetches nlohmann_json from GitHub
   - Generates Visual Studio solution

2. **Compilation**
   - `sqlite3.c` → `sqlite3_amalgamation.lib`
   - All `.cpp` files → `anchor_core.dll`
   - Exports FFI functions

3. **Output**
   ```
   cpp/build/Release/
   ├── anchor_core.dll           # Main DLL (FFI exports)
   ├── anchor_core.lib           # Import library
   └── sqlite3_amalgamation.lib  # SQLite3 static lib
   ```

---

## Packaging Strategy

### Option Selected: Pre-built DLL + npm Package

**Why this approach:**
- ✅ Fast installs (no compilation on user machine)
- ✅ Reliable (tested binaries)
- ✅ Professional (standard approach like `sharp`, `sqlite3`)
- ✅ Works with existing Node.js ecosystem

### Package Structure

```
@anchor-engine/native/
├── package.json          # NPM config
├── index.ts              # FFI wrapper (Koffi)
├── index.d.ts            # TypeScript definitions
├── README.md             # Documentation
├── tests/
│   └── test.js           # Test suite
└── lib/
    └── win-x64/
        └── anchor_core.dll  # Pre-built DLL
```

### Installation

```bash
npm install @anchor-engine/native
```

### Usage

```typescript
import { anchor } from '@anchor-engine/native';

// Initialize
anchor.init('./context.db');

// Search
const results = anchor.search('quantum computing', 100);

// Get stats
const stats = anchor.getStats();

// Cleanup
anchor.destroy();
```

---

## Cross-Platform Builds

### Current Status

| Platform | Status | Build Command | Output |
|----------|--------|---------------|--------|
| **Windows x64** | ✅ Complete | `.\build.bat` | `anchor_core.dll` |
| **Linux x64** | 🔜 TODO | `./build.sh` | `libanchor_core.so` |
| **macOS ARM64** | 🔜 TODO | `./build.sh` | `libanchor_core.dylib` |

### Build for All Platforms

**Option A: GitHub Actions (Recommended)**
```yaml
# .github/workflows/build-native.yml
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]
    runs-on: ${ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - name: Build C++ Core
        run: ./build.sh
      - name: Package DLL
        run: |
          mkdir -p packages/native/lib/${{ runner.os }}-x64
          cp cpp/build/Release/* packages/native/lib/${{ runner.os }}-x64/
```

**Option B: Manual Builds**
```bash
# Windows
cd cpp && .\build.bat

# Linux
cd cpp && ./build.sh

# macOS
cd cpp && ./build.sh
```

---

## Publishing to npm

### 1. Update Version

```bash
cd packages/native
npm version patch  # 1.0.0 → 1.0.1
```

### 2. Build All Platforms

```bash
# Build for each platform
# Copy DLLs to lib/
```

### 3. Publish

```bash
cd packages/native
npm publish --access public
```

### 4. Verify

```bash
npm view @anchor-engine/native
```

---

## Alternative Packaging Options

### Option B: Build from Source

**Structure:**
```
@anchor-engine/native/
├── package.json
├── install.js    # Downloads or builds
├── cpp/          # Source code
└── index.js      # FFI wrapper
```

**Pros:**
- Always matches user's platform
- Smaller npm package

**Cons:**
- Requires CMake, compiler
- Slow install (5-10 minutes)

### Option C: Standalone Executable

```bash
pkg engine/index.js --targets node18-win-x64
```

**Pros:**
- Single file distribution
- No Node.js needed

**Cons:**
- Large (~100 MB+)
- Harder to update

---

## Performance Comparison

| Approach | Install Time | Runtime Performance | Package Size |
|----------|--------------|---------------------|--------------|
| **Pre-built DLL** | <5 seconds | 3-4x faster than Node.js | ~2 MB |
| **Build from Source** | 5-10 minutes | 3-4x faster | ~500 KB |
| **Pure Node.js** | <1 second | Baseline (1x) | ~100 KB |

---

## Troubleshooting

### "DLL not found"

```bash
# Rebuild C++ core
cd cpp
.\build.bat

# Copy to package
copy build\Release\anchor_core.dll ../packages/native/lib/win-x64/
```

### "Koffi not found"

```bash
npm install koffi
```

### Build fails

```bash
# Clean build
cd cpp
rmdir /s /q build
.\build.bat
```

---

## Next Steps

1. ✅ Windows x64 build complete
2. ⏳ Build for Linux x64
3. ⏳ Build for macOS ARM64
4. ⏳ Publish to npm
5. ⏳ Add to engine dependencies

---

## Repository Status

**Branch:** `cpp-optimization`  
**Package Location:** `packages/native/`  
**DLL Location:** `cpp/build/Release/anchor_core.dll`

**GitHub:** https://github.com/RSBalchII/anchor-engine-node/tree/cpp-optimization
