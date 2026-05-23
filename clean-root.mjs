// Cleanup and Migration Script for Anchor Engine Root Directory
// Run as: node clean-root.mjs

import { existsSync, mkdirSync, readdirSync, rmSync, renameSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = process.cwd();
const USER_HOME = process.env.USERPROFILE || "C:\\Users\\rsbii";
const ANCHOR_ROOT = join(USER_HOME, ".anchor");

console.log("🔧 Anchor Engine Root Cleanup Script v1.0");
console.log("=".repeat(60));
console.log(`Working directory: ${PROJECT_ROOT}`);
console.log(`Target anchor root: ${ANCHOR_ROOT}`);

// Create .anchor if it doesn't exist
if (!existsSync(ANCHOR_ROOT)) {
  console.log(`✨ Creating .anchor directory...`);
  mkdirSync(ANCHOR_ROOT, { recursive: true });
} else {
  console.log(`✅ .anchor directory exists: ${ANCHOR_ROOT}`);
}

// ============================================
// SECTION 1: Delete temporary/debug files
// ============================================
console.log("\n🗑️  DELETING TEMP/DIRTY FILES...");

const tempFilesToDelete = [
  "$null",
  "0",
  "filename.endsWith(ext))",
  ".temp-report-gen.js",
  ".temp-write-report.js",
  "test.txt"
];

console.log("Looking for temporary files...");
try {
  const files = readdirSync(PROJECT_ROOT);
  for (const file of files) {
    if (tempFilesToDelete.some((name) => name === file)) {
      console.log(`  🗑️  Deleting: ${file}`);
      try {
        const filePath = join(PROJECT_ROOT, file);
        if (existsSync(filePath)) {
          rmSync(filePath, { force: true });
        }
      } catch (err) {
        console.error(`    ✗ Error deleting ${file}:`, err.message);
      }
    }
  }
} catch (err) {
  console.error("Error scanning directory:", err.message);
}

// ============================================
// SECTION 2: Move runtime directories to .anchor/
// ============================================
console.log("\n📦 MOVING RUNTIME DIRECTORIES TO .anchor/...");

const runtimeDirs = [
  "dialog",
  "logs",
  "memory",
  "sessions",
  "notebook",
  "media",
  "user_data",
  "backup",
  "embedding_cache",
  "file_store",
  "tool_results",
  "tool_result",
  ".qwen",
  ".cline"
];

// Special handling for mcp-server
console.log("\n🤖 Special handling for mcp-server/...");
const mcpServerPath = join(PROJECT_ROOT, "mcp-server");
if (existsSync(mcpServerPath)) {
  const mcpContents = readdirSync(mcpServerPath);
  if (mcpContents.some((file) => file.includes("package") || file.includes("index.js"))) {
    console.log(`  ℹ️  mcp-server/ looks like a service directory.`);
    console.log(`  ℹ️  Keeping it in project root for now (it opens a port).`);
    console.log(`  ℹ️  Add to .gitignore if you don't want to track it.`);
  } else {
    console.log(`  📦 Moving mcp-server/ contents to .anchor/mirrored_brain/`);
    const mirroredBrainPath = join(ANCHOR_ROOT, "mirrored_brain");
    if (!existsSync(mirroredBrainPath)) {
      mkdirSync(mirroredBrainPath, { recursive: true });
    }
    for (const file of mcpContents) {
      const source = join(mcpServerPath, file);
      const dest = join(mirroredBrainPath, file);
      if (existsSync(source)) {
        renameSync(source, dest);
        console.log(`    📄 ${file} → .anchor/mirrored_brain/`);
      }
    }
    rmSync(mcpServerPath, { recursive: true, force: true });
    console.log(`    🗑️  Removed original mcp-server/`);
  }
} else {
  console.log("  ℹ️  mcp-server/ doesn't exist (already cleaned?)");
}

// Move standard runtime directories
const movedDirs = [];
const stillHere = [];

for (const dir of runtimeDirs) {
  const source = join(PROJECT_ROOT, dir);
  if (existsSync(source) && readdirSync(source).length > 0) {
    console.log(`  📦 Moving ${dir}/ → .anchor/${dir}/`);
    try {
      const target = join(ANCHOR_ROOT, dir);
      // If target exists, delete it first
      if (existsSync(target)) {
        console.log(`    ℹ️  Target .anchor/${dir}/ already exists, clearing...`);
        rmSync(target, { recursive: true, force: true });
      }
      // Now rename works
      renameSync(source, target);
      movedDirs.push(dir);
      console.log(`    ✅ Moved ${dir}/`);
    } catch (err) {
      console.error(`    ✗ Error moving ${dir}/:`, err.message);
      stillHere.push(dir);
    }
  } else if (existsSync(source)) {
    console.log(`  ℹ️  ${dir}/ exists but is empty`);
  } else {
    console.log(`  ℹ️  ${dir}/ doesn't exist (already cleaned?)`);
  }
}

console.log(`\n📊 Summary: Moved ${movedDirs.length} directories, ${stillHere.length} still present.`);

// ============================================
// SECTION 3: Review system JSON files
// ============================================
console.log("\n📄 REVIEWING SYSTEM JSON FILES...");

const systemFiles = [
  "system_config.json",
  "system_files.json",
  "system_ingest_status.json",
  "system_memory.json",
  "system_paths.json",
  "system_paths2.json",
  "system_status.json",
  "ingest-payload.json",
  "ingestion-response.json",
  "ingest_status.json",
  "compounds-table.json",
  "deep-search.json",
  "illuminate-search.json",
  "exact-search.json",
  "star-search-nostream.json",
  "atoms.json",
  "chats.json",
  "jobs.json"
];

console.log("Looking for system JSON files...");
for (const file of systemFiles) {
  const filePath = join(PROJECT_ROOT, file);
  if (existsSync(filePath)) {
    const stats = statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`  📄 ${file} (${sizeKB} KB) - ${stats.mtime.toLocaleDateString()} ${stats.mtime.toLocaleTimeString()}`);
    console.log(`    ℹ️  Consider keeping or deleting - review contents`);
  }
}

// ============================================
// SECTION 4: Handle QwenPaw configuration files
// ============================================
console.log("\n🤖 HANDLING QWENPAW FILES...");

const qwenFiles = [
  "agent.json",
  "skill.json",
  ".skill.json.lock"
];

for (const file of qwenFiles) {
  const filePath = join(PROJECT_ROOT, file);
  if (existsSync(filePath)) {
    console.log(`  📄 ${file} - Local QwenPaw configuration`);
    console.log(`  ℹ️  These should be in .gitignore (already configured)`);
  }
}

console.log("\n" + "=".repeat(60));
console.log("✅ CLEANUP COMPLETE");
console.log("=".repeat(60));
console.log("\nNext steps:");
console.log("  1. Review the output above");
console.log("  2. Check .anchor/ directory structure");
console.log("  3. Consider adding more patterns to .gitignore");
console.log("  4. Run git status to see what changed");
