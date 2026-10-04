/**
 * SAFAR Deduplication Engine
 * 
 * Protects against duplicate telemetry pings caused by flaky mobile networks
 * and client retries without unbound memory consumption.
 * 
 * Uses a fixed-size Ring Buffer + Set per trip/driver (Sliding Window LRU).
 * 
 * Time Complexity: O(1) average lookup and insertion
 * Space Complexity: O(K) bounded per active trip (where K = 100 entries max)
 */

interface DeduplicationWindow {
  set: Set<string>;
  queue: string[];
  maxSize: number;
  lastAccessedAt: number;
}

export class TelemetryDeduplicationEngine {
  private windows = new Map<string, DeduplicationWindow>();
  private readonly defaultWindowSize: number;
  private readonly windowTtlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(windowSize = 100, windowTtlMs = 1000 * 60 * 30) {
    this.defaultWindowSize = windowSize;
    this.windowTtlMs = windowTtlMs;

    // Periodic sweep every 5 minutes to release inactive trip windows
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanupExpiredWindows(), 1000 * 60 * 5);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Generates a deterministic fingerprint for a telemetry event.
   */
  public generateFingerprint(
    driverId: string,
    timestamp: number,
    latitude: number,
    longitude: number,
    updateId?: string
  ): string {
    if (updateId) {
      return `${driverId}:id:${updateId}`;
    }
    // Discretize lat/lng to 5 decimal places (~1.1m precision) + exact timestamp
    const roundedLat = latitude.toFixed(5);
    const roundedLng = longitude.toFixed(5);
    return `${driverId}:${timestamp}:${roundedLat},${roundedLng}`;
  }

  /**
   * Checks if a telemetry event is a duplicate.
   * If not duplicate, records the event in the sliding window.
   * 
   * @param key Unique tripId or driverId acting as the window partition
   * @param fingerprint Event fingerprint
   * @returns true if duplicate, false if new
   */
  public isDuplicate(key: string, fingerprint: string): boolean {
    let window = this.windows.get(key);

    if (!window) {
      window = {
        set: new Set<string>(),
        queue: [],
        maxSize: this.defaultWindowSize,
        lastAccessedAt: Date.now(),
      };
      this.windows.set(key, window);
    }

    window.lastAccessedAt = Date.now();

    // 1. Check if already seen
    if (window.set.has(fingerprint)) {
      return true;
    }

    // 2. Add to Set and Queue
    window.set.add(fingerprint);
    window.queue.push(fingerprint);

    // 3. Enforce sliding window capacity (FIFO eviction)
    if (window.queue.length > window.maxSize) {
      const oldest = window.queue.shift();
      if (oldest) {
        window.set.delete(oldest);
      }
    }

    return false;
  }

  /**
   * Explicitly evicts state for a finished or cancelled trip.
   */
  public evict(key: string): void {
    const window = this.windows.get(key);
    if (window) {
      window.set.clear();
      window.queue = [];
      this.windows.delete(key);
    }
  }

  /**
   * Sweeps and evicts idle windows exceeding windowTtlMs.
   */
  public cleanupExpiredWindows(): number {
    const now = Date.now();
    let evictedCount = 0;

    this.windows.forEach((window, key) => {
      if (now - window.lastAccessedAt > this.windowTtlMs) {
        window.set.clear();
        this.windows.delete(key);
        evictedCount++;
      }
    });

    return evictedCount;
  }

  public getActiveWindowCount(): number {
    return this.windows.size;
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.windows.clear();
  }
}

// Global Singleton Instance
export const telemetryDeduplicator = new TelemetryDeduplicationEngine();
