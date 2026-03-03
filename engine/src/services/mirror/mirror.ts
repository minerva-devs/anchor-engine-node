/**
 * Mirror Protocol Service - "Tangible Knowledge Graph"
 *
 * Writes CLEANED content (compound_body) to mirrored_brain/, not raw copies.
 * The sanitizer strips noise, timestamps, PII, and boilerplate before writing,
 * so mirrored_brain/ is smaller and more meaningful than the original inbox/.
 *
 * Supports YAML rehydration: flattened YAML files (from read_all.js) are
 * expanded back into their original file structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { db } from '../../core/db.js';
import { NOTEBOOK_DIR } from '../../config/paths.js';
import PATHS from '../../config/paths.js';

export const MIRRORED_BRAIN_PATH = PATHS.MIRRORED_BRAIN_DIR;

/**
 * Mirror Protocol: Full rebuild of mirrored_brain/ from DB compounds.
 * Writes cleaned compound_body for each source. Falls back to raw file
 * copy only when compound_body is missing (migration / edge case).
 */
export async function createMirror() {
    console.log('🪞 Mirror Protocol: Rebuilding from cleaned compound content...');

    // Create mirror root
    if (!fs.existsSync(MIRRORED_BRAIN_PATH)) {
        fs.mkdirSync(MIRRORED_BRAIN_PATH, { recursive: true });
    }

    // Join sources with compounds to get cleaned content
    const sourcesQuery = `
        SELECT s.path, c.compound_body, c.provenance
        FROM sources s
        LEFT JOIN compounds c ON c.path = s.path
    `;
    const result = await db.run(sourcesQuery);

    if (!result.rows || result.rows.length === 0) {
        console.log('🪞 Mirror Protocol: No files to mirror.');
        return;
    }

    let fileCount = 0;
    let fallbackCount = 0;
    let rehydratedCount = 0;

    for (const row of result.rows) {
        const dbPath: string = Array.isArray(row) ? row[0] : row.path;
        const compoundBody: string | null = Array.isArray(row) ? row[1] : row.compound_body;
        const provenance: string = (Array.isArray(row) ? row[2] : row.provenance) || 'internal';

        if (!dbPath) continue;

        // Determine mirror subdirectory
        let provenanceDir = '@inbox';
        if (dbPath.startsWith('external-inbox') || dbPath.includes('external-inbox')) {
            provenanceDir = '@external-inbox';
        } else if (dbPath.startsWith('quarantine')) {
            provenanceDir = '@quarantine';
        }

        // Use cleaned compound_body when available
        if (compoundBody) {
            const relativePath = getRelativePath(dbPath);
            const mirrorPath = path.join(MIRRORED_BRAIN_PATH, provenanceDir, relativePath);
            await writeFile(mirrorPath, compoundBody);
            fileCount++;
            continue;
        }

        // Fallback: raw file copy for sources without compound_body (migration)
        let sourcePath = dbPath;
        if (!path.isAbsolute(sourcePath)) {
            sourcePath = path.join(NOTEBOOK_DIR, sourcePath);
        }

        if (!fs.existsSync(sourcePath)) continue;

        // Check if this is a rehydratable YAML file
        if (sourcePath.endsWith('.yaml') || sourcePath.endsWith('.yml')) {
            const rehydrated = await tryRehydrateYAML(sourcePath, provenanceDir);
            if (rehydrated > 0) {
                rehydratedCount += rehydrated;
                continue;
            }
        }

        const relativePath = getRelativePath(sourcePath);
        const mirrorPath = path.join(MIRRORED_BRAIN_PATH, provenanceDir, relativePath);
        await copyFile(sourcePath, mirrorPath);
        fallbackCount++;
    }

    console.log(`🪞 Mirror Protocol: Complete. ${fileCount} cleaned, ${fallbackCount} fallback copies, ${rehydratedCount} rehydrated.`);
}

/**
 * Write a single file's cleaned content directly to mirrored_brain/.
 * Called by watchdog after atomization — faster than a full createMirror() rebuild.
 */
export async function writeMirroredFile(
    relativePath: string,
    cleanedContent: string,
    provenance: 'internal' | 'external' | 'quarantine' = 'internal'
): Promise<void> {
    if (!fs.existsSync(MIRRORED_BRAIN_PATH)) {
        fs.mkdirSync(MIRRORED_BRAIN_PATH, { recursive: true });
    }
    const mirrorPath = getMirrorPath(relativePath, provenance);
    await writeFile(mirrorPath, cleanedContent);
}

/**
 * Try to rehydrate a YAML file (from read_all.js format)
 * Returns number of files rehydrated, or 0 if not a rehydratable format
 */
async function tryRehydrateYAML(yamlPath: string, provenanceDir: string): Promise<number> {
    try {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const data = yaml.load(content) as any;

        // Check if this matches read_all.js format
        if (!data || !Array.isArray(data.files) || data.files.length === 0) {
            return 0; // Not a rehydratable format
        }

        // Get project name from project_structure or filename
        const projectName = data.project_structure
            ? path.basename(data.project_structure)
            : path.basename(yamlPath, path.extname(yamlPath));

        console.log(`🪞 Rehydrating YAML: ${yamlPath} → ${data.files.length} files (project: ${projectName})`);

        let count = 0;
        for (const file of data.files) {
            if (!file.path || file.content === undefined) continue;

            const mirrorPath = path.join(
                MIRRORED_BRAIN_PATH,
                provenanceDir,
                projectName,
                file.path
            );

            await writeFile(mirrorPath, file.content);
            count++;
        }

        return count;
    } catch (e) {
        // Not a valid YAML or parsing error - treat as normal file
        return 0;
    }
}

/**
 * Get relative path from inbox roots
 */
function getRelativePath(absolutePath: string): string {
    if (!absolutePath) return 'unknown_file';

    const inboxDir = PATHS.INBOX_DIR;
    const externalDir = path.join(path.dirname(PATHS.INBOX_DIR), 'external-inbox');

    if (absolutePath.startsWith(inboxDir)) {
        return path.relative(inboxDir, absolutePath);
    }
    if (absolutePath.startsWith(externalDir)) {
        return path.relative(externalDir, absolutePath);
    }

    // Hande pre-relative paths (e.g. from DB)
    if (absolutePath.startsWith('inbox/') || absolutePath.startsWith('inbox\\')) {
        return absolutePath.substring(6); // remove 'inbox/'
    }
    if (absolutePath.startsWith('external-inbox/') || absolutePath.startsWith('external-inbox\\')) {
        return absolutePath.substring(15); // remove 'external-inbox/'
    }

    // Fallback: use filename only
    return path.basename(absolutePath);
}

/**
 * Copy a file to mirror location
 */
async function copyFile(source: string, dest: string): Promise<void> {
    try {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(source, dest);
    } catch (e: any) {
        console.warn(`🪞 Mirror: Failed to copy ${source}: ${e.message}`);
    }
}

/**
 * Write content to a file
 */
async function writeFile(filePath: string, content: string): Promise<void> {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf-8');
    } catch (e: any) {
        console.warn(`🪞 Mirror: Failed to write ${filePath}: ${e.message}`);
    }
}

/**
 * Get the mirrored path for a source file
 * Used by context inflator to read from mirror instead of DB
 */
export function getMirrorPath(sourcePath: string, provenance: string = 'internal'): string {
    const provenanceDir = provenance === 'external' ? '@external-inbox' :
        provenance === 'quarantine' ? '@quarantine' : '@inbox';
    const relativePath = getRelativePath(sourcePath);
    return path.join(MIRRORED_BRAIN_PATH, provenanceDir, relativePath);
}

