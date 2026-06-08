/**
 * System Status Manager
 *
 * Tracks global system state (ingestion, search, idle) and provides
 * queuing mechanism for search requests during ingestion.
 */
class SystemStatusManager {
    state = 'idle';
    activeTask;
    progress;
    lastIngestion;
    queuedSearches = [];
    currentIngestion;
    isProcessingQueue = false;
    /**
     * Start tracking an ingestion job
     */
    startIngestion(id, source, filesTotal) {
        this.setState('ingesting', `Ingesting ${source}`);
        this.currentIngestion = {
            id,
            status: 'processing',
            source,
            filesProcessed: 0,
            filesTotal,
            startedAt: new Date(),
        };
        this.setProgress(0, filesTotal, `Starting ingestion of ${source}`);
    }
    /**
     * Update ingestion progress
     */
    updateIngestionProgress(filesProcessed, description) {
        if (this.currentIngestion) {
            this.currentIngestion.filesProcessed = filesProcessed;
            this.setProgress(filesProcessed, this.currentIngestion.filesTotal, description || `Processed ${filesProcessed} files`);
        }
    }
    /**
     * Complete ingestion job
     */
    completeIngestion(error) {
        if (this.currentIngestion) {
            this.currentIngestion.status = error ? 'error' : 'complete';
            this.currentIngestion.completedAt = new Date();
            if (error) {
                this.currentIngestion.error = error;
            }
            this.lastIngestion = new Date();
            this.setState('idle');
            this.clearProgress();
        }
    }
    /**
     * Get current ingestion status
     */
    getIngestionStatus() {
        const jobStatus = this.currentIngestion?.status || (this.lastIngestion ? 'complete' : 'idle');
        // Map 'pending' to 'idle' for API response
        const apiStatus = jobStatus === 'pending' ? 'idle' : jobStatus;
        return {
            status: apiStatus,
            currentJob: this.currentIngestion,
            lastCompleted: this.lastIngestion,
            queueDepth: this.queuedSearches.length,
        };
    }
    /**
     * Set system state
     */
    setState(state, task) {
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
    setProgress(current, total, description) {
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
    getStatus() {
        return {
            state: this.state,
            isBusy: this.state === 'ingesting' || this.state === 'maintenance',
            activeTask: this.activeTask,
            progress: this.progress,
            lastIngestion: this.lastIngestion,
            queuedSearches: this.queuedSearches,
            currentIngestion: this.currentIngestion,
            queueDepth: this.queuedSearches.length,
        };
    }
    /**
     * Check if system is ready for search
     */
    isReadyForSearch() {
        return this.state !== 'ingesting' && this.state !== 'maintenance';
    }
    /**
     * Queue a search request for later execution
     */
    queueSearch(request) {
        this.queuedSearches.push(request);
        console.log(`[SystemStatus] Search queued: "${request.query.substring(0, 50)}..." (position: ${this.queuedSearches.length})`);
    }
    /**
     * Process queued search requests
     */
    async processQueue(searchFn) {
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
                    }
                    catch (error) {
                        request.reject(error);
                    }
                }
            }
        }
        finally {
            this.isProcessingQueue = false;
        }
    }
    /**
     * Get estimated wait time for queued searches
     */
    getEstimatedWaitTime() {
        if (!this.lastIngestion)
            return 0;
        const timeSinceIngestion = Date.now() - this.lastIngestion.getTime();
        const remainingWait = Math.max(0, 30000 - timeSinceIngestion); // 30 second debounce
        return Math.ceil(remainingWait / 1000); // Return seconds
    }
}
// Singleton instance
export const systemStatus = new SystemStatusManager();
