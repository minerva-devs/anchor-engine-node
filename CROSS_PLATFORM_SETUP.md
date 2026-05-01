# Cross-Platform .anchor Directory Setup

## Overview

The Anchor Engine project now automatically creates and configures the `.anchor` directory for each user during `pnpm install`. This ensures:

1. **Automatic setup** - No manual configuration needed
2. **Cross-platform compatibility** - Works on Windows, Linux, and macOS
3. **User-specific data** - Each user gets their own isolated environment
4. **Proper directory structure** - All required folders created automatically

---

## How It Works

### Installation Flow

When you run `pnpm install`, the following happens:

1. **Postinstall script triggers** (defined in `package.json`)
2. **Setup script runs first** (`node setup-user-config.mjs`)
3. **Project builds** (`pnpm build:all`)
4. **Ready to use!**

### Setup Script Steps

The `setup-user-config.mjs` script performs these operations:

1. **Detects user home directory**:
   - Windows: `C:\Users\<username>` (via `process.env.USERPROFILE`)
   - Linux/macOS: `/home/<username>` or `/Users/<username>` (via `process.env.HOME`)

2. **Creates `.anchor/` root directory** if it doesn't exist

3. **Reads configuration template** from `user_settings.json.template`

4. **Expands placeholders**:
   - `<ANCHOR_ROOT>` → detected user home path
   - `${anchor_root}` → detected user home path

5. **Creates directory structure**:
   - notebook/
   - inbox/
   - external-inbox/
   - distills/
   - mirrored_brain/
   - sessions/
   - logs/

6. **Writes `user_settings.json`** with all paths correctly configured

---

## Generated Structure

### On Windows:
```
C:\Users\<username>\.anchor\
├── user_settings.json          ← Expanded configuration
├── notebook/                    ← Empty storage directory
├── inbox/                       ← User-uploaded files for ingestion
├── external-inbox/             ← External sources (GitHub, web)
├── distills/                   ← Distillation output
├── mirrored_brain/             ← Brain state mirror
├── sessions/                   ← Active session data
└── logs/                       ← Engine runtime logs
```

### On Linux/macOS:
```
/home/<username>/.anchor/
├── user_settings.json          ← Expanded configuration
├── notebook/                    ← Empty storage directory
├── inbox/                       ← User-uploaded files for ingestion
├── external-inbox/             ← External sources (GitHub, web)
├── distills/                   ← Distillation output
├── mirrored_brain/             ← Brain state mirror
├── sessions/                   ← Active session data
└── logs/                       ← Engine runtime logs
```

---

## Configuration File

The generated `user_settings.json` contains:

- **Server configuration**: Port, API key, health endpoint
- **UI configuration**: Default API key, proxy settings
- **GitHub integration**: Token placeholder (requires manual setup)
- **Path mappings**: All paths relative to anchor_root
- **Search settings**: Strategy, confidence thresholds
- **Resource management**: Memory limits, GC cooldown
- **Watcher configuration**: Auto-ingestion paths

---

## Helper Commands

### Manual Setup
If you need to manually run the setup script:
```bash
pnpm run setup-user-config
```

### Clean Project Root Directories
Before reinstalling, clean up project root directories:
```bash
pnpm run cleanup-anchor
```

---

## Testing Results

### Windows Test (Current System)
```
pnpm install --frozen-lockfile

. postinstall$ node setup-user-config.mjs && pnpm build:all
. postinstall: 🔧 Anchor Engine User Config Setup
. postinstall: ==================================================
. postinstall: 📍 Detected User Home: C:\Users\rsbiiw
. postinstall: ✨ Creating root directory: C:\Users\rsbiiw\.anchor
. postinstall: 📄 Reading template: user_settings.json.template
. postinstall: 🔄 Expanding variables...
. postinstall: ✅ Created C:\Users\rsbiiw\.anchor\user_settings.json
. postinstall: 📁 Creating directory structure: 7 directories...
. postinstall:   ✓ notebook/
. postinstall:   ✓ inbox/
. postinstall:   ✓ external-inbox/
. postinstall:   ✓ distills/
. postinstall:   ✓ mirrored_brain/
. postinstall:   ✓ sessions/
. postinstall:   ✓ logs/
. postinstall: ==================================================
. postinstall: ✅ Configuration setup complete!
```

### Verification
```bash
dir "C:\Users\rsbiiw\.anchor" /s /b

C:\Users\rsbiiw\.anchor\distills
C:\Users\rsbiiw\.anchor\external-inbox
C:\Users\rsbiiw\.anchor\inbox
C:\Users\rsbiiw\.anchor\logs
C:\Users\rsbiiw\.anchor\mirrored_brain
C:\Users\rsbiiw\.anchor\notebook
C:\Users\rsbiiw\.anchor\sessions
C:\Users\rsbiiw\.anchor\user_settings.json
```

---

## Cross-Platform Compatibility

| Platform | User Detection Method | Example Path |
|----------|----------------------|--------------|
| Windows | `process.env.USERPROFILE` | `C:\Users\rsbiiw` |
| Linux | `process.env.HOME` | `/home/username` |
| macOS | `process.env.HOME` | `/Users/username` |

---

## Files Modified/Created

### Created:
- `setup-user-config.mjs` - Main setup script
- `scripts/cleanup-root.mjs` - Helper for cleaning project root
- `scripts/cleanup-anchor-dir.ps1` - Windows cleanup helper
- `scripts/cleanup-anchor-dir.sh` - Linux/macOS cleanup helper
- `CROSS_PLATFORM_SETUP.md` - This documentation

### Modified:
- `package.json` - Added postinstall script and helper commands

---

## Troubleshooting

### Issue: "Directory already exists"
**Solution**: The setup script will overwrite existing `.anchor/` if it doesn't contain `user_settings.json`. If you have important data, backup first.

### Issue: "Configuration paths incorrect"
**Solution**: Manually run the setup script:
```bash
pnpm run setup-user-config
```

---

## Summary

✅ **Automatic on install** - No manual steps required  
✅ **Cross-platform ready** - Windows, Linux, macOS supported  
✅ **User-isolated data** - Each user gets their own environment  
✅ **Proper structure** - All directories created automatically  
✅ **Valid configuration** - JSON with correct paths generated  

---

*Generated: 2026-05-01*
