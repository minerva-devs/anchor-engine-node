with open('engine/src/services/ingest/code-ast-parser.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the locateFile callback to handle both directory types
old_text = """  // Initialize parser with locateFile that resolves language-specific WASM files
  await Parser.init({
    locateFile: (filename: string) => {
      // Handle both prefix-based and direct paths
      if (filename.startsWith('tree-sitter-')) {
        // Extract language from filename like "tree-sitter-typescript.wasm"
        const parts = filename.split('.');
        const langKey = parts.slice(2, -1).join('.') || 'typescript';
        return join(wasmDir, filename);
      }
      // Fallback for other prefixes
      return join(wasmDir, `${filename}tree-sitter.wasm`);
    },
  });"""

new_text = """  // Initialize parser with locateFile that resolves language-specific WASM files
  await Parser.init({
    locateFile: (filename: string) => {
      // Check if wasmDir contains web-tree-sitter package or tree-sitter-wasms
      const hasWebTreeSitter = filename === 'web-tree-sitter.wasm' && 
                               join(wasmDir, 'web-tree-sitter.wasm').endsWith('web-tree-sitter');
      
      if (hasWebTreeSitter) {
        // Use the web-tree-sitter package's own wasm file
        return join(wasmDir, 'web-tree-sitter.wasm');
      }
      
      // Handle language-specific files from tree-sitter-wasms
      if (filename.startsWith('tree-sitter-')) {
        const parts = filename.split('.');
        const langKey = parts.slice(2, -1).join('.') || 'typescript';
        return join(wasmDir, filename);
      }
      
      // Fallback: try to find the file in wasmDir
      const fullPath = join(wasmDir, filename);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
      
      // Last resort: search for any .wasm file in wasmDir or its subdirs
      try {
        let dir = wasmDir;
        while (dir && dir.length > 0) {
          const wasmFiles = fs.readdirSync(dir).filter(f => f.endsWith('.wasm'));
          if (wasmFiles.length > 0) {
            return join(dir, wasmFiles[0]);
          }
          dir = dirname(dir);
        }
      } catch {}
      
      throw new Error(`Cannot locate WASM file: ${filename}`);
    },
  });"""

content = content.replace(old_text, new_text)

with open('engine/src/services/ingest/code-ast-parser.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed locateFile callback in initWebAssembly')