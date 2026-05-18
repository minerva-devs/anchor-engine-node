with open('engine/src/services/search/search-results-logger.ts', 'rb') as f:
    content = f.read()

# Fix the getLatestEntryForHash function - parse JSON Lines instead of single JSON array
old_code = b'''const entries: SearchLogEntry[] = JSON.parse(content);
    return entries.length ? entries[entries.length - 1] : null;'''

new_code = b'''const lines = content.split('\n').filter(line => line.trim() !== '');
    const entries: SearchLogEntry[] = lines.map(l => JSON.parse(l));
    return entries.length ? entries[entries.length - 1] : null;'''

content = content.replace(old_code, new_code)

with open('engine/src/services/search/search-results-logger.ts', 'wb') as f:
    f.write(content)

print('Fixed getLatestEntryForHash')