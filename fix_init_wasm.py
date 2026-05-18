with open('engine/src/services/ingest/code-ast-parser.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the initWebAssembly function to use correct WASM path
old_text = """async function initWebAssembly() {
  if (_webAssemblyInitialized) return;
  const wasmPath = join(getWasmDir(), 'tree-sitter-wasms', 'out');"""

new_text = """async function initWebAssembly() {
  if (_webAssemblyInitialized) return;
  const wasmDir = getWasmDir();
  // Check if wasm file exists in the returned directory or with standard name
  let wasmPath: string;
  if (wasmDir.endsWith('web-tree-sitter')) {
    // Strategy 3 returned web-tree-sitter dir, use its wasm file
    wasmPath = join(wasmDir, 'web-tree-sitter.wasm');
  } else {
    // Other strategies return tree-sitter-wasms/out
    wasmPath = join(wasmDir, 'tree-sitter-typescript.wasm');
  }"""

content = content.replace(old_text, new_text)

with open('engine/src/services/ingest/code-ast-parser.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed initWebAssembly function')