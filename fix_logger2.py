with open('engine/src/services/search/search-results-logger.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the JSON.parse line in getLatestEntryForHash
old_line = "const entries: SearchLogEntry[] = JSON.parse(content);"
new_lines = """const lines = content.split('\\n').filter(line => line.trim() !== '');
    const entries: SearchLogEntry[] = lines.map(l => JSON.parse(l));"""

content = content.replace(old_line, new_lines)

with open('engine/src/services/search/search-results-logger.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed getLatestEntryForHash')