/**
 * System Status Manager
 * 
 * Tracks global system state (ingestion, search, idle) and provides
 * queuing mechanism for search requests during ingestion.
 */

type SystemState = 'idle' | 'ingesting' | 'searching' | 'maintenance';

interface StatusInfo {
  state: SystemState;
  isBusy: boolean;
  activeTask?: string;
  progress?: {
    current: number;
    total: number;
    description: string;
  };
  lastIngestion?: Date;
  queuedSearches: SearchRequest[];
}

interface SearchRequest {
  query: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class SystemStatusManager {
  private state: SystemState = 'idle';
  private activeTask?: string;
  private progress?: StatusInfo['progress'];
  private lastIngestion?: Date;
  private queuedSearches: SearchRequest[] = [];
  private isProcessingQueue = false;

  /**
   * Set system state
   */
  setState(state: SystemState, task?: string) {
    const oldState = this.state;
    this.state = state;
    this.activeTask = task;
    
    if (state === 'ingesting') {
      this.lastIngestion = new Date();
    }
    
    // Log state transitions for debugging
    if (oldState !== state) {
      console.log(`[SystemStatus] ${oldState} → ${state}${task ? ` (${task})` : ''}`);
    }
  }

  /**
   * Set progress indicator
   */
  setProgress(current: number, total: number, description: string) {
    this.progress = { current, total, description };
  }

  /**
   * Clear progress indicator
   */
  clearProgress() {
    this.progress = undefined;
  }

  /**
   * Get current status
   */
  getStatus(): StatusInfo {
    return {
      state: this.state,
      isBusy: this.state === 'ingesting' || this.state === 'maintenance',
      activeTask: this.activeTask,
      progress: this.progress,
      lastIngestion: this.lastIngestion,
      queuedSearches: this.queuedSearches
    };
  }

  /**
   * Check if system is ready for search
   */
  isReadyForSearch(): boolean {
    return this.state !== 'ingesting' && this.state !== 'maintenance';
  }

  /**
   * Queue a search request for later execution
   */
  queueSearch(request: SearchRequest) {
    this.queuedSearches.push(request);
    console.log(`[SystemStatus] Search queued: "${request.query.substring(0, 50)}..." (position: ${this.queuedSearches.length})`);
  }

  /**
   * Process queued search requests
   */
  async processQueue(searchFn: (query: string) => Promise<any>) {
    if (this.isProcessingQueue || this.queuedSearches.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.queuedSearches.length > 0 && this.isReadyForSearch()) {
        const request = this.queuedSearches.shift();
        if (request) {
          try {
            console.log(`[SystemStatus] Processing queued search: "${request.query.substring(0, 50)}..."`);
            const result = await searchFn(request.query);
            request.resolve(result);
          } catch (error: any) {
            request.reject(error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get estimated wait time for queued searches
   */
  getEstimatedWaitTime(): number {
    if (!this.lastIngestion) return 0;
    
    const timeSinceIngestion = Date.now() - this.lastIngestion.getTime();
    const remainingWait = Math.max(0, 30000 - timeSinceIngestion); // 30 second debounce
    
    return Math.ceil(remainingWait / 1000); // Return seconds
  }
}

// Singleton instance
export const systemStatus = new SystemStatusManager();
