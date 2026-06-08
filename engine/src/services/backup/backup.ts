import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../core/db.js';
import PATHS, { DISTILL_DIR } from '../../config/paths.js';
import yaml from 'js-yaml';

const BACKUPS_PATH = PATHS.BACKUPS_DIR;
const ANCHOR_ROOT = PATHS.ANCHOR_ROOT;

if (!fs.existsSync(BACKUPS_PATH)) {
    fs.mkdirSync(BACKUPS_PATH, { recursive: true });
}

export interface CorpusBackupRecord {
    id: string;
    title: string;
    content: string;
    source_path?: string | null;
    provenance?: string[] | null;
    tags: string[];
    created_at: string;
    updated_at?: string | null;
}

/**
 * Create a YAML corpus backup with provenance receipts.
 */
export async function createCorpusBackupYaml(): Promise<{ 
    filename: string; 
    stats: { records: number; files: number };
}> {
    const timestamp = new Date().toISOString();
    
    let CORPUS_DIR: string = DISTILL_DIR || '';
    if (CORPUS_DIR && fs.existsSync(CORPUS_DIR)) {
        // Use distills dir directly
    } else {
        const corpusBackupDir = path.join(ANCHOR_ROOT, 'corpus-backups');
        if (!fs.existsSync(corpusBackupDir)) {
            fs.mkdirSync(corpusBackupDir, { recursive: true });
        }
        CORPUS_DIR = corpusBackupDir;
    }

    const filename = `corpus_backup_${timestamp}.yaml`;
    const filePath = path.join(CORPUS_DIR, filename);

    console.log(`[Corpus Backup] Starting YAML backup to ${filename}...`);

    // Collect corpus records from database
    let records: CorpusBackupRecord[] = [];
    
    try {
        const result = await db.run(
            `SELECT id, title, content, source_path, provenance, tags, created_at, updated_at 
             FROM molecules 
             ORDER BY created_at DESC`
        );
        
        if (result.rows && Array.isArray(result.rows)) {
            for (const row of result.rows) {
                const record: CorpusBackupRecord = {
                    id: String(row.id || ''),
                    title: String(row.title || 'Untitled'),
                    content: String(row.content || ''),
                    source_path: row.source_path,
                    provenance: Array.isArray(row.provenance) && row.provenance.length > 0 ? row.provenance : [],
                    tags: Array.isArray(row.tags) && row.tags.length > 0 ? row.tags : [],
                    created_at: String(row.created_at || timestamp),
                    updated_at: row.updated_at,
                };

                if (record.content.length > 0 && record.title.trim() !== '') {
                    records.push(record);
                }
            }
        }

        console.log(`[Corpus Backup] Collected ${records.length} corpus records`);
    } catch (e: any) {
        console.warn('[Corpus Backup] Warning: Could not query molecules table:', e.message);
    }

    // Collect files from mirrored_brain
    const files: Array<{ path: string; content: string }> = [];
    
    try {
        const mirroredBrainDir = path.join(ANCHOR_ROOT, 'mirrored_brain');
        if (fs.existsSync(mirroredBrainDir)) {
            // Cast to string[] since readdirSync can return Buffer for symlinks
            const entries: string[] = fs.readdirSync(mirroredBrainDir, { recursive: true }) as string[];
            for (const absPath of entries) {
                // Skip corpus-backups subdirectory to avoid duplication
                if (absPath.endsWith('/corpus-backups/') || absPath.endsWith('\\corpus-backups\\')) continue;
                
                try {
                    const content = fs.readFileSync(absPath, 'utf-8');
                    if (content.trim() && content.length > 10) {
                        files.push({ path: absPath, content });
                    }
                } catch (e: any) {}
            }
        }
    } catch (e: any) {
        console.warn('[Corpus Backup] Warning: Could not scan mirrored_brain:', e.message);
    }

    // Build YAML structure
    const backupData = {
        metadata: {
            created_at: timestamp,
            version: '1.0',
            record_count: records.length,
            file_count: files.length
        },
        corpus_records: records.map(r => ({
            id: r.id,
            title: r.title,
            content: r.content,
            source_path: r.source_path || null,
            provenance: Array.isArray(r.provenance) && r.provenance.length > 0 ? r.provenance : [r.source_path || 'external'],
            tags: r.tags || [],
            created_at: r.created_at,
            updated_at: r.updated_at
        })),
        attached_files: files.map(f => ({ path: f.path, content: f.content }))
    };

    const output = yaml.dump(backupData, { indent: 2, lineWidth: -1 });
    fs.writeFileSync(filePath, output, 'utf-8');
    
    console.log(`[Corpus Backup] Completed. ${records.length} records + ${files.length} files`);

    return {
        filename,
        stats: {
            records: backupData.corpus_records.length,
            files: backupData.attached_files.length
        }
    };
}

export async function createBackup(): Promise<{ filename: string; stats: any }> {
    const timestamp = new Date().toISOString();
    
    let BACKUP_DIR_PATH: string = DISTILL_DIR || '';
    if (BACKUP_DIR_PATH && fs.existsSync(BACKUP_DIR_PATH)) {
        // Use distills dir for backups too
    } else {
        const corpusBackupDir = path.join(ANCHOR_ROOT, 'corpus-backups');
        if (!fs.existsSync(corpusBackupDir)) {
            fs.mkdirSync(corpusBackupDir, { recursive: true });
        }
        BACKUP_DIR_PATH = corpusBackupDir;
    }

    const filename = `backup_${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR_PATH, filename);

    console.log(`[Backup] Starting backup to ${filename}...`);

    // Simple JSON backup
    const data: any = {
        timestamp,
        version: '2'
    };

    // Collect files from mirrored_brain
    try {
        const mirroredBrainDir = path.join(ANCHOR_ROOT, 'mirrored_brain');
        if (fs.existsSync(mirroredBrainDir)) {
            // Cast to string[] since readdirSync can return Buffer for symlinks
            const entries: string[] = fs.readdirSync(mirroredBrainDir, { recursive: true }) as string[];
            for (const absPath of entries) {
                if (!absPath.endsWith('/corpus-backups/') && !absPath.endsWith('\\corpus-backups\\')) {
                    try {
                        const content = fs.readFileSync(absPath, 'utf-8');
                        data.files = data.files || [];
                        data.files.push({ path: absPath, content });
                    } catch (e: any) {}
                }
            }
        }
    } catch (e: any) {}

    // Add source info
    try {
        const sources = await db.run('SELECT path, hash, total_atoms FROM sources');
        if (sources.rows) {
            data.sources = sources.rows;
        }
        
        const engrams = await db.run('SELECT key, value FROM engrams');
        if (engrams.rows) {
            data.engrams = engrams.rows;
        }
    } catch (e: any) {}

    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
    
    console.log(`[Backup] Completed. Written to ${filename}`);

    return { filename, stats: { timestamp } };
}

export async function restoreBackup(filename: string): Promise<{ restored: any }> {
    const backupPath = path.join(BACKUPS_PATH || '', filename);
    
    if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${filename}`);
    }

    try {
        const content = fs.readFileSync(backupPath, 'utf-8');
        const backupData = JSON.parse(content) as any;

        // Restore sources if present
        if (backupData.sources && Array.isArray(backupData.sources)) {
            for (const source of backupData.sources) {
                try {
                    await db.run('INSERT INTO sources (path, hash, total_atoms) VALUES ($1, $2, $3)', [
                        source.path || '', source.hash || '', Number(source.total_atoms) || 0
                    ]);
                } catch (e: any) {}
            }
        }

        // Restore engrams if present
        if (backupData.engrams && Array.isArray(backupData.engrams)) {
            for (const engram of backupData.engrams) {
                try {
                    await db.run('INSERT INTO engrams (key, value) VALUES ($1, $2)', [engram.key, JSON.stringify(engram.value)]);
                } catch (e: any) {}
            }
        }

        return { restored: { filename, sources: backupData.sources?.length || 0, engrams: backupData.engrams?.length || 0 } };
    } catch (e: any) {
        throw new Error(`Failed to restore backup: ${e.message}`);
    }
}

export async function rebuildInboxFromMirror(): Promise<void> {
    const inboxDir = path.join(ANCHOR_ROOT, 'mirrored_brain', 'inbox');
    
    if (!fs.existsSync(inboxDir)) {
        fs.mkdirSync(inboxDir, { recursive: true });
        return;
    }

    // Clear existing inbox files (except .gitkeep)
    const entries = fs.readdirSync(inboxDir);
    for (const entry of entries) {
        if (!entry.startsWith('.') && !fs.statSync(path.join(inboxDir, entry)).isDirectory()) {
            fs.unlinkSync(path.join(inboxDir, entry));
        }
    }

    // Create .gitkeep
    fs.writeFileSync(path.join(inboxDir, '.gitkeep'), '');
}

export async function rebuildFilesystemFromSources(): Promise<void> {
    const sources = await db.run('SELECT path FROM sources');
    
    for (const source of sources.rows || []) {
        console.log(`[Rebuild] Source: ${source.path}`);
        // Implementation would connect to source and rebuild mirrored_brain/
    }
}

export async function listBackups(): Promise<Array<{ filename: string; created_at: string }>> {
    const backupsDir = BACKUPS_PATH || '';
    if (!fs.existsSync(backupsDir)) return [];

    const files: Array<{ filename: string; created_at: string }> = [];
    
    try {
        // Cast to string[] since readdirSync can return Buffer for symlinks
        const entries: string[] = fs.readdirSync(backupsDir, { recursive: true }) as string[];
        for (const absPath of entries) {
            if ((absPath.endsWith('.yaml') || absPath.endsWith('.json')) && !absPath.includes('node_modules')) {
                try {
                    const content = fs.readFileSync(absPath, 'utf-8');
                    const stats = JSON.parse(content) as any;
                    files.push({
                        filename: path.basename(absPath),
                        created_at: stats.created_at || new Date().toISOString()
                    });
                } catch (e: any) {}
            }
        }
    } catch (e: any) {}

    return files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}