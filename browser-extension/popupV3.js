/**
 * Enhanced Popup Script V3 - With Retry Logic for Craigslist
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
        
        // Try multiple strategies to load 1200x900 images
        const [loadResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            console.log('Craigslist: Attempting to load full-size images...');
            
            let largeImageCount = 0;
            const strategies = [];
            
            // Strategy 1: Arrow + Main Image Click
            async function strategy1() {
              const forwardArrow = document.querySelector('.slider-forward.arrow');
              const mainImage = document.querySelector('.slide.visible img, .slide.first img');
              
              if (forwardArrow) {
                forwardArrow.click();
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              if (mainImage) {
                mainImage.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
              
              return document.querySelectorAll('.slide img[src*="1200x900"]').length;
            }
            
            // Strategy 2: Click Each Thumbnail
            async function strategy2() {
              const thumbnails = document.querySelectorAll('#thumbs a');
              
              for (let i = 0; i < Math.min(3, thumbnails.length); i++) {
                thumbnails[i].click();
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              // Then click main image
              const mainImage = document.querySelector('.slide.visible img');
              if (mainImage) {
                mainImage.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
              
              return document.querySelectorAll('.slide img[src*="1200x900"]').length;
            }
            
            // Strategy 3: Navigate with arrows
            async function strategy3() {
              const nextArrow = document.querySelector('.slider-forward.arrow');
              const prevArrow = document.querySelector('.slider-back.arrow');
              
              // Go forward a few times
              for (let i = 0; i < 3; i++) {
                if (nextArrow) nextArrow.click();
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              // Go back
              if (prevArrow) prevArrow.click();
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Click main image
              const mainImage = document.querySelector('.slide.visible img');
              if (mainImage) {
                mainImage.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
              
              return document.querySelectorAll('.slide img[src*="1200x900"]').length;
            }
            
            // Try each strategy
            console.log('Trying Strategy 1: Arrow + Main Click...');
            largeImageCount = await strategy1();
            strategies.push({ name: 'Arrow + Main Click', count: largeImageCount });
            
            if (largeImageCount < 20) {
              console.log('Trying Strategy 2: Thumbnail Clicks...');
              largeImageCount = await strategy2();
              strategies.push({ name: 'Thumbnail Clicks', count: largeImageCount });
            }
            
            if (largeImageCount < 20) {
              console.log('Trying Strategy 3: Arrow Navigation...');
              largeImageCount = await strategy3();
              strategies.push({ name: 'Arrow Navigation', count: largeImageCount });
            }
            
            // Final check
            const finalCount = document.querySelectorAll('.slide img[src*="1200x900"]').length;
            console.log(`Final 1200x900 image count: ${finalCount}`);
            
            return {
              success: finalCount > 0,
              count: finalCount,
              strategies: strategies
            };
          }
        });
        
        if (loadResult.result.success) {
          resultsDiv.textContent = `Loaded ${loadResult.result.count} full-size images!`;
        } else {
          resultsDiv.textContent = 'Unable to load full-size images. Extracting available images...';
        }
        
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
      
      // Show success indicator for Craigslist
      if (data.domain && data.domain.includes('craigslist')) {
        if (sizeCount['1200x900'] >= 20) {
          html += ' <span style="color: green;">✅</span>';
        } else if (sizeCount['1200x900'] > 0) {
          html += ' <span style="color: orange;">⚠️</span>';
        } else {
          html += ' <span style="color: red;">❌</span>';
        }
      }
      
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
    
    resultsDiv.innerHTML = html;
  }
});