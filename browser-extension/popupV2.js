/**
 * Enhanced Popup Script V2 - With Craigslist Full-Image Support
 */

document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn');
  const resultsDiv = document.getElementById('results');
  
  extractBtn.addEventListener('click', async () => {
    try {
      extractBtn.disabled = true;
      extractBtn.textContent = 'Extracting...';
      resultsDiv.textContent = 'Working...';
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if it's Craigslist
      const isCraigslist = tab.url.includes('craigslist.org');
      
      if (isCraigslist) {
        resultsDiv.textContent = 'Craigslist detected - loading full-size images...';
        
        // Step 1: Click to load 1200x900 images
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            console.log('Craigslist: Triggering full-size image load...');
            
            // Click forward arrow first
            const forwardArrow = document.querySelector('.slider-forward.arrow');
            if (forwardArrow) {
              forwardArrow.click();
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Click main image
            const mainImage = document.querySelector('.slide.visible img');
            if (mainImage) {
              mainImage.click();
              console.log('Clicked main image');
            }
            
            // Wait for images to load
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check results
            const largeImages = document.querySelectorAll('.slide img[src*="1200x900"]');
            console.log(`Loaded ${largeImages.length} full-size images`);
            
            return largeImages.length;
          }
        });
        
        // Wait a bit more to ensure everything is loaded
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Step 2: Inject and run the scraper
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['dynamicScraperV2.js']
      });
      
      // Step 3: Extract data
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          if (typeof extractClassifiedAd === 'function') {
            return await extractClassifiedAd();
          } else {
            throw new Error('Scraper not loaded');
          }
        }
      });
      
      const data = result.result;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Display results
      displayResults(data);
      
    } catch (error) {
      console.error('Error:', error);
      resultsDiv.textContent = `Error: ${error.message}`;
    } finally {
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract Data';
    }
  });
  
  function displayResults(data) {
    let html = '<div style="font-family: monospace; font-size: 12px;">';
    
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
    
    // Images with size breakdown
    if (data.images && data.images.length > 0) {
      // Count by size
      const sizeCount = {};
      data.images.forEach(url => {
        const match = url.match(/(\d+x\d+)/);
        const size = match ? match[1] : 'unknown';
        sizeCount[size] = (sizeCount[size] || 0) + 1;
      });
      
      const sizeStr = Object.entries(sizeCount)
        .map(([size, count]) => `${count} ${size}`)
        .join(', ');
      
      html += `<div><strong>Images:</strong> ${data.images.length} (${sizeStr})`;
      
      // Show image URLs
      html += '<div style="max-height: 150px; overflow-y: auto; margin-left: 20px; margin-top: 5px;">';
      data.images.forEach((url, i) => {
        const match = url.match(/(\d+x\d+)/);
        const size = match ? `[${match[1]}]` : '';
        html += `<div style="font-size: 10px;">${i + 1}. ${size} ${url}</div>`;
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
      html += '<div style="margin-left: 20px;">';
      Object.entries(data.attributes).slice(0, 8).forEach(([key, value]) => {
        html += `<div style="font-size: 11px;">${key}: ${value}</div>`;
      });
      if (Object.keys(data.attributes).length > 8) {
        html += `<div style="font-size: 11px;">... and ${Object.keys(data.attributes).length - 8} more</div>`;
      }
      html += '</div>';
    }
    
    html += '</div>';
    
    // Add success message for Craigslist
    if (data.domain && data.domain.includes('craigslist')) {
      const has1200x900 = data.images.some(img => img.includes('1200x900'));
      if (has1200x900) {
        html = '<div style="color: green; font-weight: bold; margin-bottom: 10px;">✅ Full-size images extracted!</div>' + html;
      }
    }
    
    resultsDiv.innerHTML = html;
  }
});