/**
 * Spreadsheet Export Functionality
 * Converts scraped classified ad data to various spreadsheet formats
 */

class SpreadsheetExporter {
  constructor() {
    this.headers = [
      'Title', 'Price', 'Location', 'Category', 'Domain', 'URL', 
      'Description', 'Images Count', 'Contact Phone', 'Contact Email',
      'Date Scraped', 'Extraction Time (ms)'
    ];
  }

  // Convert single ad data to row format
  adToRow(adData) {
    return [
      adData.title || '',
      adData.price || '',
      adData.location || '',
      adData.category || '',
      adData.domain || '',
      adData.url || '',
      (adData.description || '').substring(0, 500) + (adData.description && adData.description.length > 500 ? '...' : ''),
      adData.images ? adData.images.length : 0,
      adData.contact?.phone || '',
      adData.contact?.email || '',
      adData.timestamp || '',
      adData.extractionTime || ''
    ];
  }

  // Convert multiple ads to CSV format
  toCSV(adsData) {
    const rows = [this.headers];
    
    if (Array.isArray(adsData)) {
      adsData.forEach(ad => {
        rows.push(this.adToRow(ad));
      });
    } else {
      rows.push(this.adToRow(adsData));
    }

    return rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if necessary
        const cellStr = String(cell || '');
        if (cellStr.includes('"') || cellStr.includes(',') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  }

  // Convert to Excel-compatible format (TSV)
  toTSV(adsData) {
    const rows = [this.headers];
    
    if (Array.isArray(adsData)) {
      adsData.forEach(ad => {
        rows.push(this.adToRow(ad));
      });
    } else {
      rows.push(this.adToRow(adsData));
    }

    return rows.map(row => 
      row.map(cell => String(cell || '').replace(/\t/g, ' ')).join('\t')
    ).join('\n');
  }

  // Create detailed JSON export with all metadata
  toJSON(adsData) {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalAds: Array.isArray(adsData) ? adsData.length : 1,
      ads: Array.isArray(adsData) ? adsData : [adsData]
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Generate HTML table for preview
  toHTML(adsData) {
    const ads = Array.isArray(adsData) ? adsData : [adsData];
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Classified Ads Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .description { max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
        .images { color: #666; }
        .price { font-weight: bold; color: #2c5aa0; }
    </style>
</head>
<body>
    <h1>Classified Ads Export</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>
    <p>Total ads: ${ads.length}</p>
    
    <table>
        <thead>
            <tr>
                ${this.headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
`;

    ads.forEach(ad => {
      const row = this.adToRow(ad);
      html += '<tr>';
      row.forEach((cell, index) => {
        let cellClass = '';
        if (this.headers[index] === 'Description') cellClass = 'description';
        if (this.headers[index] === 'Images Count') cellClass = 'images';
        if (this.headers[index] === 'Price') cellClass = 'price';
        
        html += `<td class="${cellClass}">${this.escapeHtml(String(cell))}</td>`;
      });
      html += '</tr>';
    });

    html += `
        </tbody>
    </table>
</body>
</html>`;

    return html;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Download file with given content and filename
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export to CSV file
  exportCSV(adsData, filename = null) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const csvFilename = filename || `classified_ads_${timestamp}.csv`;
    const csvContent = this.toCSV(adsData);
    this.downloadFile(csvContent, csvFilename, 'text/csv');
  }

  // Export to Excel-compatible TSV file
  exportExcel(adsData, filename = null) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const tsvFilename = filename || `classified_ads_${timestamp}.tsv`;
    const tsvContent = this.toTSV(adsData);
    this.downloadFile(tsvContent, tsvFilename, 'text/tab-separated-values');
  }

  // Export to JSON file
  exportJSON(adsData, filename = null) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const jsonFilename = filename || `classified_ads_${timestamp}.json`;
    const jsonContent = this.toJSON(adsData);
    this.downloadFile(jsonContent, jsonFilename, 'application/json');
  }

  // Export to HTML file for preview
  exportHTML(adsData, filename = null) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const htmlFilename = filename || `classified_ads_${timestamp}.html`;
    const htmlContent = this.toHTML(adsData);
    this.downloadFile(htmlContent, htmlFilename, 'text/html');
  }
}

// Storage helper for managing scraped ads
class AdStorage {
  constructor() {
    this.storageKey = 'scraped_ads';
  }

  // Save ad to storage
  async saveAd(adData) {
    try {
      const stored = await this.getAllAds();
      
      // Add unique ID if not present
      if (!adData.id) {
        adData.id = this.generateId(adData);
      }

      // Check for duplicates
      const existing = stored.find(ad => ad.id === adData.id);
      if (!existing) {
        stored.push(adData);
        await chrome.storage.local.set({ [this.storageKey]: stored });
        console.log('Ad saved to storage:', adData.title);
      } else {
        console.log('Ad already exists in storage:', adData.title);
      }
      
      return stored.length;
    } catch (error) {
      console.error('Error saving ad:', error);
      return 0;
    }
  }

  // Get all stored ads
  async getAllAds() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('Error getting ads:', error);
      return [];
    }
  }

  // Clear all stored ads
  async clearAllAds() {
    try {
      await chrome.storage.local.set({ [this.storageKey]: [] });
      console.log('All ads cleared from storage');
    } catch (error) {
      console.error('Error clearing ads:', error);
    }
  }

  // Remove specific ad
  async removeAd(adId) {
    try {
      const stored = await this.getAllAds();
      const filtered = stored.filter(ad => ad.id !== adId);
      await chrome.storage.local.set({ [this.storageKey]: filtered });
      console.log('Ad removed from storage:', adId);
      return filtered.length;
    } catch (error) {
      console.error('Error removing ad:', error);
      return 0;
    }
  }

  // Alias for removeAd
  async deleteAd(adId) {
    return this.removeAd(adId);
  }

  // Get ads by platform
  async getAdsByPlatform(platform) {
    try {
      const ads = await this.getAllAds();
      return ads.filter(ad => ad.platform === platform);
    } catch (error) {
      console.error('Error getting ads by platform:', error);
      return [];
    }
  }

  // Get recent ads
  async getRecentAds(limit = 10) {
    try {
      const ads = await this.getAllAds();
      return ads
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent ads:', error);
      return [];
    }
  }

  // Get storage stats (alias for getStats)
  async getStorageStats() {
    const stats = await this.getStats();
    return {
      totalAds: stats.total,
      platforms: Object.keys(stats.byDomain).length,
      categories: Object.keys(stats.byCategory).length,
      priceRange: stats.priceRange,
      dateRange: stats.dateRange,
      byPlatform: stats.byDomain,
      byCategory: stats.byCategory
    };
  }

  // Generate unique ID for ad
  generateId(adData) {
    const key = `${adData.domain}_${adData.title}_${adData.price}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  // Get storage statistics
  async getStats() {
    const ads = await this.getAllAds();
    const stats = {
      total: ads.length,
      byDomain: {},
      byCategory: {},
      priceRange: { min: null, max: null },
      dateRange: { oldest: null, newest: null }
    };

    ads.forEach(ad => {
      // Count by domain
      stats.byDomain[ad.domain] = (stats.byDomain[ad.domain] || 0) + 1;
      
      // Count by category
      stats.byCategory[ad.category] = (stats.byCategory[ad.category] || 0) + 1;
      
      // Track price range
      if (ad.price) {
        const priceNum = parseFloat(ad.price.replace(/[^\d.]/g, ''));
        if (!isNaN(priceNum)) {
          if (stats.priceRange.min === null || priceNum < stats.priceRange.min) {
            stats.priceRange.min = priceNum;
          }
          if (stats.priceRange.max === null || priceNum > stats.priceRange.max) {
            stats.priceRange.max = priceNum;
          }
        }
      }
      
      // Track date range
      if (ad.timestamp) {
        const date = new Date(ad.timestamp);
        if (stats.dateRange.oldest === null || date < new Date(stats.dateRange.oldest)) {
          stats.dateRange.oldest = ad.timestamp;
        }
        if (stats.dateRange.newest === null || date > new Date(stats.dateRange.newest)) {
          stats.dateRange.newest = ad.timestamp;
        }
      }
    });

    return stats;
  }
}

// Export classes for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = { SpreadsheetExporter, AdStorage };
}

// Make globally available
window.SpreadsheetExporter = SpreadsheetExporter;
window.AdStorage = AdStorage;