/**
 * Radial Distiller — Standard 133 Implementation
 *
 * Three-phase pipeline for lossless corpus compression:
 * 1. COLLECT: Radially inflate all compounds
 * 2. DEDUPLICATE: Line-level hash-based deduplication
 * 3. REASSEMBLE: Build coherent output compounds
 *
 * Memory-conscious: streaming mode for mobile, batch mode for desktop
 */
import { db } from '../../core/db.js';
import { ContextInflator } from '../search/context-inflator.js';
import { StructuredLogger } from '../../utils/structured-logger.js';
import { getMirrorPath } from '../mirror/mirror.js';
import { PATHS, DEFAULT_PROVENANCE } from '../../config/paths.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
// Optimized compact output formats (Task 2)
export var OutputFormat;
(function (OutputFormat) {
    OutputFormat["YAML"] = "yaml";
    OutputFormat["JSON"] = "json";
    OutputFormat["COMPOUND"] = "compound";
    OutputFormat["DECISION_RECORDS"] = "decision-records";
    // New: Ultra-compact single-line format
    OutputFormat["COMPACT"] = "compact";
})(OutputFormat || (OutputFormat = {}));
// Ultra-compact single-line format for maximum token efficiency (Task 2)  
export function createCompactOutput(lines) {
    // Build compact JSON with minimal whitespace
    const parts = lines.map(l => `"${l.content.replace(/"/g, '\\"')}"`);
    return `[${parts.join(',')}]\n`;
}
// Generate concise title from content (Task 2)
export function generateTitle(content) {
    const lines = content.split('\n').filter(l => l.length > 0).slice(0, 3);
    const firstLine = lines[0]?.trim();
    if (!firstLine)
        return 'Distilled Content';
    // Extract meaningful title from first non-empty line
    let title = firstLine;
    if (title.length > 80) {
        title = title.substring(0, 77) + '...';
    }
    return title.replace(/["\\]/g, '');
}
// Generate one-sentence summary from content (Task 2)
export function generateSummary(content) {
    const lines = content.split('\n').filter(l => l.length > 0);
    if (lines.length === 0)
        return 'No content';
    // Find the most informative line
    let bestLine = lines[0];
    let maxContentScore = 0;
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        const hasKeywords = /(?:user|assistant|model|system)/.test(lowerLine) ||
            /(?:code|function|implementation)/.test(lowerLine) ||
            /(?:important|note|key|insight)/.test(lowerLine);
        if (hasKeywords && line.length > 10) {
            maxContentScore = Math.max(maxContentScore, line.length);
            bestLine = line;
        }
    }
    return bestLine.trim() || 'No summary available';
}
// Extract tags from content (Task 2)
export function extractTags(content, existingTags) {
    const tags = [...(existingTags || [])];
    // Look for tagged content
    const tagMatches = content.match(/#[\w-]+/g) || [];
    const newTags = Array.from(new Set(tagMatches));
    // Also look for concept keywords
    const concepts = [];
    if (/memory/i.test(content))
        concepts.push('#memory');
    if (/code/i.test(content))
        concepts.push('#code');
    if (/database/i.test(content))
        concepts.push('#database');
    if (/api/i.test(content))
        concepts.push('#api');
    if (/bug|fix|error/i.test(content))
        concepts.push('#bug-fix');
    if (/feature|new/i.test(content))
        concepts.push('#feature');
    const allTags = [...new Set([...tags, ...concepts])];
    return allTags.filter(t => t.length > 0);
}
const MOBILE_MEMORY_THRESHOLD = 500 * 1024 * 1024;
function isMobileEnvironment() {
    if (process.platform === 'android')
        return true;
    if (process.env.ANCHOR_MOBILE_MODE === '1')
        return true;
    try {
        const os = require('os');
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        if (totalMem < 2 * 1024 * 1024 * 1024)
            return true;
        if (freeMem < MOBILE_MEMORY_THRESHOLD)
            return true;
    }
    catch {
        return false;
    }
    return false;
}
function normalizeLine(line, mode) {
    if (mode === 'lenient') {
        return line.trim();
    }
    let normalized = line.trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.toLowerCase();
    normalized = normalized.replace(/^user:\s*/i, '');
    normalized = normalized.replace(/^assistant:\s*/i, '');
    normalized = normalized.replace(/^\[?\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}\]?\s*/, '');
    normalized = normalized.replace(/^\[?\d{2}:\d{2}:\d{2}\]?\s*/, '');
    return normalized;
}
function hashLine(line) {
    return crypto.createHash('sha256').update(line).digest('hex');
}
function hashContentBytes(content) {
    return crypto.createHash('sha256').update(Buffer.from(content, 'utf8')).digest('base64url');
}
async function* collectCompounds(request) {
    const radius = request.radius || 2000;
    const maxRadius = request.max_radius || 10000;
    const effectiveRadius = Math.min(radius, maxRadius);
    let conditions = [];
    let queryBase = ``;
    // Query molecules directly (Phase 2B: compounds table is now an index layer)
    queryBase += `
    SELECT DISTINCT
      m.compound_id AS compound_id,
      m.id AS molecule_id,
      m.source_path AS source_path,
      m.timestamp,
      m.provenance,
      m.start_byte,
      m.end_byte,
      m.content as content_preview
    FROM molecules m
  `;
    const params = [DEFAULT_PROVENANCE];
    // Remove DEFAULT_PROVENANCE from params when no seed is provided - return ALL compounds
    const effectiveParams = request.seed ? [...params] : [];
    if (request.seed?.compound_ids?.length) {
        conditions.push(`m.compound_id = $${effectiveParams.length + 1}`);
        effectiveParams.push(request.seed.compound_ids);
    }
    if (request.seed?.buckets?.length) {
        queryBase += ` JOIN atoms a ON m.compound_id = a.compound_id WHERE EXISTS(SELECT 1 FROM unnest(a.buckets) as bucket WHERE bucket = ANY($${effectiveParams.length + 1})`;
        effectiveParams.push(request.seed.buckets);
    }
    else if (request.seed?.query) {
        const tsQuery = request.seed.query.split(/\s+/).filter(t => t.length > 0).join(' | ');
        queryBase += ` JOIN atoms a ON m.compound_id = a.compound_id WHERE to_tsvector('simple', a.content) @@ to_tsquery('simple', $${effectiveParams.length + 1})`;
        effectiveParams.push(tsQuery);
    }
    if (conditions.length > 0) {
        queryBase += ' AND (' + conditions.join(' OR ') + ')';
    }
    queryBase += ' ORDER BY m.timestamp DESC, m.start_byte ASC';
    const result = await db.run(queryBase, effectiveParams); // Fixed: use effectiveParams instead of params
    const rows = result.rows;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            let content = '';
            let source = 'unknown';
            let timestamp = Date.now();
            if (row.molecule_id !== null && row.start_byte !== undefined) {
                // Use molecule coordinates - we have the actual byte range!
                content = row.content_preview || '';
                source = row.source_path;
                timestamp = row.timestamp || Date.now();
                StructuredLogger.info('[Distill] Processing molecule', {
                    id: row.molecule_id,
                    start_byte: row.start_byte,
                    end_byte: row.end_byte
                });
            }
            else if (row.compound_id && row.source_path) {
                // Compound-level - try to inflate using ContextInflator
                const searchResult = {
                    id: row.compound_id,
                    content: '',
                    source: row.source_path,
                    timestamp: row.timestamp || Date.now(),
                    buckets: [],
                    tags: [],
                    epochs: '',
                    provenance: row.provenance || 'internal',
                    score: 1.0,
                    compound_id: row.compound_id,
                    start_byte: 0,
                    end_byte: 0,
                    is_inflated: false,
                };
                const inflated = await ContextInflator.inflate([searchResult], effectiveRadius * 2, effectiveRadius);
                if (inflated.length > 0 && inflated[0].content) {
                    content = inflated[0].content;
                    source = inflated[0].source;
                    timestamp = row.timestamp || Date.now();
                }
                else {
                    // Fallback: try reading from disk directly using getMirrorPath
                    const mirrorPath = getMirrorPath(row.source_path, row.provenance);
                    if (mirrorPath && fs.existsSync(mirrorPath)) {
                        content = fs.readFileSync(mirrorPath, 'utf-8');
                        source = row.source_path;
                        timestamp = row.timestamp || Date.now();
                    }
                    else {
                        StructuredLogger.warn('[Distill] Cannot find file for compound', { path: row.source_path });
                        continue; // Skip this compound if file not found
                    }
                }
            }
            if (content) {
                yield {
                    compoundId: row.compound_id || 'unknown',
                    content,
                    source,
                    timestamp,
                };
            }
            if (isMobileEnvironment() && i % 5 === 0 && global.gc) {
                global.gc();
            }
        }
        catch (e) {
            const error = e;
            StructuredLogger.error('[Distill] Error processing row', error);
            continue; // Skip failed rows but keep going
        }
    }
}
async function deduplicateLines(compoundGenerator, request) {
    const normalization = request.normalization || 'strict';
    const uniqueLines = new Map();
    const MAX_DEDUP_CACHE = 10000;
    const seenCompoundHashes = new Set();
    let totalLines = 0;
    let duplicateLines = 0;
    let duplicateCompoundsSkipped = 0;
    let compoundsTotal = 0;
    for await (const compound of compoundGenerator) {
        compoundsTotal++;
        const compoundHash = hashContentBytes(compound.content);
        if (seenCompoundHashes.has(compoundHash)) {
            duplicateCompoundsSkipped++;
            if (duplicateCompoundsSkipped % 100 === 0) {
                // Aggregate debug logging
            }
            continue;
        }
        if (seenCompoundHashes.size >= MAX_DEDUP_CACHE) {
            const hashes = Array.from(seenCompoundHashes);
            const toRemove = Math.floor(hashes.length * 0.1);
            hashes.splice(0, toRemove);
            seenCompoundHashes.clear();
            hashes.forEach(h => seenCompoundHashes.add(h));
        }
        seenCompoundHashes.add(compoundHash);
        const lines = compound.content.split('\n');
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            totalLines++;
            if (!line.trim())
                continue;
            const normalized = normalizeLine(line, normalization);
            const normalizedHash = hashLine(normalized);
            const originalHash = hashLine(line);
            if (uniqueLines.has(normalizedHash)) {
                const existing = uniqueLines.get(normalizedHash);
                if (!existing.provenance.includes(compound.source)) {
                    existing.provenance.push(compound.source);
                }
                existing.timestamps.push(compound.timestamp);
                duplicateLines++;
            }
            else {
                uniqueLines.set(normalizedHash, {
                    content: line.trim(),
                    normalizedHash,
                    originalHash,
                    provenance: [compound.source],
                    timestamps: [compound.timestamp],
                    compoundId: compound.compoundId,
                    lineNumber: lineNum,
                });
            }
        }
    }
    return { uniqueLines, stats: { total: totalLines, unique: uniqueLines.size, duplicate: duplicateLines, compoundsSkipped: duplicateCompoundsSkipped, compoundsTotal } };
}
async function reassembleCompounds(uniqueLines, request) {
    const lines = Array.from(uniqueLines.values());
    lines.sort((a, b) => {
        const timeA = Math.min(...a.timestamps);
        const timeB = Math.min(...b.timestamps);
        return timeA - timeB;
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let outputPath;
    if (request.output_path) {
        outputPath = request.output_path;
    }
    else if (request.output_format === 'compound') {
        outputPath = path.join(PATHS.MIRRORED_BRAIN_DIR, 'distilled', `distilled_${timestamp}.md`);
    }
    else {
        outputPath = path.join(PATHS.DISTILLS_DIR, `distilled_${timestamp}.${request.output_format || 'json'}`);
    }
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    if (request.output_format === 'yaml') {
        const yamlContent = yaml.dump({
            metadata: {
                source: 'Anchor Engine Radial Distiller',
                distilled_at: new Date().toISOString(),
                line_count: lines.length,
            },
            lines: lines.map(l => ({ content: l.content, provenance: l.provenance })),
        });
        fs.writeFileSync(outputPath, yamlContent, 'utf-8');
    }
    else if (request.output_format === 'json') {
        const jsonContent = JSON.stringify({
            metadata: { source: 'Anchor Engine Radial Distiller', distilled_at: new Date().toISOString() },
            lines: lines.map(l => ({ content: l.content, provenance: l.provenance })),
        }, null, 2);
        fs.writeFileSync(outputPath, jsonContent, 'utf-8');
    }
    else {
        const chunks = [];
        let currentChunk = [];
        for (const line of lines) {
            if (currentChunk.length >= 1000) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [];
            }
            currentChunk.push(line.content);
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
        }
        if (chunks.length === 0) {
            fs.writeFileSync(outputPath, '', 'utf-8');
        }
        else if (chunks.length === 1) {
            fs.writeFileSync(outputPath, chunks[0], 'utf-8');
        }
        else {
            for (let i = 0; i < chunks.length; i++) {
                const chunkPath = outputPath.replace('.md', `_${i + 1}.md`);
                fs.writeFileSync(chunkPath, chunks[i], 'utf-8');
            }
        }
    }
    const stats = fs.statSync(outputPath);
    return { outputPath, sizeBytes: stats.size, compoundsCreated: 1 };
}
export async function radialDistill(request) {
    const startTime = Date.now();
    const memBefore = process.memoryUsage();
    let memAfter = null;
    try {
        const compoundGenerator = collectCompounds(request);
        const { uniqueLines, stats: dedupStats } = await deduplicateLines(compoundGenerator, request);
        const { outputPath, sizeBytes, compoundsCreated } = await reassembleCompounds(uniqueLines, request);
        memAfter = process.memoryUsage();
        const duration = Date.now() - startTime;
        const memPeak = Math.max(memAfter.heapUsed, memBefore.heapUsed);
        const compressionRatio = dedupStats.unique > 0
            ? (dedupStats.total / dedupStats.unique).toFixed(2)
            : '1.00';
        const sourceCompounds = Array.from(uniqueLines.values())
            .flatMap(line => line.provenance)
            .filter((source, index, arr) => arr.indexOf(source) === index)
            .sort();
        const result = {
            stats: {
                compounds_processed: dedupStats.compoundsTotal,
                lines_total: dedupStats.total,
                lines_unique: dedupStats.unique,
                lines_duplicate: dedupStats.duplicate,
                compression_ratio: `${compressionRatio}:1`,
                duration_ms: duration,
                memory_peak_mb: Math.floor(memPeak / 1024 / 1024),
            },
            output: { format: request.output_format || 'compound', path: outputPath, size_bytes: sizeBytes, compounds_created: compoundsCreated },
            provenance: { source_compounds: sourceCompounds, unique_sources: sourceCompounds.length, distilled_at: new Date().toISOString(), parameters: request },
        };
        return result;
    }
    catch (error) {
        // Log the error with full stack trace
        StructuredLogger.error('DISTILL_ERROR', error, {
            request: request,
            duration_ms: Date.now() - startTime,
            memBefore_mb: Math.floor(memBefore.heapUsed / 1024 / 1024),
            memAfter_mb: memAfter ? Math.floor(memAfter.heapUsed / 1024 / 1024) : 'N/A (error occurred)',
        });
        // Determine appropriate error response based on error type
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
            // Database or dependency loading failure
            StructuredLogger.error('DISTILL_MODULE_ERROR', error, {
                module: error.code,
                details: error.message,
            });
            throw new Error('Failed to load distiller service. Please restart the server.');
        }
        else if (error.code === 'ENOENT') {
            // File not found or directory not writable
            StructuredLogger.error('DISTILL_FILE_ERROR', error, {
                path: error.path,
                details: error.message,
            });
            throw new Error('Output directory not writable. Check permissions.');
        }
        else if (error.message?.includes('Memory') ||
            error.code === 'ERR_OUT_OF_RANGE') {
            // Memory-related errors
            StructuredLogger.error('DISTILL_MEMORY_ERROR', error, {
                usedHeap: memAfter?.heapUsed || 0,
                requested: request,
                error: error.message,
            });
            throw new Error('Out of memory. Reduce the corpus size or increase memory limits.');
        }
        else if (error.name === 'ValidationError' ||
            error.message?.includes('validation') ||
            error.message?.includes('invalid')) {
            // Validation errors
            StructuredLogger.error('DISTILL_VALIDATION_ERROR', error, {
                input: request,
                error: error.message,
            });
            throw new Error(`Invalid input: ${error.message}`);
        }
        else {
            // Generic error
            throw error;
        }
    }
}
