with open('engine/src/services/ingest/code-ast-parser.ts', 'rb') as f:
    content = f.read()

new_content = content.replace(
    b'const wasmPath = path.join(__dirname, \'../../../../node_modules/web-tree-sitter/web-tree-sitter.wasm\');',
    b'const wasmPath = path.join(__dirname, \'../../../web-tree-sitter/web-tree-sitter.wasm\');'
)

with open('engine/src/services/ingest/code-ast-parser.ts', 'wb') as f:
    f.write(new_content)

print('Fixed WASM path')