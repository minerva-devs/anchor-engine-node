# Building Anchor Engine

## Available Build Targets

### Windows 11 (x64) — standalone executable
```sh
cd engine
pnpm install
pnpm run build:win
# Output: engine/dist-win/anchor-engine.exe (~40MB)
```
Run from Windows. No dependencies required — fully self-contained.

### Android / Linux ARM64 — bundled binary for Flutter APK
```sh
# MUST run on Linux or WSL2 — cross-compile from Windows not supported
cd engine
pnpm install
pnpm run build:android
# Output: engine/dist-android/anchor-engine (~40MB)
```
Then use `anchor-android/sync_engine.sh` to copy into Flutter assets.

### Development (local Node.js)
```sh
cd engine
pnpm install
pnpm run build   # TypeScript compile only → dist/
pnpm start       # node --expose-gc --max-old-space-size=6144 dist/index.js
```

### Both standalone targets at once
```sh
# From Linux/WSL2 only
cd engine
pnpm run build:standalone
# Produces both dist-android/anchor-engine AND dist-win/anchor-engine.exe
```

## Platform Notes

| Target | Build platform | Script |
|--------|---------------|--------|
| `node18-win-x64` | Windows or Linux/WSL | `build:win` |
| `node18-linux-arm64` | **Linux/WSL2 only** | `build:android` |

`@yao-pkg/pkg` bundles a full Node.js 18 runtime + all dependencies (WASM modules, PGlite, wink-nlp) into a single executable. The resulting binaries are ~40-50MB compressed.

## What's Bundled

- Node.js v18.20.4 runtime
- PGlite (PostgreSQL WASM) — the embedded database
- `@rbalchii/anchor-atomizer-wasm` — Rust/WASM text chunker
- `@rbalchii/anchor-fingerprint-wasm` — Rust/WASM simhash
- `@rbalchii/anchor-keyextract-wasm` — Rust/WASM keyword extraction
- `@rbalchii/anchor-tagwalker-wasm` — Rust/WASM physics walker
- `wink-nlp` + `wink-eng-lite-web-model` — NLP enrichment
- Express HTTP server (port 3160)

## Data Storage

The engine stores its PGlite database and context data relative to the working
directory where it's launched. For Android, the Flutter app sets this to the
app's private storage directory via the `ANCHOR_DATA_DIR` environment variable.
