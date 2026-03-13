/**
 * Streaming Ingest Service for Large Files
 * 
 * Processes large files in chunks to prevent memory issues and provide progress updates
 */

import { db } from '../../core/db.js';
import { StructuredLogger } from '../../utils/structured-logger.js';
import { AtomizerService } from './atomizer-service.js';
import { AtomicIngestService } from './ingest-atomic.js';
import { Compound, Molecule, Atom } from '../../types/atomic.js';

export interface StreamingIngestProgress {
  bytesProcessed: number;
  totalBytes: number;
  chunksProcessed: number;
  totalChunks: number;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  progressPercentage: number;
}

export interface StreamingIngestOptions {
  chunkSize?: number; // Size of each chunk in bytes (default: 1024 * 1024 = 1MB)
  batchSize?: number; // Number of items to process in each batch (default: 50)
  source?: string;    // Source identifier for the file
  bucket?: string;    // Bucket to assign the content to
  onProgress?: (progress: StreamingIngestProgress) => void;
}

export class StreamingIngestService {
  private readonly DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
  private readonly DEFAULT_BATCH_SIZE = 50;

  async ingestLargeFile(
    fileContent: string,
    options: StreamingIngestOptions = {}
  ): Promise<{ success: boolean; message: string; compoundId?: string }> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      batchSize = this.DEFAULT_BATCH_SIZE,
      source = 'streaming_upload',
      bucket = 'notebook',
      onProgress
    } = options;

    const totalBytes = fileContent.length;
    const totalChunks = Math.ceil(totalBytes / chunkSize);
    
    StructuredLogger.info('STREAMING_INGEST_START', {
      message: `Starting streaming ingestion for ${totalBytes} bytes`,
      totalBytes,
      chunkSize,
      totalChunks
    });

    try {
      // Create a compound to hold all the chunks
      const compoundId = `compound_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const compound: Compound = {
        id: compoundId,
        compound_body: '', // We won't store the full body to save space
        path: source,
        timestamp: Date.now(),
        provenance: 'internal',
        molecular_signature: 'streaming',
        atoms: [],
        molecules: [],
      };

      // Initialize services
      const atomizer = new AtomizerService();
      const atomicIngest = new AtomicIngestService();

      // Process file in chunks
      let bytesProcessed = 0;
      let chunksProcessed = 0;
      let allMolecules: Molecule[] = [];
      let allAtoms: Atom[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalBytes);
        const chunk = fileContent.substring(start, end);
        
        // Update progress
        bytesProcessed = end;
        chunksProcessed = i + 1;
        
        const progress: StreamingIngestProgress = {
          bytesProcessed,
          totalBytes,
          chunksProcessed,
          totalChunks,
          status: 'processing',
          message: `Processing chunk ${chunksProcessed} of ${totalChunks}`,
          progressPercentage: Math.round((bytesProcessed / totalBytes) * 100)
        };
        
        onProgress?.(progress);
        StructuredLogger.info('STREAMING_INGEST_PROGRESS', progress);

        // Atomize the chunk
        const result = await atomizer.atomize(chunk, `${source}_chunk_${i}`, 'internal');
        if (!result) {
          StructuredLogger.warn('STREAMING_INGEST_SKIPPED', {
            message: `Chunk ${i} was skipped (transient data detected)`,
            chunkIndex: i
          });
          continue;
        }

        const { molecules, atoms } = result;
        
        // Add to cumulative lists
        allMolecules = allMolecules.concat(molecules);
        allAtoms = allAtoms.concat(atoms);
        
        // Update compound metadata
        compound.molecules = compound.molecules.concat(molecules.map(m => m.id));
        compound.atoms = compound.atoms.concat(atoms.map(a => a.id));

        // Process in batches to manage memory
        if (allMolecules.length >= batchSize || chunksProcessed === totalChunks) {
          // Ingest the accumulated batch
          await atomicIngest.ingestResult(compound, allMolecules, allAtoms, [bucket]);
          
          // Clear the batch to free memory
          allMolecules = [];
          allAtoms = [];
          
          StructuredLogger.info('STREAMING_INGEST_BATCH_COMPLETE', {
            message: `Completed batch from chunks`,
            batchMolecules: molecules.length,
            batchAtoms: atoms.length
          });
        }
      }

      // Final progress update
      const finalProgress: StreamingIngestProgress = {
        bytesProcessed: totalBytes,
        totalBytes,
        chunksProcessed: totalChunks,
        totalChunks,
        status: 'completed',
        message: `Streaming ingestion completed successfully`,
        progressPercentage: 100
      };
      
      onProgress?.(finalProgress);
      StructuredLogger.info('STREAMING_INGEST_COMPLETE', finalProgress);

      return {
        success: true,
        message: `Successfully ingested ${totalBytes} bytes in ${totalChunks} chunks`,
        compoundId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      StructuredLogger.error('STREAMING_INGEST_FAILED', {
        message: `Streaming ingestion failed: ${errorMessage}`,
        error: errorMessage
      });

      const errorProgress: StreamingIngestProgress = {
        bytesProcessed: 0,
        totalBytes,
        chunksProcessed: 0,
        totalChunks,
        status: 'failed',
        message: `Streaming ingestion failed: ${errorMessage}`,
        progressPercentage: 0
      };
      
      onProgress?.(errorProgress);

      return {
        success: false,
        message: `Streaming ingestion failed: ${errorMessage}`
      };
    }
  }

  /**
   * Ingest a file from a stream in chunks
   */
  async ingestFileStream(
    readableStream: NodeJS.ReadableStream,
    options: StreamingIngestOptions = {}
  ): Promise<{ success: boolean; message: string; compoundId?: string }> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let totalBytes = 0;
      const chunks: string[] = [];
      
      readableStream.on('data', (chunk: Buffer | string) => {
        const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        buffer += chunkStr;
        totalBytes += chunkStr.length;
        
        // Process when we have enough data
        if (buffer.length >= (options.chunkSize || this.DEFAULT_CHUNK_SIZE)) {
          chunks.push(buffer);
          buffer = '';
        }
      });

      readableStream.on('end', async () => {
        // Add remaining buffer if any
        if (buffer) {
          chunks.push(buffer);
        }

        // Update total bytes in options for progress reporting
        const updatedOptions = {
          ...options,
          totalBytes
        };

        // Process all collected chunks
        let fullContent = '';
        for (const chunk of chunks) {
          fullContent += chunk;
        }

        try {
          const result = await this.ingestLargeFile(fullContent, updatedOptions);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      readableStream.on('error', (error) => {
        reject(error);
      });
    });
  }
}