#!/usr/bin/env node
/*  FIXED comprehensive scraper based on actual 99spokes structure analysis  */

// Suppress punycode deprecation warning from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return; // Ignore punycode deprecation warnings
  }
  console.warn(warning);
});

import fs from "fs/promises";
import { Stagehand } from "@browserbasehq/stagehand";
import "dotenv/config.js";

/* ---------- Enhanced config ---------- */
const NAV_DELAY = 1000;
const VARIANT_DELAY = 800;
const SAVE_EVERY = 5; // Keep frequent saves for data safety 
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const TIMEOUT = 45000;
const MAX_FILE_SIZE = 400000000; // 400MB limit to prevent JSON stringify errors

/* ---------- helpers ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Safe JSON saving that handles large objects by using chunked saves when needed
const safeJsonSave = async (filename, data) => {
  try {
    // Skip the test stringify and go directly to chunked save for large datasets
    const variantCount = Object.keys(data).length;
    
    if (variantCount > 10000) { // If we have more than 10k variants, use chunked save
      console.log(`⚠️  Large dataset detected (${variantCount} variants), using chunked save for ${filename}`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const chunkSize = 1000;
      const variants = Object.keys(data);
      
      for (let i = 0; i < variants.length; i += chunkSize) {
        const chunk = {};
        const chunkVariants = variants.slice(i, i + chunkSize);
        
        for (const variantId of chunkVariants) {
          chunk[variantId] = data[variantId];
        }
        
        const chunkNum = Math.floor(i / chunkSize) + 1;
        const chunkFilename = `${filename.replace('.json', '')}_chunk_${chunkNum}_${timestamp}.json`;
        
        await fs.writeFile(chunkFilename, JSON.stringify(chunk, null, 2));
        console.log(`💾 Chunk ${chunkNum}/${Math.ceil(variants.length / chunkSize)}: ${chunkFilename} (${chunkVariants.length} variants)`);
      }
      
      // Create metadata file
      const metadata = {
        timestamp,
        totalVariants: variants.length,
        totalChunks: Math.ceil(variants.length / chunkSize),
        chunkSize,
        originalFilename: filename
      };
      
      await fs.writeFile(`${filename.replace('.json', '')}_metadata_${timestamp}.json`, JSON.stringify(metadata, null, 2));
      console.log(`📋 Metadata: ${filename.replace('.json', '')}_metadata_${timestamp}.json`);
      
      return false;
    } else {
      // Small enough for normal save
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      return true;
    }
  } catch (error) {
    console.error(`❌ Error saving ${filename}:`, error.message);
    console.log(`🔄 Emergency chunked save for ${filename}`);
    
    // Emergency chunked save with smaller chunks
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const chunkSize = 500;
    const variants = Object.keys(data);
    
    for (let i = 0; i < variants.length; i += chunkSize) {
      const chunk = {};
      const chunkVariants = variants.slice(i, i + chunkSize);
      
      for (const variantId of chunkVariants) {
        chunk[variantId] = data[variantId];
      }
      
      const chunkNum = Math.floor(i / chunkSize) + 1;
      const chunkFilename = `${filename.replace('.json', '')}_emergency_chunk_${chunkNum}_${timestamp}.json`;
      
      try {
        await fs.writeFile(chunkFilename, JSON.stringify(chunk, null, 2));
        console.log(`🚨 Emergency chunk ${chunkNum}: ${chunkFilename}`);
      } catch (chunkError) {
        console.error(`❌ Chunk ${chunkNum} failed: ${chunkError.message}`);
      }
    }
    
    return false;
  }
};

const logProgress = (current, total, successful, failed) => {
  const percent = Math.round((current / total) * 100);
  const successRate = current > 0 ? Math.round((successful / current) * 100) : 0;
  console.log(`📊 Progress: ${current}/${total} (${percent}%) | Success: ${successful} (${successRate}%) | Failed: ${failed}`);
};

const createBackup = async (data, suffix = '') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `comprehensive_bike_specs_backup_${timestamp}${suffix}.json`;
  const saved = await safeJsonSave(backupFile, data);
  if (saved) {
    console.log(`💾 Backup created: ${backupFile}`);
  } else {
    console.log(`💾 Chunked backup created with timestamp: ${timestamp}${suffix}`);
  }
};

// Load existing data from main file AND all chunk files
const loadAllExistingData = async () => {
  let comprehensiveSpecs = {};
  let totalLoaded = 0;
  
  // 1. Try to load main file
  try {
    const existingSpecs = await fs.readFile("comprehensive_bike_specs.json", "utf8");
    comprehensiveSpecs = JSON.parse(existingSpecs);
    totalLoaded = Object.keys(comprehensiveSpecs).length;
    console.log(`📂 Loaded main file: ${totalLoaded} variants from comprehensive_bike_specs.json`);
  } catch (err) {
    console.log("📄 No main comprehensive_bike_specs.json found");
  }
  
  // 2. Find and load all chunk files
  try {
    const files = await fs.readdir('.');
    const chunkFiles = files.filter(f => 
      f.startsWith('comprehensive_bike_specs_chunk_') && 
      f.endsWith('.json')
    );
    
    if (chunkFiles.length > 0) {
      console.log(`📦 Found ${chunkFiles.length} chunk files to load...`);
      
      for (const chunkFile of chunkFiles.sort()) {
        try {
          const chunkData = JSON.parse(await fs.readFile(chunkFile, "utf8"));
          const chunkSize = Object.keys(chunkData).length;
          
          // Merge chunk data (newer data overwrites older)
          Object.assign(comprehensiveSpecs, chunkData);
          
          console.log(`📦 Loaded ${chunkFile}: ${chunkSize} variants`);
        } catch (chunkError) {
          console.error(`❌ Failed to load chunk ${chunkFile}:`, chunkError.message);
        }
      }
      
      const finalTotal = Object.keys(comprehensiveSpecs).length;
      const newFromChunks = finalTotal - totalLoaded;
      console.log(`📊 Total after loading chunks: ${finalTotal} variants (+${newFromChunks} from chunks)`);
    }
  } catch (dirError) {
    console.log("📁 Could not scan directory for chunks");
  }
  
  return comprehensiveSpecs;
};


/* ---------- set-up ---------- */
if (!process.env.OPENAI_API_KEY) {
  console.error("✖  OPENAI_API_KEY missing"); 
  process.exit(1);
}

const stage = new Stagehand({ 
  env: "LOCAL", 
  apiKey: process.env.OPENAI_API_KEY,
  verbose: 0
});
await stage.init();
const page = stage.page;

/* ---------- load existing data ---------- */
let bikeVariants = {};
let comprehensiveSpecs = {};
let processingLog = {
  startTime: new Date().toISOString(),
  totalVariants: 0,
  processedVariants: 0,
  successfulExtractions: 0,
  failedExtractions: 0,
  errors: [],
  lastProcessedVariantId: null,
  sessionHistory: []
};

// Load bike variants
try {
  const rawData = await fs.readFile("bike_variants.json", "utf8");
  bikeVariants = JSON.parse(rawData);
  console.log(`📂 Loaded bike variants for ${Object.keys(bikeVariants).length} maker/year combinations`);
} catch (err) {
  console.error("✖  bike_variants.json not found");
  process.exit(1);
}

// Load existing comprehensive specs from main file and chunks
comprehensiveSpecs = await loadAllExistingData();
console.log(`📂 Loaded existing comprehensive specs for ${Object.keys(comprehensiveSpecs).length} variants`);

// Load processing log
try {
  const logData = await fs.readFile("comprehensive_processing_log.json", "utf8");
  processingLog = { ...processingLog, ...JSON.parse(logData) };
  console.log(`📜 Loaded processing log - Last session: ${processingLog.sessionHistory.length > 0 ? processingLog.sessionHistory[processingLog.sessionHistory.length - 1].endTime : 'N/A'}`);
} catch (err) {
  console.log("📄 Starting with new processing log");
}

/* ---------- ACTUAL 99spokes extraction based on real structure ---------- */
async function extractActualBikeData(variant, retryCount = 0) {
  try {
    console.log(`    🌐 Navigating to: ${variant.url}`);
    
    // Handle potential network issues and redirects with improved loading strategy
    let response;
    try {
      response = await page.goto(variant.url, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT
      });
      
      // For slow pages, wait a bit more for content to load
      await sleep(2000);
      
      // Check if we have meaningful content, if not wait a bit more
      const contentCheck = await page.evaluate(() => {
        return document.body.textContent?.length > 5000;
      });
      
      if (!contentCheck) {
        console.log(`    ⏳ Page loading slowly, waiting additional time...`);
        await sleep(3000);
      }
      
    } catch (timeoutError) {
      if (timeoutError.message.includes('Timeout')) {
        console.log(`    ⏳ Initial timeout, trying with longer wait...`);
        // Try again with just domcontentloaded and longer timeout
        response = await page.goto(variant.url, {
          waitUntil: "domcontentloaded", 
          timeout: TIMEOUT * 2
        });
        await sleep(5000); // Give extra time for slow content
      } else {
        throw timeoutError;
      }
    }
    
    // Check HTTP status code
    if (response && response.status() >= 400) {
      const httpError = {
        variantId: variant.variantId,
        url: variant.url,
        error: `HTTP_${response.status()}`,
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      };
      
      if (!processingLog.httpErrors) processingLog.httpErrors = [];
      processingLog.httpErrors.push(httpError);
      
      console.log(`    🌐 HTTP ERROR: ${response.status()} - ${variant.url}`);
      throw new Error(`HTTP_${response.status()}: ${response.statusText()}`);
    }
    
    await sleep(NAV_DELAY);

    // Check if page loaded properly - detect 404s and other errors
    const pageTitle = await page.title();
    const pageContent = await page.content();
    const pageStatus = await page.evaluate(() => {
      return {
        title: document.title,
        hasContent: document.body.textContent?.length > 1000,
        // Only flag as 404 if page title indicates 404 or there's explicit 404 error content
        has404Text: document.title?.toLowerCase().includes('404') || 
                   document.title?.toLowerCase().includes('not found') ||
                   document.title?.toLowerCase().includes('page not found'),
        hasErrorText: document.title?.toLowerCase().includes('error') ||
                     (document.body.textContent?.toLowerCase().includes('error') &&
                      document.body.textContent?.toLowerCase().includes('something went wrong')),
        contentLength: document.body.textContent?.length || 0
      };
    });
    
    // Log 404s and other issues for later fixing
    if (!pageTitle || pageTitle.includes('404') || pageStatus.has404Text) {
      const error404 = {
        variantId: variant.variantId,
        url: variant.url,
        error: '404_NOT_FOUND',
        pageTitle,
        contentLength: pageStatus.contentLength,
        timestamp: new Date().toISOString()
      };
      
      // Add to 404 log
      if (!processingLog.url404s) processingLog.url404s = [];
      processingLog.url404s.push(error404);
      
      console.log(`    🔍 404 DETECTED: ${variant.url}`);
      console.log(`       Title: "${pageTitle}" | Content: ${pageStatus.contentLength} chars`);
      
      throw new Error(`404_NOT_FOUND: ${pageTitle}`);
    }
    
    if (pageTitle.includes('Error') || pageStatus.hasErrorText) {
      const errorPage = {
        variantId: variant.variantId,
        url: variant.url,
        error: 'PAGE_ERROR',
        pageTitle,
        contentLength: pageStatus.contentLength,
        timestamp: new Date().toISOString()
      };
      
      // Add to error log
      if (!processingLog.pageErrors) processingLog.pageErrors = [];
      processingLog.pageErrors.push(errorPage);
      
      console.log(`    ⚠️  PAGE ERROR: ${variant.url}`);
      console.log(`       Title: "${pageTitle}" | Content: ${pageStatus.contentLength} chars`);
      
      throw new Error(`PAGE_ERROR: ${pageTitle}`);
    }
    
    if (!pageStatus.hasContent) {
      const emptyPage = {
        variantId: variant.variantId,
        url: variant.url,
        error: 'EMPTY_PAGE',
        pageTitle,
        contentLength: pageStatus.contentLength,
        timestamp: new Date().toISOString()
      };
      
      // Add to empty page log
      if (!processingLog.emptyPages) processingLog.emptyPages = [];
      processingLog.emptyPages.push(emptyPage);
      
      console.log(`    📄 EMPTY PAGE: ${variant.url}`);
      console.log(`       Title: "${pageTitle}" | Content: ${pageStatus.contentLength} chars`);
      
      throw new Error(`EMPTY_PAGE: Content too short (${pageStatus.contentLength} chars)`);
    }

    const comprehensiveData = await page.evaluate(() => {
      const data = {
        // Basic page info
        pageInfo: {
          title: document.title,
          url: window.location.href,
          contentLength: document.body.textContent?.length || 0,
          lastModified: document.lastModified || null,
          extractionTimestamp: new Date().toISOString()
        },
        
        // COMPREHENSIVE bike details extraction based on observed structure
        bikeDetails: {},
        specifications: {},
        components: {},
        geometry: {},
        geometryBySize: {},
        pricing: {},
        media: { images: [], videos: [] },
        features: [],
        dealers: [],
        comparisons: [],
        reviews: { summary: '', pros: [], cons: [], keyQuotes: [], sources: [] },
        sizing: {},
        riderNotes: [],
        priceHistory: {},
        similarBikes: [],
        rideFeelData: {},
        gearingData: {},
        specLevelData: {}
      };

      // Extract bike name and details from actual page structure
      const h1 = document.querySelector('h1');
      if (h1) {
        data.bikeDetails.fullName = h1.textContent?.trim();
        
        // Parse year/make/model from title pattern: "2023 Trek Fuel EX 8"
        const titleMatch = data.bikeDetails.fullName?.match(/(\d{4})\s+(.+)/);
        if (titleMatch) {
          data.bikeDetails.year = titleMatch[1];
          const makeAndModel = titleMatch[2];
          const words = makeAndModel.split(' ');
          data.bikeDetails.manufacturer = words[0];
          data.bikeDetails.model = words.slice(1).join(' ');
        }
      }

      // Extract description from the actual content pattern
      const descriptionSelectors = [
        'p:contains("bike")',
        '.overview p',
        '[class*="description"] p'
      ];
      
      for (const selector of descriptionSelectors) {
        const elements = document.querySelectorAll('p');
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (text && text.length > 50 && text.length < 500 && 
              text.includes('bike') && !text.includes('Sign In') && 
              !text.includes('Compare') && !text.includes('Cookie')) {
            data.bikeDetails.description = text;
            break;
          }
        }
        if (data.bikeDetails.description) break;
      }

      // Detect if this is an electric bike
      const fullPageText = document.body.textContent?.toLowerCase() || '';
      const bikeTitle = (data.bikeDetails.fullName || '').toLowerCase();
      
      // Electric bike indicators (more specific to avoid false positives)
      const electricIndicators = [
        // Title/name indicators (most reliable)
        bikeTitle.includes('e-') || bikeTitle.includes('electric') || bikeTitle.includes('ebike'),
        // Specific electric motor brands (avoid generic "motor")
        fullPageText.includes('bosch') && fullPageText.includes('motor'),
        fullPageText.includes('shimano') && fullPageText.includes('motor'),
        fullPageText.includes('brose') && fullPageText.includes('motor'),
        fullPageText.includes('fazua') && fullPageText.includes('motor'),
        fullPageText.includes('yamaha') && fullPageText.includes('motor'),
        // Battery capacity indicators (specific to e-bikes)
        fullPageText.includes('wh battery') || fullPageText.includes('watt hour'),
        fullPageText.includes('pedal assist'),
        // Check for electric components in specs section specifically
        fullPageText.includes('electric components'),
        fullPageText.includes('battery:') && fullPageText.includes('wh'),
      ];
      
      data.bikeDetails.isElectric = electricIndicators.some(indicator => indicator);
      
      // If electric, try to extract key electric specs
      if (data.bikeDetails.isElectric) {
        data.bikeDetails.electricSpecs = {};
        
        // Extract motor information
        const motorMatch = fullPageText.match(/(bosch|shimano|brose|fazua|yamaha|giant|specialized)\s*[^\n]*motor[^\n]*/i);
        if (motorMatch) {
          data.bikeDetails.electricSpecs.motor = motorMatch[0].trim();
        }
        
        // Extract battery information
        const batteryMatch = fullPageText.match(/(\d+)\s*wh?\s*battery/i) || 
                           fullPageText.match(/battery[:\s]*(\d+)\s*wh?/i);
        if (batteryMatch) {
          data.bikeDetails.electricSpecs.battery = `${batteryMatch[1]}Wh`;
        }
        
        // Extract range information
        const rangeMatch = fullPageText.match(/range[:\s]*(\d+(?:-\d+)?)\s*miles?/i);
        if (rangeMatch) {
          data.bikeDetails.electricSpecs.range = `${rangeMatch[1]} miles`;
        }
      }

      // Extract specifications from tables (based on actual structure observed)
      const tables = document.querySelectorAll('table');
      tables.forEach((table, tableIndex) => {
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length === 2) {
            const key = cells[0].textContent?.trim();
            const value = cells[1].textContent?.trim();
            
            if (key && value && key.length < 100 && value.length < 1000) {
              // Store in specifications
              data.specifications[key.toLowerCase()] = value;
              
              // REAL component categorization based on observed data
              const keyLower = key.toLowerCase();
              
              if (keyLower.includes('frame') || keyLower === 'frame') {
                if (!data.components.frame) data.components.frame = {};
                data.components.frame[keyLower] = value;
                data.bikeDetails.frameMaterial = value.includes('Aluminum') ? 'Aluminum' : 
                                                value.includes('Carbon') ? 'Carbon' : 
                                                value.includes('Steel') ? 'Steel' : value;
              } else if (keyLower.includes('fork') || keyLower === 'fork') {
                if (!data.components.fork) data.components.fork = {};
                data.components.fork[keyLower] = value;
              } else if (keyLower.includes('wheel') || keyLower === 'wheels') {
                if (!data.components.wheels) data.components.wheels = {};
                data.components.wheels[keyLower] = value;
                if (keyLower === 'wheels') data.bikeDetails.wheelSize = value;
              } else if (keyLower.includes('drivetrain') || keyLower === 'drivetrain') {
                if (!data.components.drivetrain) data.components.drivetrain = {};
                data.components.drivetrain[keyLower] = value;
              } else if (keyLower.includes('groupset') || keyLower === 'groupset') {
                if (!data.components.drivetrain) data.components.drivetrain = {};
                data.components.drivetrain[keyLower] = value;
              } else if (keyLower.includes('brake') || keyLower === 'brakes') {
                if (!data.components.brakes) data.components.brakes = {};
                data.components.brakes[keyLower] = value;
              } else if (keyLower.includes('derailleur') || keyLower.includes('shifter') || 
                        keyLower.includes('cassette') || keyLower.includes('crank')) {
                if (!data.components.drivetrain) data.components.drivetrain = {};
                data.components.drivetrain[keyLower] = value;
              } else if (keyLower.includes('stem') || keyLower.includes('handlebar') || 
                        keyLower.includes('saddle') || keyLower.includes('seatpost')) {
                if (!data.components.cockpit) data.components.cockpit = {};
                data.components.cockpit[keyLower] = value;
              } else if (keyLower.includes('tire') || keyLower === 'tires') {
                if (!data.components.tires) data.components.tires = {};
                data.components.tires[keyLower] = value;
              } else if (keyLower.includes('rim') || keyLower === 'rims') {
                if (!data.components.wheels) data.components.wheels = {};
                data.components.wheels[keyLower] = value;
              } else {
                if (!data.components.other) data.components.other = {};
                data.components.other[keyLower] = value;
              }
            }
          }
        });
      });

      // Extract ACTUAL pricing based on observed patterns
      const priceText = document.body.textContent || '';
      const priceMatches = priceText.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
      
      priceMatches.forEach(price => {
        // Find context around the price
        const priceIndex = priceText.indexOf(price);
        const context = priceText.slice(Math.max(0, priceIndex - 50), priceIndex + 100).toLowerCase();
        
        if (context.includes('msrp') || context.includes('manufacturer') || context.includes('retail')) {
          data.pricing.msrp = price;
        } else if (context.includes('sale') || context.includes('now') || context.includes('current')) {
          data.pricing.salePrice = price;
        } else if (!data.pricing.currentPrice) {
          data.pricing.currentPrice = price;
        }
      });

      // Extract ALL images with better filtering
      const images = Array.from(document.querySelectorAll('img'));
      images.forEach(img => {
        if (img.src && !img.src.includes('data:') && img.width > 100 && img.height > 100) {
          const imageData = {
            src: img.src,
            alt: img.alt || '',
            width: img.width,
            height: img.height
          };
          
          // Better image categorization based on actual URLs
          if (img.src.includes('cloudfront') || img.src.includes('bikes') || 
              img.src.includes('products') || img.src.includes('99spokes')) {
            data.media.images.push(imageData);
          }
        }
      });

      // Extract features from lists (based on actual structure)
      const lists = document.querySelectorAll('ul, ol');
      lists.forEach(list => {
        const items = Array.from(list.querySelectorAll('li'));
        items.forEach(item => {
          const text = item.textContent?.trim();
          if (text && text.length > 10 && text.length < 200 && 
              !text.includes('Sign In') && !text.includes('Compare') &&
              !text.includes('Privacy') && !text.includes('Cookie')) {
            data.features.push(text);
          }
        });
      });

      // Extract dealer/retailer links based on actual patterns
      const links = Array.from(document.querySelectorAll('a'));
      links.forEach(link => {
        const text = link.textContent?.trim();
        const href = link.href;
        
        if (text && href && text.length > 2 && text.length < 100) {
          if (text.toLowerCase().includes('buy') || text.toLowerCase().includes('shop') || 
              text.toLowerCase().includes('dealer') || text.toLowerCase().includes('store') ||
              href.includes('shop') || href.includes('buy')) {
            data.dealers.push({
              name: text,
              url: href
            });
          } else if (href.includes('/bikes/') && href !== window.location.href) {
            data.comparisons.push({
              name: text,
              url: href
            });
          }
        }
      });

      // Extract geometry from JSON data embedded in the page (99spokes structure)
      const bodyText = document.body.textContent || '';
      const htmlContent = document.documentElement.innerHTML;
      
      // Always attempt geometry extraction - we'll check why it failed afterwards
      // First try to extract from JSON data embedded in scripts
      try {
        const scriptTags = Array.from(document.querySelectorAll('script'));
        let bikeData = null;
        
        for (const script of scriptTags) {
          if (script.textContent && script.textContent.includes('__NEXT_DATA__')) {
            const jsonMatch = script.textContent.match(/{.*}/);
            if (jsonMatch) {
              const pageData = JSON.parse(jsonMatch[0]);
              if (pageData.props?.pageProps?.bike) {
                bikeData = pageData.props.pageProps.bike;
                break;
              }
            }
          }
        }
        
        // Extract geometry organized by frame size
        if (bikeData && bikeData.sizes) {
          bikeData.sizes.forEach(size => {
            const frameSize = size.name || size.frameSize || size.label;
            if (frameSize && size.geometry) {
              data.geometryBySize[frameSize] = {
                frameSize: frameSize,
                riderHeight: size.riderHeight || null,
                wheelSize: size.wheelKinds || null,
                geometry: size.geometry
              };
              
              // Also store in general geometry for backward compatibility
              Object.entries(size.geometry).forEach(([key, value]) => {
                if (value && !data.geometry[key]) {
                  data.geometry[key] = value.toString();
                }
              });
            }
          });
        }
        
        // Extract general geometry from the bike data if found (fallback)
        if (bikeData && bikeData.geometry) {
          Object.entries(bikeData.geometry).forEach(([key, value]) => {
            if (value && typeof value === 'number') {
              data.geometry[key] = value.toString();
            } else if (value && typeof value === 'string') {
              data.geometry[key] = value;
            }
          });
        }
      } catch (e) {
        console.log('    ⚠️  Could not parse JSON data for geometry');
      }
      
      // Enhanced geometry extraction: Handle both single-column and multi-column tables
      tables.forEach((table) => {
        const rows = table.querySelectorAll('tr');
        let frameSizeHeaders = [];
        let isMultiColumnGeometry = false;
        
        // Check if this is a multi-column geometry table
        if (rows.length > 0) {
          const firstRow = rows[0];
          const headerCells = firstRow.querySelectorAll('td, th');
          
          // Look for frame size headers (SM, MD, LG, XL, etc.)
          if (headerCells.length > 2) {
            headerCells.forEach((cell, index) => {
              const text = cell.textContent?.trim();
              if (text && (text.match(/^(XS|SM|MD|LG|XL|XXL|S|M|L)$/) || text.includes('/') || text.match(/^(4[4-9]|5[0-9]|6[0-5])(cm)?$/))) {
                frameSizeHeaders.push({ index: index, size: text });
                isMultiColumnGeometry = true;
              }
            });
          }
        }
        
        if (isMultiColumnGeometry && frameSizeHeaders.length > 0) {
          // Extract geometry by frame size from multi-column table
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length > frameSizeHeaders.length && cells[0]) {
              const label = cells[0].textContent?.trim().toLowerCase();
              
              if (label && (
                label === 'stack' || label === 'reach' || label === 'wheelbase' ||
                label === 'chainstay length' || label === 'chainstay' ||
                label === 'head tube angle' || label === 'head angle' ||
                label === 'seat tube angle' || label === 'seat angle' ||
                label.includes('top tube') || label.includes('seat tube') ||
                label.includes('head tube') || label.includes('bb ')
              )) {
                // Extract values for each frame size
                frameSizeHeaders.forEach(({ index, size }) => {
                  if (cells[index] && cells[index].textContent) {
                    const value = cells[index].textContent.trim();
                    
                    if (value && !isNaN(parseFloat(value.replace(/,/g, '')))) {
                      // Initialize frame size object if not exists
                      if (!data.geometryBySize[size]) {
                        data.geometryBySize[size] = {
                          frameSize: size,
                          riderHeight: null,
                          wheelSize: null,
                          geometry: {}
                        };
                      }
                      
                      // Store geometry value for this frame size
                      if (label === 'stack') {
                        data.geometryBySize[size].geometry.stack = value;
                      } else if (label === 'reach') {
                        data.geometryBySize[size].geometry.reach = value;
                      } else if (label === 'wheelbase') {
                        data.geometryBySize[size].geometry.wheelbase = value;
                      } else if (label === 'chainstay length' || label === 'chainstay') {
                        data.geometryBySize[size].geometry.chainstay = value;
                      } else if (label === 'head tube angle' || label === 'head angle') {
                        data.geometryBySize[size].geometry.head_angle = value;
                      } else if (label === 'seat tube angle' || label === 'seat angle') {
                        data.geometryBySize[size].geometry.seat_angle = value;
                      } else {
                        // Store other geometry measurements
                        const key = label.replace(/\s+/g, '_').replace(/[^\w]/g, '');
                        data.geometryBySize[size].geometry[key] = value;
                      }
                      
                      // Also store in general geometry (use first frame size as default)
                      if (frameSizeHeaders[0].size === size) {
                        if (label === 'stack' && !data.geometry.stack) {
                          data.geometry.stack = value;
                        } else if (label === 'reach' && !data.geometry.reach) {
                          data.geometry.reach = value;
                        } else if (label === 'wheelbase' && !data.geometry.wheelbase) {
                          data.geometry.wheelbase = value;
                        } else if ((label === 'chainstay length' || label === 'chainstay') && !data.geometry.chainstay) {
                          data.geometry.chainstay = value;
                        } else if ((label === 'head tube angle' || label === 'head angle') && !data.geometry.head_angle) {
                          data.geometry.head_angle = value;
                        } else if ((label === 'seat tube angle' || label === 'seat angle') && !data.geometry.seat_angle) {
                          data.geometry.seat_angle = value;
                        }
                      }
                    }
                  }
                });
              }
            }
          });
        } else {
          // Fallback: Single-column geometry extraction
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
              const label = cells[0].textContent?.trim().toLowerCase();
              const value = cells[1].textContent?.trim();
              
              if (label && value && !isNaN(parseFloat(value))) {
                // Use exact matches first, then partial matches only if exact not found
                if (label === 'stack' && !data.geometry.stack) {
                  data.geometry.stack = value;
                } else if (label === 'reach' && !data.geometry.reach) {
                  data.geometry.reach = value;
                } else if (label === 'wheelbase' && !data.geometry.wheelbase) {
                  data.geometry.wheelbase = value;
                } else if ((label === 'chainstay length' || label === 'chainstay') && !data.geometry.chainstay) {
                  data.geometry.chainstay = value;
                } else if ((label === 'head tube angle' || label === 'head angle') && !data.geometry.head_angle) {
                  data.geometry.head_angle = value;
                } else if ((label === 'seat tube angle' || label === 'seat angle') && !data.geometry.seat_angle) {
                  data.geometry.seat_angle = value;
                } else if (!data.geometry.stack && label.includes('stack') && !label.includes('ratio')) {
                  data.geometry.stack = value;
                } else if (!data.geometry.reach && label.includes('reach') && !label.includes('ratio')) {
                  data.geometry.reach = value;
                } else if (!data.geometry.wheelbase && label.includes('wheelbase')) {
                  data.geometry.wheelbase = value;
                } else if (!data.geometry.chainstay && label.includes('chainstay')) {
                  data.geometry.chainstay = value;
                } else if (!data.geometry.head_angle && label.includes('head') && label.includes('angle')) {
                  data.geometry.head_angle = value;
                } else if (!data.geometry.seat_angle && label.includes('seat') && label.includes('angle')) {
                  data.geometry.seat_angle = value;
                }
              }
            }
          });
        }
      });
      
      // Final fallback: regex patterns for any remaining geometry terms
      const geometryPatterns = {
        'reach': /reach[:\s]*(\d+(?:\.\d+)?)\s*(?:mm|cm)?/gi,
        'stack': /stack[:\s]*(\d+(?:\.\d+)?)\s*(?:mm|cm)?/gi,
        'wheelbase': /wheelbase[:\s]*(\d+(?:\.\d+)?)\s*(?:mm|cm)?/gi,
        'chainstay': /chainstay[:\s]*(\d+(?:\.\d+)?)\s*(?:mm|cm)?/gi,
        'head_angle': /head.{0,10}angle[:\s]*(\d+(?:\.\d+)?)\s*(?:°|deg)?/gi,
        'seat_angle': /seat.{0,10}angle[:\s]*(\d+(?:\.\d+)?)\s*(?:°|deg)?/gi
      };
      
      Object.entries(geometryPatterns).forEach(([name, pattern]) => {
        if (!data.geometry[name]) {
          const matches = [...bodyText.matchAll(pattern)];
          if (matches.length > 0 && matches[0][1]) {
            const value = matches[0][1];
            const unit = matches[0][0].includes('°') ? '°' : 'mm';
            data.geometry[name] = value + unit;
          }
        }
      });

      // Post-extraction analysis: If geometry extraction failed, determine why
      const geometryExtracted = Object.keys(data.geometry).length > 0 || Object.keys(data.geometryBySize).length > 0;
      
      if (!geometryExtracted) {
        // Check if there's actually a geometry section that we failed to extract
        const hasGeometryTable = Array.from(document.querySelectorAll('table')).some(table => {
          const tableText = table.textContent?.toLowerCase() || '';
          return (tableText.includes('stack') && tableText.includes('reach')) ||
                 (tableText.includes('wheelbase') && tableText.includes('chainstay'));
        });
        
        // Also check for "Geometry" section header (even if data is in images)
        const hasGeometryHeader = bodyText.match(/\bGeometry\b/i) !== null;
        
        // Check for the specific "goats can't read" message indicating image-based geometry  
        const hasGoatsMessage = bodyText.toLowerCase().includes("goats can't read geometry numbers");
        
        // If goats message found, look for geometry image URL
        let geometryImageUrl = null;
        if (hasGoatsMessage) {
          // Look for geometry images in the page
          const images = Array.from(document.querySelectorAll('img'));
          const geometryImage = images.find(img => 
            img.src?.includes('cloudfront') && 
            img.src?.includes('geometry') &&
            img.src?.includes('.jpeg')
          );
          if (geometryImage) {
            geometryImageUrl = geometryImage.src;
          }
        }
        
        // Has geometry section if either table-based data OR geometry header exists
        const hasGeometrySection = hasGeometryTable || hasGeometryHeader;
        
        // Add diagnostic information
        data.geometryDiagnostic = {
          hasGeometrySection: hasGeometrySection,
          hasGeometryTable: hasGeometryTable,
          hasGeometryHeader: hasGeometryHeader,
          hasGoatsMessage: hasGoatsMessage,
          geometryImageUrl: geometryImageUrl,
          reason: hasGeometrySection ? 'extraction_failed' : 'no_geometry_section',
          tablesFound: document.querySelectorAll('table').length
        };
      }

      // COMPREHENSIVE DATA EXTRACTION - Extract all additional content sections
      
      // Extract Reviews section
      const reviewsSection = bodyText.toLowerCase();
      if (reviewsSection.includes('summary') && reviewsSection.includes('pros')) {
        // Extract review summary
        const summaryMatch = bodyText.match(/Summary\s*([^]*?)(?:Pros|$)/i);
        if (summaryMatch) {
          data.reviews.summary = summaryMatch[1].trim().substring(0, 1000);
        }
        
        // Extract pros and cons
        const prosMatch = bodyText.match(/Pros\s*([^]*?)(?:Cons|Key Quotes|$)/i);
        if (prosMatch) {
          const prosText = prosMatch[1];
          const prosLines = prosText.split('\n').map(line => line.trim()).filter(line => 
            line.length > 10 && line.length < 200 && !line.includes('Feedback')
          );
          data.reviews.pros = prosLines.slice(0, 10);
        }
        
        const consMatch = bodyText.match(/Cons\s*([^]*?)(?:Key Quotes|Feedback|$)/i);
        if (consMatch) {
          const consText = consMatch[1];
          const consLines = consText.split('\n').map(line => line.trim()).filter(line => 
            line.length > 10 && line.length < 200 && !line.includes('Feedback')
          );
          data.reviews.cons = consLines.slice(0, 10);
        }
        
        // Extract key quotes and sources
        const quotesMatch = bodyText.match(/Key Quotes\s*([^]*?)(?:Feedback|View all reviews|$)/i);
        if (quotesMatch) {
          const quotesText = quotesMatch[1];
          const quotes = quotesText.split('\n').filter(line => 
            line.trim().length > 20 && !line.includes('logo') && !line.includes('Feedback')
          );
          data.reviews.keyQuotes = quotes.slice(0, 5);
        }
      }
      
      // Extract Sizing information - look for frame size + height patterns directly
      // Rather than looking for "Sizing" section, find actual sizing data patterns
      const sizingPatterns = [
        // Pattern: "49cm 5'1" – 5'5""
        /((4[4-9]|5[0-9]|6[0-5])cm)\s*([56]'[^–\u2013]*[–\u2013][^"\n]*"?)/g,
        // Pattern: "SM 5'3" – 5'7""  
        /(XS|SM|MD|LG|XL|XXL|S|M|L)\s*([56]'[^–\u2013]*[–\u2013][^"\n]*"?)/g
      ];
      
      // Search the entire body text for sizing patterns
      for (const pattern of sizingPatterns) {
        let sizeMatch;
        while ((sizeMatch = pattern.exec(bodyText)) !== null) {
          // For numeric pattern: [fullMatch, sizeWithCm, sizeNum, height]
          // For letter pattern: [fullMatch, size, height]
          const size = sizeMatch[1];
          const height = sizeMatch.length === 4 ? sizeMatch[3] : sizeMatch[2];
          if (size && height) {
            // Check if this is in a JSON context (skip if it is)
            const matchIndex = bodyText.indexOf(sizeMatch[0]);
            const context = bodyText.slice(Math.max(0, matchIndex - 30), matchIndex + 50);
            // Skip if it contains JSON indicators, but allow height quotes like 5'9"
            if (!context.includes('Heading') && !context.includes('{') && !context.includes('":"')) {
              data.sizing[size] = height.trim();
            }
          }
        }
      }
      
      // Extract Rider Notes
      const riderNotesMatch = bodyText.match(/RIDER NOTE:\s*([^]*?)(?:Size|Rider Height|Helpful|Report|$)/i);
      if (riderNotesMatch) {
        const noteText = riderNotesMatch[1];
        const noteLines = noteText.split('\n').map(line => line.trim()).filter(line => 
          line.length > 20 && !line.includes('Report') && !line.includes('Helpful')
        );
        if (noteLines.length > 0) {
          data.riderNotes.push({
            content: noteLines.join(' ').substring(0, 2000),
            extracted: true
          });
        }
      }
      
      // Extract Price History data
      if (bodyText.includes('Price History') && bodyText.includes('remained stable')) {
        const priceHistoryMatch = bodyText.match(/price has ([^.]*\$[\d,]+)/i);
        if (priceHistoryMatch) {
          data.priceHistory.status = priceHistoryMatch[1];
        }
        data.priceHistory.hasData = true;
      }
      
      // Extract Similar Bikes
      const similarBikesSection = bodyText.match(/Similar Bikes\s*([^]*?)(?:Insights|Ride Feel|$)/i);
      if (similarBikesSection) {
        const bikesText = similarBikesSection[1];
        const bikePattern = /([A-Z][a-z]+)\s*([A-Z][^$]*)\$?([\d,]+)/g;
        let bikeMatch;
        while ((bikeMatch = bikePattern.exec(bikesText)) !== null && data.similarBikes.length < 10) {
          const [, brand, model, price] = bikeMatch;
          if (brand && model && price) {
            data.similarBikes.push({
              brand: brand,
              model: model.trim(),
              price: `$${price}`
            });
          }
        }
      }
      
      // Extract Ride Feel Data
      if (bodyText.includes('Ride Feel') && bodyText.includes('Terrain')) {
        data.rideFeelData.hasData = true;
        if (bodyText.includes('easy') && bodyText.includes('extreme')) {
          data.rideFeelData.terrain = 'easy to extreme';
        }
        if (bodyText.includes('nimble') && bodyText.includes('stable')) {
          data.rideFeelData.handling = 'nimble to stable';
        }
        data.rideFeelData.category = 'Crosscountry bikes';
      }
      
      // Extract Gearing Data
      const gearingMatch = bodyText.match(/Lowest gear\s*\(climbing\)\s*(\d+)\s*mph/i);
      if (gearingMatch) {
        data.gearingData.lowestGear = `${gearingMatch[1]} mph`;
      }
      const highestGearMatch = bodyText.match(/Highest gear\s*\(descending\)\s*(\d+)\s*mph/i);
      if (highestGearMatch) {
        data.gearingData.highestGear = `${highestGearMatch[1]} mph`;
      }
      
      // Extract Spec Level Data
      if (bodyText.includes('Spec Level') && bodyText.includes('$')) {
        data.specLevelData.hasVisualization = true;
        const specLevelMatch = bodyText.match(/\$2,000.*\$14,000/);
        if (specLevelMatch) {
          data.specLevelData.priceRange = '$2,000 - $14,000';
        }
        data.specLevelData.category = 'crosscountry bikes';
      }
      
      // Enhanced pricing extraction
      const manufacturerPriceMatch = bodyText.match(/Manufacturer Price\s*\$?([\d,]+)/i);
      if (manufacturerPriceMatch) {
        data.pricing.manufacturerPrice = `$${manufacturerPriceMatch[1]}`;
      }
      
      // Extract weight
      const weightMatch = bodyText.match(/Weight\s*([\d.]+)\s*lbs/i);
      if (weightMatch) {
        data.bikeDetails.weight = `${weightMatch[1]} lbs`;
      }
      
      // Extract suspension details
      const suspensionMatch = bodyText.match(/Suspension\s*([^\\n]*(?:mm|travel)[^\\n]*)/i);
      if (suspensionMatch) {
        data.bikeDetails.suspension = suspensionMatch[1].trim();
      }
      
      // Remove duplicates and clean up
      data.features = [...new Set(data.features)];
      data.reviews.pros = [...new Set(data.reviews.pros)];
      data.reviews.cons = [...new Set(data.reviews.cons)];
      data.reviews.keyQuotes = [...new Set(data.reviews.keyQuotes)];
      
      return data;
    });

    const stats = {
      specifications: Object.keys(comprehensiveData.specifications).length,
      images: comprehensiveData.media.images.length,
      features: comprehensiveData.features.length,
      geometry: Object.keys(comprehensiveData.geometry).length,
      geometryBySize: Object.keys(comprehensiveData.geometryBySize).length,
      components: Object.keys(comprehensiveData.components).reduce((sum, comp) => 
        sum + Object.keys(comprehensiveData.components[comp] || {}).length, 0),
      dealers: comprehensiveData.dealers.length,
      comparisons: comprehensiveData.comparisons.length,
      pricing: Object.keys(comprehensiveData.pricing).length,
      reviewsPros: comprehensiveData.reviews.pros.length,
      reviewsCons: comprehensiveData.reviews.cons.length,
      reviewsQuotes: comprehensiveData.reviews.keyQuotes.length,
      sizing: Object.keys(comprehensiveData.sizing).length,
      riderNotes: comprehensiveData.riderNotes.length,
      similarBikes: comprehensiveData.similarBikes.length,
      hasRideFeelData: !!comprehensiveData.rideFeelData.hasData,
      hasGearingData: !!(comprehensiveData.gearingData.lowestGear || comprehensiveData.gearingData.highestGear),
      hasSpecLevelData: !!comprehensiveData.specLevelData.hasVisualization
    };

    console.log(`    ✅ COMPREHENSIVE data extraction complete:`);
    console.log(`       Specs:${stats.specifications} | Images:${stats.images} | Features:${stats.features} | Geometry:${stats.geometry} | GeometryBySizes:${stats.geometryBySize}`);
    console.log(`       Components:${stats.components} | Dealers:${stats.dealers} | Comparisons:${stats.comparisons} | Pricing:${stats.pricing}`);
    console.log(`       Reviews: ${stats.reviewsPros}pros ${stats.reviewsCons}cons ${stats.reviewsQuotes}quotes | Sizing:${stats.sizing} | RiderNotes:${stats.riderNotes}`);
    console.log(`       SimilarBikes:${stats.similarBikes} | RideFeel:${stats.hasRideFeelData} | Gearing:${stats.hasGearingData} | SpecLevel:${stats.hasSpecLevelData}`);

    return {
      ...comprehensiveData,
      extractedAt: new Date().toISOString(),
      extractionSuccess: true,
      extractionStats: stats
    };

  } catch (error) {
    console.log(`    ❌ Error (attempt ${retryCount + 1}): ${error.message}`);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`    🔄 Retrying in ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY);
      return await extractActualBikeData(variant, retryCount + 1);
    }
    
    // Log error for analysis
    processingLog.errors.push({
      variantId: variant.variantId,
      url: variant.url,
      error: error.message,
      timestamp: new Date().toISOString(),
      retryCount: retryCount + 1
    });
    
    return {
      error: error.message,
      extractedAt: new Date().toISOString(),
      extractionSuccess: false,
      retryCount: retryCount + 1,
      errorType: error.message.includes('404') ? '404_ERROR' :
                error.message.includes('HTTP_') ? 'HTTP_ERROR' :
                error.message.includes('Timeout') ? 'TIMEOUT_ERROR' :
                error.message.includes('NetworkError') ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR'
    };
  }
}

/* ---------- SMART RESUME AND QUALITY ASSESSMENT ---------- */

// Function to assess data quality and completeness
function assessDataQuality(spec) {
  if (!spec?.comprehensiveData?.extractionSuccess) {
    return { score: 0, reason: 'extraction_failed', priority: 1 };
  }
  
  const data = spec.comprehensiveData;
  let score = 0;
  let issues = [];
  
  // Core data scoring (40 points max)
  if (data.specifications && Object.keys(data.specifications).length > 0) score += 10;
  if (data.geometry && Object.keys(data.geometry).length > 0) score += 10;
  if (data.geometryBySize && Object.keys(data.geometryBySize).length > 0) score += 10;
  if (data.components && Object.keys(data.components).length > 0) score += 10;
  
  // Extended data scoring (30 points max)  
  if (data.pricing && Object.keys(data.pricing).length > 0) score += 5;
  if (data.bikeDetails && Object.keys(data.bikeDetails).length > 2) score += 5;
  if (data.media && data.media.images && data.media.images.length > 0) score += 5;
  if (data.reviews && (data.reviews.pros.length > 0 || data.reviews.cons.length > 0)) score += 5;
  if (data.sizing && Object.keys(data.sizing).length > 0) score += 5;
  if (data.similarBikes && data.similarBikes.length > 0) score += 5;
  
  // Bonus scoring (30 points max)
  if (data.riderNotes && data.riderNotes.length > 0) score += 10;
  if (data.rideFeelData && data.rideFeelData.hasData) score += 5;
  if (data.gearingData && (data.gearingData.lowestGear || data.gearingData.highestGear)) score += 5;
  if (data.specLevelData && data.specLevelData.hasVisualization) score += 5;
  if (data.priceHistory && data.priceHistory.hasData) score += 5;
  
  // Quality issues detection
  if (score < 30) issues.push('low_overall_score');
  if (!data.geometry || Object.keys(data.geometry).length === 0) issues.push('missing_geometry');
  if (!data.geometryBySize || Object.keys(data.geometryBySize).length === 0) issues.push('missing_geometry_by_size');
  if (!data.specifications || Object.keys(data.specifications).length < 5) issues.push('insufficient_specs');
  if (!data.media || !data.media.images || data.media.images.length === 0) issues.push('no_images');
  if (!data.pricing || Object.keys(data.pricing).length === 0) issues.push('missing_pricing');
  
  // Determine priority for re-scraping
  let priority = 4; // Default: no issues
  if (score < 20) priority = 1; // High priority: very incomplete
  else if (score < 40) priority = 2; // Medium priority: somewhat incomplete  
  else if (issues.length > 2) priority = 3; // Low priority: minor issues
  
  return { score, issues, priority, reason: issues.join(',') };
}

/* ---------- main processing ---------- */
console.log(`🚀 INTELLIGENT COMPREHENSIVE BIKE DATA EXTRACTION`);

// Assess existing data quality and categorize work
console.log(`📊 Analyzing existing data quality...`);
const workCategories = {
  failed: [],           // Priority 1: Failed extractions
  incomplete: [],       // Priority 2: Low quality/incomplete data  
  needsImprovement: [], // Priority 3: Missing some categories
  needsRescaping: [],   // Priority 4: Old data that should be refreshed
  notScraped: []        // Priority 5: Never been scraped
};

const qualityStats = { total: 0, scores: [] };

// Analyze all variants and categorize work needed
for (const [key, data] of Object.entries(bikeVariants)) {
  for (const family of data.families || []) {
    for (const variant of family.variants || []) {
      const existingSpec = comprehensiveSpecs[variant.variantId];
      const quality = assessDataQuality(existingSpec);
      
      qualityStats.total++;
      if (quality.score > 0) qualityStats.scores.push(quality.score);
      
      const workItem = {
        ...variant,
        makerYear: key,
        familyId: family.familyId,
        quality: quality,
        lastExtracted: existingSpec?.comprehensiveData?.extractedAt
      };
      
      if (quality.priority === 1) {
        workCategories.failed.push(workItem);
      } else if (quality.priority === 2) {
        workCategories.incomplete.push(workItem);
      } else if (quality.priority === 3) {
        workCategories.needsImprovement.push(workItem);
      } else if (existingSpec && quality.score > 0) {
        // Check if data is old (more than 7 days) - could be refreshed
        const lastExtracted = new Date(workItem.lastExtracted || '2000-01-01');
        const daysSinceExtracted = (new Date() - lastExtracted) / (1000 * 60 * 60 * 24);
        if (daysSinceExtracted > 7) {
          workCategories.needsRescaping.push(workItem);
        }
      } else {
        workCategories.notScraped.push(workItem);
      }
    }
  }
}

// Sort each category by various criteria
workCategories.failed.sort((a, b) => a.quality.score - b.quality.score); // Worst first
workCategories.incomplete.sort((a, b) => a.quality.score - b.quality.score); // Worst first  
workCategories.needsImprovement.sort((a, b) => b.quality.score - a.quality.score); // Best first (easier wins)
workCategories.needsRescaping.sort((a, b) => new Date(a.lastExtracted || '2000-01-01') - new Date(b.lastExtracted || '2000-01-01')); // Oldest first
// notScraped stays in original order

// Build prioritized work queue
const variantsToProcess = [
  ...workCategories.failed,
  ...workCategories.incomplete,
  ...workCategories.needsImprovement,
  ...workCategories.needsRescaping.slice(0, 100), // Limit re-scraping to avoid endless work
  ...workCategories.notScraped
];

console.log(`\n📈 WORK ANALYSIS COMPLETE:`);
console.log(`   Total bikes: ${qualityStats.total}`);
console.log(`   Previously scraped: ${qualityStats.scores.length}`);
console.log(`   Average quality score: ${qualityStats.scores.length > 0 ? Math.round(qualityStats.scores.reduce((a,b) => a+b, 0) / qualityStats.scores.length) : 0}/100`);

console.log(`\n🎯 WORK QUEUE PRIORITIZATION:`);
console.log(`   Priority 1 - Failed extractions: ${workCategories.failed.length}`);
console.log(`   Priority 2 - Incomplete data (score <40): ${workCategories.incomplete.length}`);
console.log(`   Priority 3 - Needs improvement (score 40-60): ${workCategories.needsImprovement.length}`);
console.log(`   Priority 4 - Re-scrape old data: ${Math.min(workCategories.needsRescaping.length, 100)}`);
console.log(`   Priority 5 - Never scraped: ${workCategories.notScraped.length}`);
console.log(`   Total work queue: ${variantsToProcess.length}`);

if (workCategories.failed.length > 0) {
  console.log(`\n⚠️  TOP FAILED EXTRACTIONS TO FIX:`);
  workCategories.failed.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i+1}. ${item.name} (score: ${item.quality.score}, reason: ${item.quality.reason})`);
  });
}

if (workCategories.incomplete.length > 0) {
  console.log(`\n📉 TOP INCOMPLETE EXTRACTIONS TO IMPROVE:`);
  workCategories.incomplete.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i+1}. ${item.name} (score: ${item.quality.score}, issues: ${item.quality.issues.join(', ')})`);
  });
}

const totalToProcess = variantsToProcess.length;
console.log(`📊 Found ${totalToProcess} variants needing comprehensive extraction`);
console.log(`🎯 Processing ALL ${totalToProcess} variants continuously...`);

// Create initial backup
if (Object.keys(comprehensiveSpecs).length > 0) {
  await createBackup(comprehensiveSpecs, '_session_start');
}

let processedCount = 0;
let successCount = 0;
let failedCount = 0;

for (const variant of variantsToProcess) {
  // Determine what type of work this is
  let workType = '🆕 NEW';
  if (variant.quality.priority === 1) workType = '🔴 FAILED';
  else if (variant.quality.priority === 2) workType = '🟡 INCOMPLETE';
  else if (variant.quality.priority === 3) workType = '🟠 IMPROVE';
  else if (variant.lastExtracted) workType = '🔄 REFRESH';
  
  console.log(`\n🔍 [${processedCount + 1}/${totalToProcess}] ${workType} ${variant.name}`);
  console.log(`    ID: ${variant.variantId} | URL: ${variant.url}`);
  if (variant.quality.score > 0) {
    console.log(`    Previous quality: ${variant.quality.score}/100 (${variant.quality.reason})`);
  }
  
  const comprehensiveData = await extractActualBikeData(variant);
  
  comprehensiveSpecs[variant.variantId] = {
    name: variant.name,
    url: variant.url,
    variantId: variant.variantId,
    makerYear: variant.makerYear,
    familyId: variant.familyId,
    comprehensiveData
  };
  
  processedCount++;
  processingLog.processedVariants++;
  processingLog.lastProcessedVariantId = variant.variantId;
  
  if (comprehensiveData.extractionSuccess) {
    successCount++;
    processingLog.successfulExtractions++;
  } else {
    failedCount++;
    processingLog.failedExtractions++;
  }
  
  // Save progress frequently
  if (processedCount % SAVE_EVERY === 0) {
    await Promise.all([
      safeJsonSave("comprehensive_bike_specs.json", comprehensiveSpecs),
      fs.writeFile("comprehensive_processing_log.json", JSON.stringify(processingLog, null, 2))
    ]);
    
    logProgress(processedCount, totalToProcess, successCount, failedCount);
    console.log(`💾 Progress saved: comprehensive_bike_specs.json & comprehensive_processing_log.json`);
    
    // Create backup every 25 items 
    if (processedCount % 25 === 0) {
      await createBackup(comprehensiveSpecs, `_checkpoint_${processedCount}`);
    }
  }
  
  await sleep(VARIANT_DELAY);
}

// Final save
await Promise.all([
  safeJsonSave("comprehensive_bike_specs.json", comprehensiveSpecs),
  fs.writeFile("comprehensive_processing_log.json", JSON.stringify(processingLog, null, 2))
]);

// Create final backup
await createBackup(comprehensiveSpecs, '_session_end');

console.log(`\n🎉 REAL STRUCTURE EXTRACTION COMPLETE`);
console.log(`   Processed: ${processedCount} variants`);
console.log(`   Successful: ${successCount} (${Math.round(successCount/processedCount*100)}%)`);
console.log(`   Failed: ${failedCount} (${Math.round(failedCount/processedCount*100)}%)`);
console.log(`   Total with comprehensive specs: ${Object.keys(comprehensiveSpecs).length}`);

// Report 404s and other issues
if (processingLog.url404s?.length > 0) {
  console.log(`\n🔍 404 URLS FOUND: ${processingLog.url404s.length}`);
  processingLog.url404s.slice(0, 5).forEach(error => {
    console.log(`   ${error.url} - "${error.pageTitle}"`);
  });
  if (processingLog.url404s.length > 5) {
    console.log(`   ... and ${processingLog.url404s.length - 5} more 404s`);
  }
}

if (processingLog.pageErrors?.length > 0) {
  console.log(`\n⚠️  PAGE ERRORS: ${processingLog.pageErrors.length}`);
  processingLog.pageErrors.slice(0, 3).forEach(error => {
    console.log(`   ${error.url} - "${error.pageTitle}"`);
  });
}

if (processingLog.emptyPages?.length > 0) {
  console.log(`\n📄 EMPTY PAGES: ${processingLog.emptyPages.length}`);
  processingLog.emptyPages.slice(0, 3).forEach(error => {
    console.log(`   ${error.url} - ${error.contentLength} chars`);
  });
}

if (processingLog.httpErrors?.length > 0) {
  console.log(`\n🌐 HTTP ERRORS: ${processingLog.httpErrors.length}`);
  processingLog.httpErrors.slice(0, 3).forEach(error => {
    console.log(`   ${error.url} - ${error.error}`);
  });
}

// Summary of error types
const errorSummary = {};
processingLog.errors?.forEach(err => {
  const type = err.error.includes('404') ? '404s' :
               err.error.includes('HTTP_') ? 'HTTP_errors' :
               err.error.includes('Timeout') ? 'Timeouts' :
               err.error.includes('NetworkError') ? 'Network_errors' : 'Other_errors';
  errorSummary[type] = (errorSummary[type] || 0) + 1;
});

if (Object.keys(errorSummary).length > 0) {
  console.log(`\n📈 ERROR BREAKDOWN:`);
  Object.entries(errorSummary).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
}

console.log(`\n✅ Data saved to:`);
console.log(`   📄 comprehensive_bike_specs.json`);
console.log(`   📜 comprehensive_processing_log.json (includes 404 analysis)`);

await stage.close();
process.exit(0);