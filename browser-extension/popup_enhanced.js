/**
 * Enhanced Popup Script with Craigslist Full-Image Support
 */

class EnhancedPopupController {
  constructor() {
    this.storage = new AdStorage();
    this.exporter = new SpreadsheetExporter();
    this.priceComparison = new PriceComparison();
    this.currentAd = null;
    this.currentTab = null;
    
    this.initializeEventListeners();
    this.updateUI();
  }

  async initializeEventListeners() {
    // Get current tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
    
    // Update page info
    this.updatePageInfo();
    
    // Main action buttons
    document.getElementById('extractBtn').addEventListener('click', () => this.extractData());
    
    // Other event listeners remain the same...
  }

  updatePageInfo() {
    if (!this.currentTab) return;
    
    try {
      const url = new URL(this.currentTab.url);
      const domain = url.hostname.replace('www.', '');
      
      document.getElementById('currentDomain').textContent = domain;
      
      // Special handling for Craigslist
      if (domain.includes('craigslist.org')) {
        const statusEl = document.getElementById('pageStatus');
        statusEl.innerHTML = 'Craigslist detected<br><small>Click "Extract Data" for enhanced image extraction</small>';
        statusEl.style.color = '#28a745';
      }
    } catch (e) {
      document.getElementById('currentDomain').textContent = 'Unknown';
    }
  }

  async extractData() {
    const statusEl = document.getElementById('results');
    const btnEl = document.getElementById('extractBtn');
    
    try {
      btnEl.disabled = true;
      btnEl.textContent = 'Extracting...';
      statusEl.textContent = 'Extracting data from page...';
      
      // Check if this is Craigslist
      const url = new URL(this.currentTab.url);
      const isCraigslist = url.hostname.includes('craigslist.org');
      
      if (isCraigslist) {
        // Special handling for Craigslist to get full-size images
        statusEl.textContent = 'Craigslist detected - checking for full-size images...';
        
        // First, click on the main image to trigger 1200x900 loading
        await chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          func: async () => {
            console.log('Attempting to load Craigslist full-size images...');
            
            const mainImage = document.querySelector('.slide.visible img, .slide.first img');
            if (mainImage) {
              console.log('Clicking main image to trigger full-size loading...');
              mainImage.click();
              
              // Wait for images to load
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Check if 1200x900 images loaded
              const largeImages = document.querySelectorAll('.slide img[src*="1200x900"]');
              console.log(`Found ${largeImages.length} full-size images after click`);
              
              return largeImages.length;
            }
            return 0;
          }
        });
        
        // Wait a bit more for images to fully load
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Now inject and run the scraper
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['dynamicScraper.js']
      });
      
      // Execute extraction
      const extractionResults = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        func: async () => {
          if (typeof extractClassifiedAd === 'function') {
            return await extractClassifiedAd();
          } else {
            throw new Error('Dynamic scraper not loaded');
          }
        }
      });
      
      const adData = extractionResults[0].result;
      
      if (adData.error) {
        throw new Error(adData.error);
      }
      
      // Display results
      this.displayResults(adData);
      this.currentAd = adData;
      
      // Special message for Craigslist
      if (isCraigslist && adData.images) {
        const largeImages = adData.images.filter(img => img.includes('1200x900'));
        const mediumImages = adData.images.filter(img => img.includes('600x450'));
        
        if (largeImages.length > 0) {
          console.log(`✅ Successfully extracted ${largeImages.length} full-size (1200x900) images!`);
        } else if (mediumImages.length > 0) {
          console.log(`⚠️ Only found ${mediumImages.length} medium (600x450) images. Try clicking the main image first!`);
        }
      }
      
    } catch (error) {
      console.error('Extraction error:', error);
      statusEl.textContent = `Error: ${error.message}`;
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Extract Data';
    }
  }

  displayResults(data) {
    const resultsEl = document.getElementById('results');
    
    let html = '<div class="extracted-data">';
    
    // Title and basic info
    if (data.title) {
      html += `<div><strong>Title:</strong> ${data.title}</div>`;
    }
    
    if (data.price) {
      html += `<div><strong>Price:</strong> ${data.price}</div>`;
    }
    
    if (data.location) {
      html += `<div><strong>Location:</strong> ${data.location}</div>`;
    }
    
    // Images with size info
    if (data.images && data.images.length > 0) {
      html += `<div><strong>Images:</strong> ${data.images.length}`;
      
      // Group by size
      const imagesBySize = {};
      data.images.forEach(url => {
        const sizeMatch = url.match(/(\d+x\d+)/);
        const size = sizeMatch ? sizeMatch[1] : 'unknown';
        if (!imagesBySize[size]) imagesBySize[size] = 0;
        imagesBySize[size]++;
      });
      
      const sizes = Object.entries(imagesBySize).map(([size, count]) => `${count} ${size}`).join(', ');
      html += ` (${sizes})`;
      
      html += '<div class="image-urls" style="max-height: 100px; overflow-y: auto; font-size: 11px; margin-left: 20px;">';
      data.images.forEach(url => {
        const sizeMatch = url.match(/(\d+x\d+)/);
        const size = sizeMatch ? `[${sizeMatch[1]}]` : '';
        html += `<div>${size} ${url}</div>`;
      });
      html += '</div></div>';
    }
    
    // Contact info
    if (data.contact && Object.keys(data.contact).length > 0) {
      html += '<div><strong>Contact:</strong>';
      if (data.contact.phone) html += ` Phone: ${data.contact.phone}`;
      if (data.contact.email) html += ` Email: ${data.contact.email}`;
      html += '</div>';
    }
    
    // Attributes
    if (data.attributes && Object.keys(data.attributes).length > 0) {
      html += '<div><strong>Attributes:</strong></div>';
      html += '<div style="margin-left: 20px; font-size: 12px;">';
      Object.entries(data.attributes).slice(0, 10).forEach(([key, value]) => {
        html += `<div>${key}: ${value}</div>`;
      });
      if (Object.keys(data.attributes).length > 10) {
        html += `<div>... and ${Object.keys(data.attributes).length - 10} more</div>`;
      }
      html += '</div>';
    }
    
    html += '</div>';
    
    resultsEl.innerHTML = html;
  }

  // Keep all other methods from the original popup.js...
  async updateUI() {
    // Same as original
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new EnhancedPopupController();
});