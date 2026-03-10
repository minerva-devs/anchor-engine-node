/**
 * Prioritized Context Aggregation Tool - DIRECTORY STRUCTURE PRESERVATION
 *
 * Scans the project and copies files to a directory structure,
 * preserving original organization. Does NOT combine into monolithic files.
 *
 * ⚠️ WARNING: Files >10MB with >10,000 molecules cause OOM crashes.
 * Keep files in natural directory structure - do not combine.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration options
const CONFIG = {
    // Output directory
    outputDir: 'codebase',

    // File inclusion/exclusion patterns
    includeExtensions: [
        '.js', '.ts', '.jsx', '.tsx', '.mjs',
        '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
        '.sh', '.bash', '.bat', '.ps1',
        '.md', '.txt',
        '.sql',
        '.py', '.cpp', '.c', '.h', '.cs',
    ],

    excludeExtensions: [
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
        '.exe', '.bin', '.dll', '.so', '.dylib', '.zip', '.tar', '.gz', '.rar', '.7z',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
        '.ttf', '.otf', '.woff', '.woff2',
        '.o', '.obj', '.a', '.lib', '.out', '.class', '.jar', '.war', '.swp', '.swo',
        '.lock', '.cache', '.log', '.tmp', '.temp', '.DS_Store', 'Thumbs.db'
    ],

    excludeDirectories: [
        '.git', 'node_modules', 'archive', 'backups', 'logs', 'context', '.vscode',
        '.idea', '.pytest_cache', '__pycache__', 'dist', 'build', 'target',
        'venv', 'env', '.venv', '.env', 'Pods', 'Carthage', 'CocoaPods',
        '.next', '.nuxt', 'public', 'static', 'assets', 'images', 'img', 'codebase',
        'data', 'context_data', 'test_minimal_db',
        'coverage', 'test_results', 'reports',
        'notebook', 'inbox', 'mirrored_brain'
    ],

    excludeFiles: [
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'Gemfile.lock', 'Pipfile.lock', 'Cargo.lock', 'composer.lock',
        'go.sum', 'go.mod', 'requirements.txt', 'poetry.lock',
        '*.db', '*.sqlite', '*.sqlite3', '*.fdb', '*.mdb', '*.accdb',
        '*~', '*.tmp', '*.temp', '*.cache', '*.swp', '*.swo',
        'read_all.js'
    ],

    // ⚠️ CRITICAL: Max file size to prevent OOM
    // Files larger than this should be split before ingestion
    maxFileSize: 10 * 1024 * 1024, // 10MB

    // Max molecules per file (approximate)
    // Based on: ~200 bytes per molecule average
    maxMoleculesPerFile: 10000
};

// Helper function to check if a filename matches a pattern
function matchesPattern(fileName, pattern) {
    if (pattern === fileName) return true;
    if (pattern.startsWith('*') && fileName.endsWith(pattern.substring(1))) return true;
    if (pattern.endsWith('*') && fileName.startsWith(pattern.substring(0, pattern.length - 1))) return true;
    return false;
}

// Function to check if a path should be ignored
function shouldIgnore(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    const dirName = path.dirname(filePath).split(path.sep).pop().toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // Check excluded directories
    for (const excludeDir of CONFIG.excludeDirectories) {
        if (dirName === excludeDir.toLowerCase()) return true;
    }

    // Check excluded extensions
    if (CONFIG.excludeExtensions.includes(ext)) return true;

    // Check excluded file patterns
    for (const excludePattern of CONFIG.excludeFiles) {
        if (matchesPattern(fileName, excludePattern.toLowerCase())) return true;
    }

    return false;
}

// Function to copy files preserving directory structure
export function copyFilesPreservingStructure(rootDir = process.cwd()) {
    // Allow rootDir to be passed as command line argument
    if (process.argv[2]) {
        rootDir = path.resolve(process.argv[2]);
    }

    const outputDir = path.join(rootDir, CONFIG.outputDir);
    console.log(`Scanning project root: ${rootDir}`);
    console.log(`Output directory: ${outputDir}`);
    console.log(`⚠️  Max file size: ${(CONFIG.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    console.log(`⚠️  Max molecules per file: ~${CONFIG.maxMoleculesPerFile.toLocaleString()}`);
    console.log('');

    if (!fs.existsSync(outputDir)) {
        console.log(`Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let copiedCount = 0;
    let skippedCount = 0;
    let largeFileWarnings = [];

    function walkDirectory(currentPath) {
        let items;
        try {
            items = fs.readdirSync(currentPath);
        } catch (e) {
            console.warn(`Could not read directory: ${currentPath} - ${e.message}`);
            return;
        }

        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const relativePath = path.relative(rootDir, itemPath);

            let stat;
            try {
                stat = fs.statSync(itemPath);
            } catch (e) {
                continue;
            }

            if (stat.isDirectory()) {
                const dirName = item.toLowerCase();
                if (CONFIG.excludeDirectories.some(exclude => dirName === exclude.toLowerCase())) {
                    continue;
                }

                // Create corresponding directory in output
                const outputSubDir = path.join(outputDir, relativePath);
                if (!fs.existsSync(outputSubDir)) {
                    fs.mkdirSync(outputSubDir, { recursive: true });
                }

                walkDirectory(itemPath);
            } else {
                if (shouldIgnore(itemPath)) {
                    continue;
                }

                // Check file size
                if (stat.size > CONFIG.maxFileSize) {
                    largeFileWarnings.push({
                        path: relativePath,
                        size: stat.size,
                        sizeMB: (stat.size / 1024 / 1024).toFixed(2)
                    });
                    skippedCount++;
                    continue;
                }

                try {
                    // Copy file preserving structure
                    const outputPath = path.join(outputDir, relativePath);
                    const outputFileDir = path.dirname(outputPath);

                    if (!fs.existsSync(outputFileDir)) {
                        fs.mkdirSync(outputFileDir, { recursive: true });
                    }

                    fs.copyFileSync(itemPath, outputPath);
                    copiedCount++;
                    console.log(`  ✓ ${relativePath} (${(stat.size / 1024).toFixed(1)}KB)`);
                } catch (e) {
                    console.warn(`  ✗ Could not copy: ${relativePath} - ${e.message}`);
                    skippedCount++;
                }
            }
        }
    }

    walkDirectory(rootDir);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('COPY COMPLETE');
    console.log(`${'='.repeat(60)}`);
    console.log(`  Files copied: ${copiedCount}`);
    console.log(`  Files skipped: ${skippedCount}`);

    if (largeFileWarnings.length > 0) {
        console.log(`\n  ⚠️  LARGE FILES SKIPPED (>${(CONFIG.maxFileSize / 1024 / 1024).toFixed(0)}MB):`);
        console.log(`     These files should be split before ingestion:`);
        for (const warning of largeFileWarnings.slice(0, 10)) {
            console.log(`       - ${warning.path} (${warning.sizeMB}MB)`);
        }
        if (largeFileWarnings.length > 10) {
            console.log(`       ... and ${largeFileWarnings.length - 10} more`);
        }
        console.log(`\n     To fix: Split these files into smaller chunks (<10MB each)`);
    }

    console.log(`${'='.repeat(60)}`);
    console.log(`Output location: ${outputDir}`);
    console.log(`Ready for ingestion!`);
    console.log(`${'='.repeat(60)}\n`);

    return {
        copiedCount,
        skippedCount,
        largeFileWarnings,
        outputDir
    };
}

// Run if this file is executed directly
const __filename = fileURLToPath(import.meta.url);
const entryFile = process.argv[1];

if (entryFile === __filename) {
    console.log('Starting file copy with structure preservation...\n');
    let rootDir = process.argv[2] || process.cwd();
    copyFilesPreservingStructure(rootDir);
}

export { CONFIG };
