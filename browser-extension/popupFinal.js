/**
 * Final Popup Script - With Pattern Storage and Optimization
 */

document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn');
  const resultsDiv = document.getElementById('results');
  const patternStorage = new ClickPatternStorage();
  
  extractBtn.addEventListener('click', async () => {
    try {
      extractBtn.disabled = true;
      extractBtn.textContent = 'Extracting...';
      resultsDiv.textContent = 'Working...';
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const domain = new URL(tab.url).hostname;
      
      // Check if it's Craigslist
      const isCraigslist = tab.url.includes('craigslist.org');
      
      if (isCraigslist) {
        resultsDiv.textContent = 'Craigslist detected - loading full-size images...';
        
        // Get best strategy from history
        const bestStrategy = await patternStorage.getBestStrategy(domain);
        if (bestStrategy) {
          console.log(`Using previously successful strategy: ${bestStrategy}`);
        }
        
        // Execute click strategies
        const [loadResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (preferredStrategy) => {
            console.log('Craigslist: Loading full-size images...');
            
            const strategies = {
              'arrow-main': async () => {
                const sequence = [];
                const forwardArrow = document.querySelector('.slider-forward.arrow');
                if (forwardArrow) {
                  forwardArrow.click();
                  sequence.push('forward-arrow');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                const mainImage = document.querySelector('.slide.visible img, .slide.first img');
                if (mainImage) {
                  mainImage.click();
                  sequence.push('main-image');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return {
                  count: document.querySelectorAll('.slide img[src*="1200x900"]').length,
                  sequence: sequence
                };
              },
              
              'thumbnails': async () => {
                const sequence = [];
                const thumbnails = document.querySelectorAll('#thumbs a');
                
                for (let i = 0; i < Math.min(3, thumbnails.length); i++) {
                  thumbnails[i].click();
                  sequence.push(`thumb-${i}`);
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                const mainImage = document.querySelector('.slide.visible img');
                if (mainImage) {
                  mainImage.click();
                  sequence.push('main-image');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return {
                  count: document.querySelectorAll('.slide img[src*="1200x900"]').length,
                  sequence: sequence
                };
              },
              
              'navigation': async () => {
                const sequence = [];
                const nextArrow = document.querySelector('.slider-forward.arrow');
                const prevArrow = document.querySelector('.slider-back.arrow');
                
                for (let i = 0; i < 3; i++) {
                  if (nextArrow) {
                    nextArrow.click();
                    sequence.push('next');
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }
                }
                
                if (prevArrow) {
                  prevArrow.click();
                  sequence.push('prev');
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                const mainImage = document.querySelector('.slide.visible img');
                if (mainImage) {
                  mainImage.click();
                  sequence.push('main-image');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return {
                  count: document.querySelectorAll('.slide img[src*="1200x900"]').length,
                  sequence: sequence
                };
              }
            };
            
            let bestResult = { strategy: null, count: 0, sequence: [] };
            
            // Try preferred strategy first if provided
            if (preferredStrategy && strategies[preferredStrategy]) {
              console.log(`Trying preferred strategy: ${preferredStrategy}`);
              const result = await strategies[preferredStrategy]();
              if (result.count >= 20) {
                return {
                  success: true,
                  strategy: preferredStrategy,
                  count: result.count,
                  sequence: result.sequence
                };
              }
              bestResult = { strategy: preferredStrategy, ...result };
            }
            
            // Try all strategies
            for (const [name, func] of Object.entries(strategies)) {
              if (name === preferredStrategy) continue; // Skip if already tried
              
              console.log(`Trying strategy: ${name}`);
              const result = await func();
              
              if (result.count > bestResult.count) {
                bestResult = { strategy: name, ...result };
              }
              
              if (result.count >= 20) {
                break; // Good enough
              }
            }
            
            return {
              success: bestResult.count > 0,
              strategy: bestResult.strategy,
              count: bestResult.count,
              sequence: bestResult.sequence
            };
          },
          args: [bestStrategy]
        });
        
        // Store the result
        const loadData = loadResult.result;
        if (loadData.success) {
          await patternStorage.saveSuccessfulPattern(domain, {
            strategy: loadData.strategy,
            imageCount: loadData.count,
            clickSequence: loadData.sequence
          });
          resultsDiv.textContent = `Loaded ${loadData.count} full-size images using ${loadData.strategy}!`;
        } else {
          await patternStorage.saveFailedPattern(domain, {
            strategy: 'all',
            reason: 'No images loaded'
          });
          resultsDiv.textContent = 'Unable to load full-size images. Extracting available images...';
        }
        
        // Wait a bit more
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Inject and run the scraper
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['dynamicScraperV2.js']
      });
      
      // Extract data
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
          html += ' <span style="color: green;">✅ Full-size images!</span>';
        } else if (sizeCount['1200x900'] > 0) {
          html += ' <span style="color: orange;">⚠️ Partial success</span>';
        } else {
          html += ' <span style="color: red;">❌ Only thumbnails</span>';
        }
      }
      
      // Show image URLs
      html += '<div style="max-height: 150px; overflow-y: auto; margin-left: 20px; margin-top: 5px;">';
      data.images.slice(0, 10).forEach((url, i) => {
        const match = url.match(/(\d+x\d+)/);
        const size = match ? `[${match[1]}]` : '';
        const color = size === '[1200x900]' ? 'color: green;' : '';
        html += `<div style="font-size: 10px; ${color}">${i + 1}. ${size} ${url}</div>`;
      });
      if (data.images.length > 10) {
        html += `<div style="font-size: 10px;">... and ${data.images.length - 10} more</div>`;
      }
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