const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// Utility functions for web scraping

// Basic HTTP request with retry logic
async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) throw error;
      await sleep(2000 * (i + 1)); // Exponential backoff
    }
  }
}

// Use Puppeteer for JavaScript-rendered pages
async function fetchPageWithJS(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const content = await page.content();
    return content;
  } finally {
    await browser.close();
  }
}

// Parse HTML with Cheerio
function parseHTML(html) {
  return cheerio.load(html);
}

// Extract text and clean whitespace
function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

// Parse year from various formats
function parseYear(yearString) {
  if (!yearString) return null;
  
  // Extract 4-digit year
  const match = yearString.match(/\d{4}/);
  if (match) {
    return parseInt(match[0]);
  }
  
  // Handle 2-digit years (assume 1900s or 2000s)
  const twoDigit = yearString.match(/\d{2}/);
  if (twoDigit) {
    const year = parseInt(twoDigit[0]);
    return year > 50 ? 1900 + year : 2000 + year;
  }
  
  return null;
}

// Parse dimensions (convert to metric if needed)
function parseDimension(dimString, unit = 'mm') {
  if (!dimString) return null;
  
  const value = parseFloat(dimString.match(/[\d.]+/)?.[0]);
  if (!value) return null;
  
  // Convert to mm if needed
  if (dimString.includes('m') && !dimString.includes('mm')) {
    return value * 1000;
  } else if (dimString.includes('cm')) {
    return value * 10;
  } else if (dimString.includes('in') || dimString.includes('"')) {
    return value * 25.4;
  } else if (dimString.includes('ft') || dimString.includes("'")) {
    return value * 304.8;
  }
  
  return value;
}

// Parse weight (convert to kg if needed)
function parseWeight(weightString) {
  if (!weightString) return null;
  
  const value = parseFloat(weightString.match(/[\d.]+/)?.[0]);
  if (!value) return null;
  
  // Convert to kg if needed
  if (weightString.includes('lb') || weightString.includes('lbs')) {
    return value * 0.453592;
  } else if (weightString.includes('g') && !weightString.includes('kg')) {
    return value / 1000;
  }
  
  return value;
}

// Parse engine displacement
function parseDisplacement(dispString) {
  if (!dispString) return null;
  
  const value = parseFloat(dispString.match(/[\d.]+/)?.[0]);
  if (!value) return null;
  
  // Assume cc unless specified otherwise
  if (dispString.includes('L') || dispString.includes('liter')) {
    return value * 1000;
  }
  
  return value;
}

// Sleep function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format specifications for database
function formatSpecifications(rawSpecs) {
  const formatted = {};
  
  // Normalize keys to lowercase with underscores
  for (const [key, value] of Object.entries(rawSpecs)) {
    const normalizedKey = key
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    
    formatted[normalizedKey] = value;
  }
  
  return formatted;
}

// Extract images from various sources
function extractImages($, baseUrl) {
  const images = [];
  
  // Common image selectors
  const selectors = [
    'img.product-image',
    'img.gallery-image',
    '.image-gallery img',
    '.product-images img',
    'figure img',
    '.motorcycle-image'
  ];
  
  selectors.forEach(selector => {
    $(selector).each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src) {
        const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
        images.push({
          url: fullUrl,
          alt: $(elem).attr('alt') || '',
          title: $(elem).attr('title') || ''
        });
      }
    });
  });
  
  return images;
}

module.exports = {
  fetchPage,
  fetchPageWithJS,
  parseHTML,
  cleanText,
  parseYear,
  parseDimension,
  parseWeight,
  parseDisplacement,
  sleep,
  formatSpecifications,
  extractImages
};