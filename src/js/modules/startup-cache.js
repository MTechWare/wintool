/**
 * Startup Cache System
 * 
 * Provides persistent caching for expensive startup operations
 * to dramatically reduce subsequent startup times.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class StartupCache {
  constructor() {
    this.cacheDir = null;
    this.cacheFile = null;
    this.cache = new Map();
    this.initialized = false;
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours default
  }

  /**
   * Initialize the cache system
   */
  async initialize(app) {
    if (this.initialized) return;

    try {
      // Use app's userData directory for cache
      this.cacheDir = path.join(app.getPath('userData'), 'cache');
      this.cacheFile = path.join(this.cacheDir, 'startup-cache.json');

      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Load existing cache
      await this.loadCache();

      this.initialized = true;
      console.log('🗄️ Startup cache initialized');
    } catch (error) {
      console.error('Failed to initialize startup cache:', error);
    }
  }

  /**
   * Load cache from disk
   */
  async loadCache() {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8');
      const parsed = JSON.parse(data);
      
      // Convert back to Map and filter expired entries
      const now = Date.now();
      for (const [key, entry] of Object.entries(parsed)) {
        if (now - entry.timestamp < this.maxAge) {
          this.cache.set(key, entry);
        }
      }

      console.log(`📥 Loaded ${this.cache.size} cached entries`);
    } catch (error) {
      // Cache file doesn't exist or is corrupted, start fresh
      console.log('🆕 Starting with fresh cache');
    }
  }

  /**
   * Save cache to disk
   */
  async saveCache() {
    if (!this.initialized) return;

    try {
      const cacheObject = Object.fromEntries(this.cache);
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheObject, null, 2));
      console.log(`💾 Saved ${this.cache.size} cache entries`);
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  /**
   * Get cached value
   */
  get(key, maxAge = this.maxAge) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    console.log(`🎯 Cache hit for: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.value;
  }

  /**
   * Set cached value
   */
  set(key, value, metadata = {}) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      metadata
    });

    // Periodically save cache (debounced)
    this.debouncedSave();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key, maxAge = this.maxAge) {
    return this.get(key, maxAge) !== null;
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let totalSize = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += JSON.stringify(entry).length;
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
    }

    return {
      entryCount: this.cache.size,
      totalSizeBytes: totalSize,
      oldestEntryAge: oldestEntry === now ? 0 : now - oldestEntry,
      newestEntryAge: newestEntry === 0 ? 0 : now - newestEntry,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }

  /**
   * Debounced save function
   */
  debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveCache();
    }, 5000); // Save after 5 seconds of inactivity
  }

  /**
   * Cache system information
   */
  async cacheSystemInfo() {
    const key = 'system-info';
    
    // Check if we have recent system info
    if (this.has(key, 60 * 60 * 1000)) { // 1 hour for system info
      return this.get(key);
    }

    // Generate new system info
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: os.totalmem(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      hostname: os.hostname(),
      release: os.release(),
      version: os.version()
    };

    this.set(key, systemInfo);
    return systemInfo;
  }

  /**
   * Cache application settings
   */
  cacheAppSettings(settings) {
    this.set('app-settings', settings);
  }

  /**
   * Get cached application settings
   */
  getCachedAppSettings() {
    return this.get('app-settings', 10 * 60 * 1000); // 10 minutes for settings
  }

  /**
   * Cache plugin list
   */
  cachePluginList(plugins) {
    this.set('plugin-list', plugins);
  }

  /**
   * Get cached plugin list
   */
  getCachedPluginList() {
    return this.get('plugin-list', 30 * 60 * 1000); // 30 minutes for plugins
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Shutdown cache system
   */
  async shutdown() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    await this.saveCache();
    console.log('💤 Startup cache shutdown complete');
  }
}

// Global cache instance
const startupCache = new StartupCache();

module.exports = {
  StartupCache,
  startupCache
};
