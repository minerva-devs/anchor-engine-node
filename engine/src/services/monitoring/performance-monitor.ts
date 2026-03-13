/**
 * Performance Monitoring Service
 * 
 * Monitors system performance, resource usage, and provides metrics
 */

import { StructuredLogger } from '../../utils/structured-logger.js';
import { resourceManager } from '../../utils/resource-manager.js';
import { systemStatus } from '../system-status.js';
import * as os from 'os';

export interface PerformanceMetrics {
  timestamp: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
    percentageUsed: number;
  };
  cpu: {
    usagePercent: number;
    loadAverage: number[];
  };
  system: {
    uptime: number;
    totalMemory: number;
    freeMemory: number;
  };
  engine: {
    isBusy: boolean;
    activeSearches: number;
    activeIngestions: number;
  };
  database: {
    isConnected: boolean;
    pendingOperations: number;
  };
}

export interface MonitoringConfig {
  intervalMs: number;
  logLevel: 'info' | 'debug' | 'warn' | 'error';
  collectDetailedMetrics: boolean;
  alertThresholds: {
    memoryUsage: number; // percentage
    cpuUsage: number;    // percentage
    responseTime: number; // milliseconds
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: MonitoringConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private metricsHistory: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last 1000 metrics

  private activeSearches = 0;
  private activeIngestions = 0;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuTime = 0;

  private constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      intervalMs: 5000, // Default to 5 seconds
      logLevel: 'info',
      collectDetailedMetrics: true,
      alertThresholds: {
        memoryUsage: 80, // Alert if memory usage > 80%
        cpuUsage: 80,    // Alert if CPU usage > 80%
        responseTime: 5000 // Alert if response time > 5 seconds
      },
      ...config
    };
  }

  public static getInstance(config?: Partial<MonitoringConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    StructuredLogger.info('PERFORMANCE_MONITOR', {
      message: `Starting performance monitoring`,
      intervalMs: this.config.intervalMs
    });

    this.intervalId = setInterval(() => {
      this.collectAndLogMetrics();
    }, this.config.intervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      StructuredLogger.info('PERFORMANCE_MONITOR', {
        message: 'Stopped performance monitoring'
      });
    }
  }

  /**
   * Collect current performance metrics
   */
  collectMetrics(): PerformanceMetrics {
    const memoryStats = resourceManager.getMemoryStats();
    const sysStatus = systemStatus.getStatus();
    
    // Calculate CPU usage
    const cpuUsage = this.calculateCpuUsage();
    
    // Get system info
    const sysInfo = {
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    };

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memory: {
        rss: memoryStats.rss,
        heapTotal: memoryStats.heapTotal,
        heapUsed: memoryStats.heapUsed,
        external: memoryStats.external,
        arrayBuffers: memoryStats.arrayBuffers,
        percentageUsed: memoryStats.percentageUsed
      },
      cpu: {
        usagePercent: cpuUsage,
        loadAverage: os.loadavg()
      },
      system: sysInfo,
      engine: {
        isBusy: sysStatus.isBusy,
        activeSearches: this.activeSearches,
        activeIngestions: this.activeIngestions
      },
      database: {
        isConnected: true, // This would need to be implemented based on your DB connection status
        pendingOperations: 0 // This would need to be implemented based on your DB operations
      }
    };

    // Add to history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory.shift(); // Remove oldest
    }

    // Check for alerts
    this.checkAlerts(metrics);

    return metrics;
  }

  /**
   * Collect and log metrics
   */
  private collectAndLogMetrics(): void {
    const metrics = this.collectMetrics();
    
    // Log based on configured level
    switch (this.config.logLevel) {
      case 'debug':
        StructuredLogger.debug('PERFORMANCE_METRICS', metrics);
        break;
      case 'info':
        StructuredLogger.info('PERFORMANCE_METRICS', metrics);
        break;
      case 'warn':
        if (this.shouldAlert(metrics)) {
          StructuredLogger.warn('PERFORMANCE_ALERT', metrics);
        }
        break;
      case 'error':
        if (this.isCritical(metrics)) {
          StructuredLogger.error('PERFORMANCE_CRITICAL', metrics);
        }
        break;
    }
  }

  /**
   * Check if metrics meet alert criteria
   */
  private shouldAlert(metrics: PerformanceMetrics): boolean {
    return (
      metrics.memory.percentageUsed > this.config.alertThresholds.memoryUsage ||
      metrics.cpu.usagePercent > this.config.alertThresholds.cpuUsage
    );
  }

  /**
   * Check if metrics are critical
   */
  private isCritical(metrics: PerformanceMetrics): boolean {
    return (
      metrics.memory.percentageUsed > 95 ||
      metrics.cpu.usagePercent > 95
    );
  }

  /**
   * Check for alerts based on metrics
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    if (metrics.memory.percentageUsed > this.config.alertThresholds.memoryUsage) {
      StructuredLogger.warn('PERFORMANCE_ALERT', {
        message: 'High memory usage detected',
        threshold: this.config.alertThresholds.memoryUsage,
        actual: metrics.memory.percentageUsed
      });
    }

    if (metrics.cpu.usagePercent > this.config.alertThresholds.cpuUsage) {
      StructuredLogger.warn('PERFORMANCE_ALERT', {
        message: 'High CPU usage detected',
        threshold: this.config.alertThresholds.cpuUsage,
        actual: metrics.cpu.usagePercent
      });
    }
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(): number {
    const currentUsage = process.cpuUsage();
    const currentTime = Date.now();

    if (!this.lastCpuUsage) {
      // First measurement, can't calculate percentage yet
      this.lastCpuUsage = currentUsage;
      this.lastCpuTime = currentTime;
      return 0;
    }

    const elapsedReal = currentTime - this.lastCpuTime;
    const elapsedUser = currentUsage.user - this.lastCpuUsage.user;
    const elapsedSystem = currentUsage.system - this.lastCpuUsage.system;

    // Convert to percentage (multiply by 100 and divide by elapsed time in microseconds)
    const totalElapsedMicro = elapsedReal * 1000; // Convert ms to µs
    const cpuPercent = ((elapsedUser + elapsedSystem) / totalElapsedMicro) * 100;

    // Update for next calculation
    this.lastCpuUsage = currentUsage;
    this.lastCpuTime = currentTime;

    // Return bounded percentage
    return Math.min(100, Math.max(0, cpuPercent));
  }

  /**
   * Increment active searches counter
   */
  incrementActiveSearches(): void {
    this.activeSearches++;
  }

  /**
   * Decrement active searches counter
   */
  decrementActiveSearches(): void {
    this.activeSearches = Math.max(0, this.activeSearches - 1);
  }

  /**
   * Increment active ingestions counter
   */
  incrementActiveIngestions(): void {
    this.activeIngestions++;
  }

  /**
   * Decrement active ingestions counter
   */
  decrementActiveIngestions(): void {
    this.activeIngestions = Math.max(0, this.activeIngestions - 1);
  }

  /**
   * Get recent metrics history
   */
  getMetricsHistory(count: number = 10): PerformanceMetrics[] {
    return this.metricsHistory.slice(-count);
  }

  /**
   * Get average metrics over a time period
   */
  getAverageMetrics(minutes: number = 5): PerformanceMetrics | null {
    if (this.metricsHistory.length === 0) return null;

    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    const recentMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) return null;

    // Calculate averages
    const avgMetrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memory: {
        rss: recentMetrics.reduce((sum, m) => sum + m.memory.rss, 0) / recentMetrics.length,
        heapTotal: recentMetrics.reduce((sum, m) => sum + m.memory.heapTotal, 0) / recentMetrics.length,
        heapUsed: recentMetrics.reduce((sum, m) => sum + m.memory.heapUsed, 0) / recentMetrics.length,
        external: recentMetrics.reduce((sum, m) => sum + m.memory.external, 0) / recentMetrics.length,
        arrayBuffers: recentMetrics.reduce((sum, m) => sum + m.memory.arrayBuffers, 0) / recentMetrics.length,
        percentageUsed: recentMetrics.reduce((sum, m) => sum + m.memory.percentageUsed, 0) / recentMetrics.length
      },
      cpu: {
        usagePercent: recentMetrics.reduce((sum, m) => sum + m.cpu.usagePercent, 0) / recentMetrics.length,
        loadAverage: [
          recentMetrics.reduce((sum, m) => sum + m.cpu.loadAverage[0], 0) / recentMetrics.length,
          recentMetrics.reduce((sum, m) => sum + m.cpu.loadAverage[1], 0) / recentMetrics.length,
          recentMetrics.reduce((sum, m) => sum + m.cpu.loadAverage[2], 0) / recentMetrics.length
        ]
      },
      system: {
        uptime: recentMetrics.reduce((sum, m) => sum + m.system.uptime, 0) / recentMetrics.length,
        totalMemory: recentMetrics.reduce((sum, m) => sum + m.system.totalMemory, 0) / recentMetrics.length,
        freeMemory: recentMetrics.reduce((sum, m) => sum + m.system.freeMemory, 0) / recentMetrics.length
      },
      engine: {
        isBusy: recentMetrics.some(m => m.engine.isBusy), // True if any were busy
        activeSearches: recentMetrics.reduce((sum, m) => sum + m.engine.activeSearches, 0) / recentMetrics.length,
        activeIngestions: recentMetrics.reduce((sum, m) => sum + m.engine.activeIngestions, 0) / recentMetrics.length
      },
      database: {
        isConnected: recentMetrics.every(m => m.database.isConnected), // True only if all were connected
        pendingOperations: recentMetrics.reduce((sum, m) => sum + m.database.pendingOperations, 0) / recentMetrics.length
      }
    };

    return avgMetrics;
  }
}