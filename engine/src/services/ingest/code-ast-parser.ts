/**
 * Code AST Parser – semantic atomization of TypeScript / JavaScript files.
 *
 * Parses source code with tree-sitter, walks the syntax tree and extracts
 * structural atoms (functions, classes, methods) together with
 * metadata such as function name, class context, imports, etc.
 */

import Parser from 'tree-sitter';

// ── Public types ────────────────────────────────────────────────────────

export interface CodeBlock {
  type: 'function' | 'class' | 'method' | 'arrow_function' | 'block';
  name: string | null;
  classContext: string | null;
  startLine: number;
  endLine: number;
  startByte: number;
  endByte: number;
  text: string;
  imports: string[];
}

export interface CodeStructure {
  blocks: CodeBlock[];
}

// ── Language modules loading (dynamic ES import to avoid require()/await conflict) ──

let tsLangModule: { typescript: unknown; tsx?: unknown } | undefined;
let jsLangModule: { language: unknown } | undefined;

async function loadModules() {
  if (tsLangModule && jsLangModule) return;
  // @ts-ignore — tree-sitter-* bindings lack ES module type declarations but work at runtime
  const tsMod = await import('tree-sitter-typescript/bindings/node');
  // @ts-ignore
  const jsMod = await import('tree-sitter-javascript/bindings/node');
  tsLangModule = (tsMod as any).default ?? tsMod;
  jsLangModule = (jsMod as any).default ?? jsMod;
}

// ── Language registry ───────────────────────────────────────────────────

const LANGUAGES: Record<string, Parser.Language> = {};

async function getLanguage(key: string): Promise<Parser.Language> {
  if (LANGUAGES[key]) return LANGUAGES[key];
  await loadModules();
  let lang: Parser.Language | undefined;

  if (key === 'typescript') lang = tsLangModule!.typescript as unknown as Parser.Language;
  else if (key === 'tsx') lang = (tsLangModule! as any).tsx as unknown as Parser.Language;
  else if (key === 'javascript') lang = jsLangModule!.language as unknown as Parser.Language;

  if (!lang) throw new Error(`Unsupported language key: ${key}`);

  const parser = new Parser();
  parser.setLanguage(lang);
  LANGUAGES[key] = lang!;
  return lang!;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractNodeName(node: Parser.SyntaxNode): string | null {
  // field name 'name' is the canonical way in tree-sitter v0.25
  const nameChild = node.childForFieldName('name');
  if (nameChild && nameChild.text.trim()) return nameChild.text.trim();

  // fallback: first named child that isn't a keyword/comment
  for (const child of node.namedChildren) {
    if (!child.text.startsWith('#') && child.type !== 'statement_block') {
      const inner = extractNameFromExpression(child);
      if (inner) return inner;
    }
  }
  return null;
}

function extractNameFromExpression(node: Parser.SyntaxNode): string | null {
  switch (node.type) {
    case 'identifier':
      return node.text;
    case 'member_expression': {
      const obj = node.childForFieldName('object');
      const prop = node.childForFieldName('property');
      if (obj && prop) return `${obj.text}.${prop.text}`;
      break;
    }
  }
  const id = node.namedChildren.find(c => c.type === 'identifier');
  return id ? id.text : null;
}

function gatherImports(rootNode: Parser.SyntaxNode): string[] {
  const imports: string[] = [];
  function walk(node: Parser.SyntaxNode) {
    if (node.type === 'import_statement' || node.type === 'import_clause') {
      const mod = node.childForFieldName('source');
      if (mod) {
        const spec = mod.text.replace(/^['"`]|['"`]$/g, '');
        if (spec && !imports.includes(spec)) imports.push(spec);
      }
    }
    for (const child of node.namedChildren) walk(child);
  }
  walk(rootNode);
  return imports;
}

function collectBlocks(code: string, rootNode: Parser.SyntaxNode): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  function visit(node: Parser.SyntaxNode) {
    let blockType: CodeBlock['type'] | null = null;
    let name: string | null = null;
    let classContext: string | null = null;

    if (node.type === 'function_declaration') {
      blockType = 'function';
      const funcNameNode = node.childForFieldName('name');
      name = funcNameNode ? funcNameNode.text.trim() : null;
    } else if (node.type === 'class_declaration' || node.type === 'class_expression') {
      blockType = 'class';
      name = extractNodeName(node);
    } else if (node.type === 'method_definition' || node.type === 'field_definition') {
      blockType = 'method';
      const fieldName = node.childForFieldName('name');
      if (fieldName) name = fieldName.text.trim();
      else {
        for (const child of node.namedChildren) {
          if (child.type !== 'statement_block' && !child.text.startsWith('#')) {
            name = child.text;
            break;
          }
        }
      }

      // Walk ancestors to find enclosing class/interface
      let ancestor = node.parent;
      while (ancestor) {
        if (ancestor.type === 'class_declaration' || ancestor.type === 'class_expression') {
          const clsName = extractNodeName(ancestor);
          if (clsName) classContext = clsName;
          break;
        }
        if (ancestor.type === 'interface_declaration') {
          const ifaceName = ancestor.childForFieldName('name');
          if (ifaceName) classContext = ifaceName.text.trim();
          break;
        }
        ancestor = ancestor.parent;
      }
    } else if (node.type === 'arrow_function' || node.type === 'function_expression') {
      blockType = 'arrow_function';
      name = extractNodeName(node);
    }

    if (blockType && name) {
      blocks.push({
        type: blockType,
        name,
        classContext,
        startLine: node.startPosition.row + 1, // 1-indexed for human readers
        endLine: node.endPosition.row + 1,
        startByte: node.startIndex,
        endByte: node.endIndex,
        text: code.substring(node.startIndex, node.endIndex),
        imports: [], // filled later
      });

      for (const child of node.namedChildren) visit(child);
    } else {
      for (const child of node.namedChildren) visit(child);
    }
  }

  for (const child of rootNode.namedChildren) visit(child);

  blocks.sort((a, b) => a.startByte - b.startByte);
  return blocks;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Parse source code and extract semantic atoms.
 */
export async function parseCodeStructure(
  code: string,
  language: 'typescript' | 'tsx' | 'javascript',
): Promise<CodeStructure | null> {
  try {
    const lang = await getLanguage(language);
    const parser = new Parser();
    parser.setLanguage(lang);
    parser.setTimeoutMicros(5_000_000); // 5 s generous timeout

    const tree = parser.parse(code);

    if (!tree || !tree.rootNode) return null;
    if ((tree.rootNode as any).hasError) {
      // some builds have hasError() method, others use a field
      const errFn = (tree.rootNode as any).hasError;
      if (typeof errFn === 'function' && errFn()) return null;
    }

    const blocks = collectBlocks(code, tree.rootNode);
    const imports = gatherImports(tree.rootNode);

    for (const block of blocks) {
      block.imports = [...imports];
    }

    return { blocks };
  } catch (err: any) {
    console.warn('[astParser] Parse failed:', err.message);
    return null;
  }
}

// ── Language detection from file extension ──────────────────────────────

export const CODE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'] as const;

/** Map a file extension to a tree-sitter language key */
export function extToLanguage(ext: string): 'typescript' | 'tsx' | 'javascript' | null {
  switch (ext) {
    case 'ts': return 'typescript';
    case 'tsx': return 'tsx';
    case 'js': return 'javascript';
    case 'jsx': return 'javascript';
    default: return null;
  }
}
