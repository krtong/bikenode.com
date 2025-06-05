// Background service worker for Universal Classified Ad Scraper
// Handles extension lifecycle and background tasks

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Universal Classified Ad Scraper installed');
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractedData') {
    // Process extracted data
    console.log('Received data from content script:', request.data);
    sendResponse({ status: 'received' });
  }
});

// Storage management class
class AdStorage {
  constructor() {
    this.storageKey = 'scrapedAds';
  }

  async getAllAds() {
    const result = await chrome.storage.local.get(this.storageKey);
    return result[this.storageKey] || [];
  }

  async saveAd(adData) {
    const ads = await this.getAllAds();
    
    // Add unique ID and timestamp
    adData.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    adData.savedAt = new Date().toISOString();
    
    ads.push(adData);
    
    await chrome.storage.local.set({ [this.storageKey]: ads });
    return ads.length;
  }

  async clearAllAds() {
    await chrome.storage.local.set({ [this.storageKey]: [] });
  }

  async getStats() {
    const ads = await this.getAllAds();
    const stats = {
      total: ads.length,
      byDomain: {},
      byCategory: {}
    };

    ads.forEach(ad => {
      // Count by domain
      if (!stats.byDomain[ad.domain]) {
        stats.byDomain[ad.domain] = 0;
      }
      stats.byDomain[ad.domain]++;

      // Count by category
      if (!stats.byCategory[ad.category]) {
        stats.byCategory[ad.category] = 0;
      }
      stats.byCategory[ad.category]++;
    });

    return stats;
  }
}

// Make storage available globally
self.AdStorage = AdStorage;