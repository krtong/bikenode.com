/**
 * Click Pattern Storage
 * Stores successful click patterns for different sites
 */

class ClickPatternStorage {
  constructor() {
    this.storageKey = 'clickPatterns';
  }

  async getPatterns() {
    const result = await chrome.storage.local.get(this.storageKey);
    return result[this.storageKey] || {};
  }

  async saveSuccessfulPattern(domain, pattern) {
    const patterns = await this.getPatterns();
    
    if (!patterns[domain]) {
      patterns[domain] = {
        successful: [],
        failed: []
      };
    }
    
    // Add to successful patterns
    const patternData = {
      strategy: pattern.strategy,
      timestamp: new Date().toISOString(),
      imageCount: pattern.imageCount,
      clickSequence: pattern.clickSequence
    };
    
    patterns[domain].successful.push(patternData);
    
    // Keep only last 10 successful patterns
    if (patterns[domain].successful.length > 10) {
      patterns[domain].successful = patterns[domain].successful.slice(-10);
    }
    
    await chrome.storage.local.set({ [this.storageKey]: patterns });
  }

  async saveFailedPattern(domain, pattern) {
    const patterns = await this.getPatterns();
    
    if (!patterns[domain]) {
      patterns[domain] = {
        successful: [],
        failed: []
      };
    }
    
    patterns[domain].failed.push({
      strategy: pattern.strategy,
      timestamp: new Date().toISOString(),
      reason: pattern.reason
    });
    
    // Keep only last 5 failed patterns
    if (patterns[domain].failed.length > 5) {
      patterns[domain].failed = patterns[domain].failed.slice(-5);
    }
    
    await chrome.storage.local.set({ [this.storageKey]: patterns });
  }

  async getBestStrategy(domain) {
    const patterns = await this.getPatterns();
    
    if (!patterns[domain] || patterns[domain].successful.length === 0) {
      return null;
    }
    
    // Find the most successful strategy
    const strategyCounts = {};
    patterns[domain].successful.forEach(pattern => {
      const key = pattern.strategy;
      if (!strategyCounts[key]) {
        strategyCounts[key] = {
          count: 0,
          totalImages: 0,
          lastUsed: pattern.timestamp
        };
      }
      strategyCounts[key].count++;
      strategyCounts[key].totalImages += pattern.imageCount;
      if (pattern.timestamp > strategyCounts[key].lastUsed) {
        strategyCounts[key].lastUsed = pattern.timestamp;
      }
    });
    
    // Sort by success rate and recency
    const sortedStrategies = Object.entries(strategyCounts)
      .map(([strategy, data]) => ({
        strategy,
        avgImages: data.totalImages / data.count,
        count: data.count,
        lastUsed: data.lastUsed
      }))
      .sort((a, b) => {
        // Prioritize by average image count
        if (b.avgImages !== a.avgImages) {
          return b.avgImages - a.avgImages;
        }
        // Then by usage count
        return b.count - a.count;
      });
    
    return sortedStrategies[0]?.strategy || null;
  }

  async clearPatterns(domain = null) {
    if (domain) {
      const patterns = await this.getPatterns();
      delete patterns[domain];
      await chrome.storage.local.set({ [this.storageKey]: patterns });
    } else {
      await chrome.storage.local.remove(this.storageKey);
    }
  }
}

// Export for use in popup
if (typeof window !== 'undefined') {
  window.ClickPatternStorage = ClickPatternStorage;
}