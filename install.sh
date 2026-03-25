#!/bin/bash
# Anchor Engine One-Shot Installer
# Handles complete setup from fresh clone to running engine

set -e  # Exit on error

echo "⚓ Anchor Engine Installer"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm not found. Installing...${NC}"
    npm install -g pnpm
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Found: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"
echo -e "${GREEN}✅ pnpm $(pnpm -v)${NC}"

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install

echo ""
echo -e "${YELLOW}🔨 Building engine...${NC}"
pnpm build:all

echo ""
echo -e "${YELLOW}📁 Creating required directories...${NC}"
mkdir -p notebook/inbox
mkdir -p notebook/external-inbox
mkdir -p .anchor/mirrored_brain
mkdir -p logs
mkdir -p engine/context_data

echo ""
echo -e "${YELLOW}⚙️  Setting up configuration...${NC}"

# Create user_settings.json if it doesn't exist
if [ ! -f "user_settings.json" ]; then
    cat > user_settings.json << 'EOF'
{
    "server": {
        "host": "0.0.0.0",
        "port": 3160,
        "api_key": "bolt-memory-secret"
    },
    "encryption": {
        "enabled": false,
        "password_storage": "env",
        "password_env_var": "ANCHOR_MASTER_PASSWORD",
        "min_confidence": 0.7,
        "auto_encrypt_on_ingest": true,
        "auto_decrypt_on_search": true,
        "detect_nsfw": false,
        "dry_run": false
    },
    "search": {
        "strategy": "hybrid",
        "hide_years_in_tags": true,
        "whitelist": [],
        "max_chars_default": 524288,
        "max_chars_limit": 20000
    },
    "watcher": {
        "debounce_ms": 2000,
        "stability_threshold_ms": 2000,
        "extra_paths": []
    },
    "database": {
        "wipe_on_startup": false
    },
    "memory": {
        "throttle_start_mb": 1500,
        "throttle_max_mb": 2500,
        "emergency_stop_mb": 3500
    },
    "mcp": {
        "enabled": true,
        "rate_limit_requests_per_minute": 60,
        "max_query_results": 50,
        "allowed_operations": ["query", "read_file", "get_stats", "distill", "illuminate", "list", "ingest_text", "ingest_file", "github_ingest", "watchdog"],
        "blocked_operations": [],
        "allow_write_operations": true,
        "default_bucket_for_writes": "external-inbox"
    }
}
EOF
    echo -e "${GREEN}✅ Created user_settings.json${NC}"
else
    echo -e "${GREEN}✅ user_settings.json already exists${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Running health check...${NC}"

# Start engine in background
echo "Starting engine for health check..."
node engine/dist/index.js > logs/anchor-engine.log 2>&1 &
ENGINE_PID=$!

# Wait for startup
sleep 8

# Check health
HEALTH_STATUS=$(curl -s http://localhost:3160/health 2>/dev/null || echo '{"status":"error"}')

if echo "$HEALTH_STATUS" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Engine is healthy${NC}"
    echo -e "${GREEN}✅ API: http://localhost:3160${NC}"
    echo -e "${GREEN}✅ Health: http://localhost:3160/health${NC}"
else
    echo -e "${RED}⚠️  Engine health check failed${NC}"
    echo "Check logs: tail -f logs/anchor-engine.log"
fi

# Stop the test instance
kill $ENGINE_PID 2>/dev/null || true

echo ""
echo "=========================="
echo -e "${GREEN}⚓ Installation Complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the engine:"
echo "   pnpm start"
echo ""
echo "2. Open the UI:"
echo "   http://localhost:3160"
echo ""
echo "3. Add watch paths in Settings UI:"
echo "   - Click 'Manage Paths'"
echo "   - Add your chat/notebook directories"
echo "   - Start watchdog when ready"
echo ""
echo "4. For LLM integration (MCP):"
echo "   - MCP Server: mcp-server/dist/index.js"
echo "   - Tools: anchor_query, anchor_distill, anchor_watchdog_start, etc."
echo ""
echo "Default directories created:"
echo "   - notebook/inbox/ (your content)"
echo "   - notebook/external-inbox/ (external imports)"
echo "   - .anchor/mirrored_brain/ (derived data)"
echo ""
echo "Logs: tail -f logs/anchor-engine.log"
echo ""
