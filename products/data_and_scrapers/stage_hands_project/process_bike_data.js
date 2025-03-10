const fs = require('fs');
const path = require('path');

/**
 * This script processes the scraped bike data to:
 * 1. Clean and normalize the data
 * 2. Generate statistics
 * 3. Export to different formats
 */
async function main() {
  console.log('Starting bike data processing...');
  
  try {
    // Find the most recent combined data file
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      console.error('Data directory not found.');
      return;
    }
    
    const files = fs.readdirSync(dataDir);
    
    // Find the most recent combined results
    const combinedFile = files
      .filter(file => file.startsWith('99spokes_bikes_combined_'))
      .sort()
      .pop();
    
    if (!combinedFile) {
      console.error('No combined data file found.');
      return;
    }
    
    console.log(`Processing data from: ${combinedFile}`);
    const bikes = JSON.parse(fs.readFileSync(path.join(dataDir, combinedFile), 'utf8'));
    
    // 1. Clean and normalize the data
    console.log('\n=== Cleaning and Normalizing Data ===\n');
    const cleanedBikes = bikes.map(cleanBike);
    
    // 2. Generate statistics
    console.log('\n=== Generating Statistics ===\n');
    const stats = generateStatistics(cleanedBikes);
    
    // Print statistics
    console.log(`Total bikes: ${stats.totalBikes}`);
    console.log(`Brands: ${stats.brands.length}`);
    console.log(`Categories: ${stats.categories.length}`);
    console.log(`Price range: $${stats.minPrice} - $${stats.maxPrice}`);
    console.log(`Average price: $${stats.avgPrice.toFixed(2)}`);
    
    // 3. Export to different formats
    console.log('\n=== Exporting Data ===\n');
    
    // Save cleaned data
    const cleanedPath = path.join(dataDir, 'cleaned_bikes.json');
    fs.writeFileSync(cleanedPath, JSON.stringify(cleanedBikes, null, 2));
    console.log(`Cleaned data saved to: ${cleanedPath}`);
    
    // Save statistics
    const statsPath = path.join(dataDir, 'bike_statistics.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`Statistics saved to: ${statsPath}`);
    
    // Export to CSV
    const csvPath = path.join(dataDir, 'bikes.csv');
    const csv = exportToCsv(cleanedBikes);
    fs.writeFileSync(csvPath, csv);
    console.log(`CSV data saved to: ${csvPath}`);
    
    console.log('\nData processing complete!');
    
  } catch (error) {
    console.error('Error processing data:', error);
  }
}

/**
 * Cleans and normalizes a bike object
 */
function cleanBike(bike) {
  const cleaned = { ...bike };
  
  // Normalize brand (uppercase first letter)
  if (cleaned.brand) {
    cleaned.brand = cleaned.brand.trim();
    cleaned.brand = cleaned.brand.charAt(0).toUpperCase() + cleaned.brand.slice(1);
  }
  
  // Normalize model
  if (cleaned.model) {
    cleaned.model = cleaned.model.trim();
  }
  
  // Clean price (extract numeric value)
  if (cleaned.price) {
    const priceMatch = cleaned.price.match(/[\d,]+(\.\d+)?/);
    if (priceMatch) {
      cleaned.numericPrice = parseFloat(priceMatch[0].replace(/,/g, ''));
    }
  }
  
  // Normalize category
  if (cleaned.category) {
    cleaned.category = cleaned.category.trim();
    cleaned.category = cleaned.category.charAt(0).toUpperCase() + cleaned.category.slice(1);
  }
  
  // Ensure specs is an object
  if (!cleaned.specs || typeof cleaned.specs !== 'object') {
    cleaned.specs = {};
  }
  
  // Normalize specs keys
  const normalizedSpecs = {};
  for (const [key, value] of Object.entries(cleaned.specs)) {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    normalizedSpecs[normalizedKey] = value;
  }
  cleaned.specs = normalizedSpecs;
  
  return cleaned;
}

/**
 * Generates statistics from the bike data
 */
function generateStatistics(bikes) {
  const stats = {
    totalBikes: bikes.length,
    brands: [],
    categories: [],
    minPrice: Infinity,
    maxPrice: 0,
    avgPrice: 0,
    priceDistribution: {},
    bikesWithImages: 0,
    bikesWithSpecs: 0,
    specDistribution: {}
  };
  
  // Set of unique brands and categories
  const brandSet = new Set();
  const categorySet = new Set();
  
  // Price calculations
  let totalPrice = 0;
  let priceCount = 0;
  
  bikes.forEach(bike => {
    // Brands
    if (bike.brand) {
      brandSet.add(bike.brand);
    }
    
    // Categories
    if (bike.category) {
      categorySet.add(bike.category);
    }
    
    // Prices
    if (bike.numericPrice) {
      stats.minPrice = Math.min(stats.minPrice, bike.numericPrice);
      stats.maxPrice = Math.max(stats.maxPrice, bike.numericPrice);
      totalPrice += bike.numericPrice;
      priceCount++;
      
      // Price distribution
      const priceRange = Math.floor(bike.numericPrice / 1000) * 1000;
      const rangeKey = `$${priceRange}-$${priceRange + 999}`;
      stats.priceDistribution[rangeKey] = (stats.priceDistribution[rangeKey] || 0) + 1;
    }
    
    // Images
    if (bike.imageUrl) {
      stats.bikesWithImages++;
    }
    
    // Specs
    if (bike.specs && Object.keys(bike.specs).length > 0) {
      stats.bikesWithSpecs++;
      
      // Spec distribution
      for (const spec of Object.keys(bike.specs)) {
        stats.specDistribution[spec] = (stats.specDistribution[spec] || 0) + 1;
      }
    }
  });
  
  // Convert sets to arrays
  stats.brands = Array.from(brandSet).sort();
  stats.categories = Array.from(categorySet).sort();
  
  // Calculate average price
  stats.avgPrice = priceCount > 0 ? totalPrice / priceCount : 0;
  
  // Handle case where no prices were found
  if (stats.minPrice === Infinity) {
    stats.minPrice = 0;
  }
  
  return stats;
}

/**
 * Exports bike data to CSV format
 */
function exportToCsv(bikes) {
  // Define CSV headers
  const headers = [
    'Brand',
    'Model',
    'Year',
    'Price',
    'Numeric Price',
    'Category',
    'Image URL',
    'Detail URL'
  ];
  
  // Create CSV content
  let csv = headers.join(',') + '\n';
  
  bikes.forEach(bike => {
    const row = [
      escapeCsvValue(bike.brand || ''),
      escapeCsvValue(bike.model || ''),
      escapeCsvValue(bike.year || ''),
      escapeCsvValue(bike.price || ''),
      bike.numericPrice || '',
      escapeCsvValue(bike.category || ''),
      escapeCsvValue(bike.imageUrl || ''),
      escapeCsvValue(bike.url || '')
    ];
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

/**
 * Escapes a value for CSV format
 */
function escapeCsvValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  // If the value contains a comma, quote, or newline, wrap it in quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Double up any quotes
    value = value.replace(/"/g, '""');
    // Wrap in quotes
    return `"${value}"`;
  }
  
  return value;
}

main();