/**
 * Enhanced Popup Script for Universal Classified Ad Scraper
 * Handles UI interactions and coordinates all extension functionality
 */

class PopupController {
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
    document.getElementById('scrapeBtn').addEventListener('click', () => this.scrapeCurrentPage());
    document.getElementById('compareBtn').addEventListener('click', () => this.comparePrices());
    
    // Storage management
    document.getElementById('viewStorageBtn').addEventListener('click', () => this.viewStoredAds());
    document.getElementById('clearStorageBtn').addEventListener('click', () => this.clearStorage());
    
    // Export buttons
    document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportData('csv'));
    document.getElementById('exportExcelBtn').addEventListener('click', () => this.exportData('excel'));
    document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportData('json'));
    document.getElementById('exportHtmlBtn').addEventListener('click', () => this.exportData('html'));
    
    // Market analysis
    document.getElementById('marketAnalysisBtn').addEventListener('click', () => this.generateMarketAnalysis());
  }

  updatePageInfo() {
    if (!this.currentTab) return;
    
    try {
      const url = new URL(this.currentTab.url);
      const domain = url.hostname.replace('www.', '');
      
      document.getElementById('currentDomain').textContent = domain;
      
      // Check if this is a supported platform
      const supportedDomains = [
        'craigslist.org', 'facebook.com', 'marketplace.facebook.com', 'ebay.com',
        'pinkbike.com', 'offerup.com', 'mercari.com', 'autotrader.com', 'cars.com'
      ];
      
      const isSupported = supportedDomains.some(d => domain.includes(d));
      const statusEl = document.getElementById('pageStatus');
      
      if (isSupported) {
        statusEl.textContent = 'Supported platform ✓';
        statusEl.style.color = '#28a745';
      } else {
        statusEl.textContent = 'Universal scraping available';
        statusEl.style.color = '#ffc107';
      }
    } catch (e) {
      document.getElementById('currentDomain').textContent = 'Unknown';
      document.getElementById('pageStatus').textContent = 'Invalid URL';
    }
  }

  async updateUI() {
    // Update storage stats
    const stats = await this.storage.getStats();
    document.getElementById('totalAds').textContent = stats.total;
    document.getElementById('uniqueDomains').textContent = Object.keys(stats.byDomain).length;
    
    // Enable/disable buttons based on stored data
    const hasData = stats.total > 0;
    document.getElementById('compareBtn').disabled = !hasData;
    document.getElementById('exportCsvBtn').disabled = !hasData;
    document.getElementById('exportExcelBtn').disabled = !hasData;
    document.getElementById('exportJsonBtn').disabled = !hasData;
    document.getElementById('exportHtmlBtn').disabled = !hasData;
    document.getElementById('marketAnalysisBtn').disabled = !hasData;
  }

  async scrapeCurrentPage() {
    const statusEl = document.getElementById('scrapeStatus');
    const btnEl = document.getElementById('scrapeBtn');
    
    try {
      // Update UI
      btnEl.disabled = true;
      btnEl.textContent = 'Scraping...';
      statusEl.className = 'status info';
      statusEl.textContent = 'Extracting data from page...';
      statusEl.classList.remove('hidden');
      
      // Inject and execute the dynamic scraper
      const results = await chrome.scripting.executeScript({
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
      
      // Save to storage
      const totalAds = await this.storage.saveAd(adData);
      this.currentAd = adData;
      
      // Update UI
      statusEl.className = 'status success';
      statusEl.textContent = `✓ Ad scraped successfully! Total stored: ${totalAds}`;
      
      // Update stats
      await this.updateUI();
      
    } catch (error) {
      console.error('Scraping error:', error);
      statusEl.className = 'status error';
      statusEl.textContent = `Error: ${error.message}`;
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Scrape This Page';
    }
  }

  async comparePrices() {
    if (!this.currentAd) {
      // Try to scrape current page first
      await this.scrapeCurrentPage();
      if (!this.currentAd) return;
    }
    
    const resultEl = document.getElementById('comparisonResult');
    const similarAdsEl = document.getElementById('similarAds');
    const btnEl = document.getElementById('compareBtn');
    
    try {
      btnEl.disabled = true;
      btnEl.textContent = 'Analyzing...';
      
      // Get all stored ads
      const allAds = await this.storage.getAllAds();
      
      if (allAds.length < 2) {
        resultEl.className = 'comparison-result';
        resultEl.textContent = 'Need at least 2 ads to compare prices. Scrape more ads first!';
        resultEl.classList.remove('hidden');
        return;
      }
      
      // Generate comparison report
      const report = this.priceComparison.generateComparisonReport(this.currentAd, allAds);
      
      // Display results
      this.displayComparisonResults(report);
      
    } catch (error) {
      console.error('Comparison error:', error);
      resultEl.className = 'comparison-result';
      resultEl.textContent = `Error: ${error.message}`;
      resultEl.classList.remove('hidden');
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Compare Prices';
    }
  }

  displayComparisonResults(report) {
    const resultEl = document.getElementById('comparisonResult');
    const similarAdsEl = document.getElementById('similarAds');
    
    let resultHTML = `
      <div><strong>${report.targetAd.title}</strong></div>
      <div>Price: <span class="ad-price">${report.targetAd.price}</span></div>
    `;
    
    if (report.priceAnalysis.averagePrice) {
      const position = report.priceAnalysis.pricePosition;
      const positionClass = `price-${position}`;
      const positionText = position === 'below' ? 'Below Average' : 
                          position === 'above' ? 'Above Average' : 'Average';
      
      resultHTML += `
        <div>Market Position: <span class="price-indicator ${positionClass}">${positionText}</span></div>
        <div>Average Price: $${Math.round(report.priceAnalysis.averagePrice)}</div>
      `;
      
      if (report.priceAnalysis.potentialSavings > 0) {
        resultHTML += `<div>Potential Savings: <span class="price-below">$${Math.round(report.priceAnalysis.potentialSavings)}</span></div>`;
      }
    }
    
    resultEl.innerHTML = resultHTML;
    resultEl.classList.remove('hidden');
    
    // Display similar ads
    if (report.similarAds.length > 0) {
      let similarHTML = '<div style="font-weight: bold; margin-bottom: 5px;">Similar ads found:</div>';
      
      report.similarAds.slice(0, 5).forEach(ad => {
        const priceDiff = ad.priceDifference;
        const diffText = priceDiff ? 
          (priceDiff > 0 ? `+$${Math.round(priceDiff)}` : `-$${Math.round(Math.abs(priceDiff))}`) :
          '';
        const diffClass = priceDiff > 0 ? 'price-above' : 'price-below';
        
        similarHTML += `
          <div class="similar-ad">
            <div class="ad-title">${ad.title.substring(0, 40)}...</div>
            <div><span class="ad-price">${ad.price}</span> 
                 ${diffText ? `<span class="${diffClass}">(${diffText})</span>` : ''}
                 <span class="ad-similarity">${ad.similarity}% match</span></div>
            <div style="font-size: 10px; color: #999;">${ad.domain}</div>
          </div>
        `;
      });
      
      similarAdsEl.innerHTML = similarHTML;
      similarAdsEl.classList.remove('hidden');
    }
  }

  async exportData(format) {
    try {
      const allAds = await this.storage.getAllAds();
      
      if (allAds.length === 0) {
        alert('No ads to export. Scrape some ads first!');
        return;
      }
      
      const timestamp = new Date().toISOString().slice(0, 10);
      
      switch (format) {
        case 'csv':
          this.exporter.exportCSV(allAds, `classified_ads_${timestamp}.csv`);
          break;
        case 'excel':
          this.exporter.exportExcel(allAds, `classified_ads_${timestamp}.xlsx`);
          break;
        case 'json':
          this.exporter.exportJSON(allAds, `classified_ads_${timestamp}.json`);
          break;
        case 'html':
          this.exporter.exportHTML(allAds, `classified_ads_${timestamp}.html`);
          break;
      }
      
      // Show success message
      const statusEl = document.getElementById('scrapeStatus');
      statusEl.className = 'status success';
      statusEl.textContent = `✓ ${format.toUpperCase()} export downloaded!`;
      statusEl.classList.remove('hidden');
      
      setTimeout(() => statusEl.classList.add('hidden'), 3000);
      
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  }

  async generateMarketAnalysis() {
    const btnEl = document.getElementById('marketAnalysisBtn');
    const resultEl = document.getElementById('marketAnalysisResult');
    
    try {
      btnEl.disabled = true;
      btnEl.textContent = 'Analyzing...';
      
      const allAds = await this.storage.getAllAds();
      const analysis = this.priceComparison.generateMarketAnalysis(allAds);
      
      if (analysis.error) {
        throw new Error(analysis.error);
      }
      
      // Display market analysis
      let analysisHTML = `
        <h4>Market Analysis Report</h4>
        <div><strong>Total Ads:</strong> ${analysis.totalAds}</div>
        <div><strong>Ads with Prices:</strong> ${analysis.adsWithPrices}</div>
        <div><strong>Price Range:</strong> $${Math.round(analysis.priceStatistics.min)} - $${Math.round(analysis.priceStatistics.max)}</div>
        <div><strong>Average Price:</strong> $${Math.round(analysis.priceStatistics.average)}</div>
        <div><strong>Median Price:</strong> $${Math.round(analysis.priceStatistics.median)}</div>
      `;
      
      if (analysis.topDeals.length > 0) {
        analysisHTML += '<h5>Best Deals:</h5>';
        analysis.topDeals.slice(0, 3).forEach(deal => {
          analysisHTML += `<div style="font-size: 11px;">• ${deal.title.substring(0, 30)}... - ${deal.price}</div>`;
        });
      }
      
      resultEl.innerHTML = analysisHTML;
      resultEl.classList.remove('hidden');
      
    } catch (error) {
      console.error('Analysis error:', error);
      resultEl.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
      resultEl.classList.remove('hidden');
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Generate Report';
    }
  }

  async viewStoredAds() {
    try {
      const allAds = await this.storage.getAllAds();
      
      if (allAds.length === 0) {
        alert('No stored ads found.');
        return;
      }
      
      // Generate and download HTML preview
      this.exporter.exportHTML(allAds, 'stored_ads_preview.html');
      
    } catch (error) {
      console.error('View storage error:', error);
      alert(`Error viewing stored ads: ${error.message}`);
    }
  }

  async clearStorage() {
    if (confirm('Are you sure you want to clear all stored ads? This cannot be undone.')) {
      try {
        await this.storage.clearAllAds();
        await this.updateUI();
        
        // Hide comparison results
        document.getElementById('comparisonResult').classList.add('hidden');
        document.getElementById('similarAds').classList.add('hidden');
        document.getElementById('marketAnalysisResult').classList.add('hidden');
        
        // Show success message
        const statusEl = document.getElementById('scrapeStatus');
        statusEl.className = 'status success';
        statusEl.textContent = '✓ All data cleared!';
        statusEl.classList.remove('hidden');
        
        setTimeout(() => statusEl.classList.add('hidden'), 3000);
        
      } catch (error) {
        console.error('Clear storage error:', error);
        alert(`Error clearing storage: ${error.message}`);
      }
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});