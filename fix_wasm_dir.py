with open('engine/src/services/ingest/code-ast-parser.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add a new strategy to find WASM files in the web-tree-sitter package
old_text = """  // Strategy 3: Use process.cwd() to find project root and look in pnpm structure"""

new_text = """  // Strategy 3: Check for web-tree-sitter package (contains its own wasm)
  const cwd = process.cwd();
  const wasmPath = join(cwd, 'node_modules', 'web-tree-sitter', 'web-tree-sitter.wasm');
  if (fs.existsSync(wasmPath)) {
    return join(cwd, 'node_modules', 'web-tree-sitter');
  }

  // Strategy 4: Use process.cwd() to find project root and look in pnpm structure"""

content = content.replace(old_text, new_text)

with open('engine/src/services/ingest/code-ast-parser.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Added web-tree-sitter package detection strategy')