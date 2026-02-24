# Anchor Engine Docker Image
# Production-ready container with volume mounts for data persistence
# Uses same directory structure as native deployment

FROM node:20-bookworm

# Install pnpm and runtime dependencies
RUN npm install -g pnpm && \
    apt-get update && \
    apt-get install -y libstdc++6 curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set environment variables to use /app as project root
# This ensures paths match native deployment structure
ENV PROJECT_ROOT=/app
ENV CONTEXT_DIR=/app/engine/context_data
ENV NOTEBOOK_DIR=/app/notebook

# Copy project files
COPY . .

# Install dependencies and build
RUN pnpm install --no-frozen-lockfile && \
    pnpm run build

# Create data directories (will be mounted as volumes)
# These match the native deployment structure
RUN mkdir -p \
    /app/inbox \
    /app/external-inbox \
    /app/mirrored_brain \
    /app/backups \
    /app/engine/context_data \
    /app/notebook && \
    chown -R node:node /app

# Expose API port
EXPOSE 3160

# Health check - same endpoint as native deployment
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3160/health || exit 1

# Start the engine
# Volume mounts (configured in docker-compose.yml):
# - ./inbox:/app/inbox - Auto-ingested files
# - ./external-inbox:/app/external-inbox - External sources
# - ./mirrored_brain:/app/mirrored_brain - Source of truth filesystem
# - ./backups:/app/backups - Backup files (Phoenix Protocol)
# - anchor-data:/app/engine/context_data - Persistent database
CMD ["node", "--expose-gc", "engine/dist/index.js"]
