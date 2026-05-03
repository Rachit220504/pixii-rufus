/**
 * Query Cache Service
 * In-memory cache for search results with TTL
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly TTL: number = 10 * 60 * 1000; // 10 minutes

  /**
   * Get cached result if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    const isExpired = now - entry.timestamp > this.TTL;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`[QueryCache] HIT for key: ${key}`);
    return entry.data as T;
  }

  /**
   * Store result in cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`[QueryCache] SET for key: ${key}`);
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const isExpired = Date.now() - entry.timestamp > this.TTL;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`[QueryCache] Cleared all entries`);
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; entries: string[] } {
    // Clean expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }

    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Generate cache key from query
   */
  generateKey(query: string, filters?: any): string {
    const normalized = query.toLowerCase().trim();
    if (filters) {
      return `${normalized}:${JSON.stringify(filters)}`;
    }
    return normalized;
  }
}

export const queryCache = new QueryCache();
