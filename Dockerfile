# Anchor Engine Docker Image
# Simple single-stage build for development and production

FROM node:20-bookworm

# Install pnpm and runtime dependencies
RUN npm install -g pnpm && \
    apt-get update && \
    apt-get install -y libstdc++6 curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies and build
RUN pnpm install --no-frozen-lockfile && \
    pnpm run build

# Expose API port
EXPOSE 3160

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3160/health || exit 1

# Start the engine
CMD ["node", "--expose-gc", "engine/dist/index.js"]
