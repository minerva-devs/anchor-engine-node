# Installing Anchor Engine via npm

## Quick Install

```bash
npm install @rbalchii/anchor-engine
```

Or with yarn:
```bash
yarn add @rbalchii/anchor-engine
```

Or with pnpm:
```bash
pnpm add @rbalchii/anchor-engine
```

## Requirements

- **Node.js:** v18+ (v20+ recommended)
- **PNPM:** Recommended package manager
- **RAM:** Minimum 1GB (4GB+ recommended)
- **Storage:** 10GB free space

## Post-Installation Setup

After installation, build the engine:

```bash
cd node_modules/@rbalchii/anchor-engine
pnpm install
pnpm build
```

## Starting the Engine

### Development Mode

```bash
pnpm dev
```

### Production Mode

```bash
pnpm start
```

This will start the Anchor Engine server on `http://localhost:3160`

## Using the CLI

Anchor Engine provides a command-line interface:

```bash
# Using npx
npx @rbalchii/anchor-engine start

# Or install globally
npm install -g @rbalchii/anchor-engine
anchor start
```

## Available Commands

| Command | Description |
|---------|-------------|
| `anchor start` | Start the engine server |
| `anchor distill` | Run radial distillation on corpus |
| `anchor illuminate` | BFS graph traversal |
| `anchor ingest <file>` | Ingest a file or directory |
| `anchor search <query>` | Search the memory graph |

## Configuration

Create a `user_settings.json` file in your project root:

```json
{
  "memory": {
    "throttle_start_mb": 1500,
    "throttle_max_mb": 2500,
    "emergency_stop_mb": 3500
  },
  "ingestion": {
    "max_file_size_mb": 10,
    "max_molecules_per_file": 10000
  }
}
```

## API Endpoints

Once running, the engine exposes REST APIs:

- `GET /v1/memory/search?query=...` - Search
- `POST /v1/ingest/file` - Ingest files
- `POST /v1/distill` - Run distillation
- `POST /v1/illuminate` - Graph traversal
- `GET /v1/stats` - System statistics

Full API documentation: https://github.com/RSBalchII/anchor-engine-node/blob/main/docs/API.md

## MCP Integration

Anchor Engine includes an MCP server for AI assistant integration:

```bash
# Start MCP server
npx @anchor/mcp-server
```

Configure in your AI assistant settings (Claude Code, Cursor, etc.)

## Troubleshooting

### Build Errors

If the build fails, try cleaning and rebuilding:

```bash
pnpm clean
pnpm install
pnpm build
```

### Port Already in Use

If port 3160 is in use, set a different port:

```bash
PORT=3161 pnpm start
```

### Out of Memory

Reduce memory thresholds in `user_settings.json`:

```json
{
  "memory": {
    "throttle_start_mb": 1000,
    "throttle_max_mb": 2000
  }
}
```

## Next Steps

- [Quick Start Guide](https://github.com/RSBalchII/anchor-engine-node#quick-start)
- [API Documentation](https://github.com/RSBalchII/anchor-engine-node/blob/main/docs/API.md)
- [Deployment Guide](https://github.com/RSBalchII/anchor-engine-node/blob/main/docs/DEPLOYMENT.md)
- [Troubleshooting](https://github.com/RSBalchII/anchor-engine-node/blob/main/docs/TROUBLESHOOTING.md)

## License

AGPL-3.0 - See [LICENSE](https://github.com/RSBalchII/anchor-engine-node/blob/main/LICENSE)

For commercial licensing options, contact: rbalchii@gmail.com
