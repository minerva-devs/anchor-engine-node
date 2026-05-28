@echo off
setlocal EnableDelayedExpansion

echo "=== Testing Anchor Engine API ==="
echo.

echo "1. Testing health endpoint..."
curl -s "http://localhost:3160/health" > "test_health.txt" 2>&1
if exist "test_health.txt" (
    echo "Health check result:"
    type "test_health.txt"
) else (
    echo "Health check failed - server may not be running"
)

echo.
echo "2. Testing search endpoint (distill: prefix)..."
curl -s "http://localhost:3160/v1/memory/search?query=distill:" > "test_search.txt" 2>&1
if exist "test_search.txt" (
    echo "Search result:"
    type "test_search.txt"
) else (
    echo "Search failed"
)

echo.
echo "3. Testing GitHub ingestion API..."
curl -s -X POST "http://localhost:3160/v1/github/repos" ^
  -d "{\"url\":\"https://github.com/RSBalchII/anchor-engine-node\", \"include_history\":false, \"run_analysis\":false}"
  > "test_ingestion.txt" 2>&1
if exist "test_ingestion.txt" (
    echo "Ingestion result:"
    type "test_ingestion.txt"
)

pause