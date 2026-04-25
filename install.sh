#!/bin/bash
# Anchor Engine Installer

set -e

echo "⚓ Anchor Engine Installer"
echo "=========================="

# Check prerequisites
echo -e "\033[1;33mChecking prerequisites...\033[0m"

if ! command -v node &> /dev/null; then
    echo -e "\033[0;31m❌ Node.js not found. Please install Node.js 18+\033[0m"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "\033[1;33m⚠️  pnpm not found. Installing...\033[0m"
    npm install -g pnpm
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "\033[0;31m❌ Node.js 18+ required. Found: $(node -v)\033[0m"
    exit 1
fi

echo -e "\033[0;32m✅ Node.js $(node -v)\033[0m"
echo -e "\033[0;32m✅ pnpm $(pnpm -v)\033[0m"

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Install and build
echo ""
echo -e "\033[1;33m📦 Installing dependencies...\033[0m"
pnpm install

echo ""
echo -e "\033[1;33m🔨 Building engine...\033[0m"
pnpm build

echo ""
echo -e "\033[1;32m▶️  Starting engine...\033[0m"
echo "    (This will keep running until Ctrl+C)..."
pnpm start

echo ""
echo -e "\033[0;32m✅ Setup complete!\033[0m"