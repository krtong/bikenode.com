#!/usr/bin/env node
/*  Parse and enhance existing bike_variants.json data  */

import fs from "fs/promises";

// Enhanced name parser
function parseNameString(nameStr) {
  const result = {
    rawName: nameStr,
    year: null,
    make: null,
    family: null,
    model: null,
    price: null,
    priceRange: null,
    priceMin: null,
    priceMax: null
  };

  let workingStr = nameStr;

  // Extract year (4 digits at start)
  const yearMatch = workingStr.match(/^(\d{4})\s/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[1]);
    workingStr = workingStr.replace(/^\d{4}\s/, '');
  }

  // Extract price/price range (at end)
  const priceMatch = workingStr.match(/\$[\d,]+(?:—\$[\d,]+)?$/);
  if (priceMatch) {
    const priceStr = priceMatch[0];
    result.price = priceStr;
    
    if (priceStr.includes('—')) {
      result.priceRange = priceStr;
      const [min, max] = priceStr.split('—');
      result.priceMin = parseInt(min.replace(/[\$,]/g, ''));
      result.priceMax = parseInt(max.replace(/[\$,]/g, ''));
    } else {
      result.priceMin = parseInt(priceStr.replace(/[\$,]/g, ''));
    }
    
    workingStr = workingStr.replace(/\$[\d,]+(?:—\$[\d,]+)?$/, '').trim();
  }

  // Extract make (known patterns)
  const makePatterns = [
    /^(YT Industries)/,
    /^(Trek)/,
    /^(Specialized)/,
    /^(Santa Cruz)/,
    /^(Rocky Mountain)/,
    /^(Cannondale)/,
    /^(Giant)/,
    /^(Scott)/,
    /^(\w+(?:\s+\w+)?)/  // Fallback: 1-2 words
  ];

  for (const pattern of makePatterns) {
    const match = workingStr.match(pattern);
    if (match) {
      result.make = match[1];
      workingStr = workingStr.replace(pattern, '').trim();
      break;
    }
  }

  // What's left should be family + model
  // Family is usually the first word/segment
  const segments = workingStr.split(/\s+/);
  if (segments.length > 0) {
    result.family = segments[0];
    result.model = segments.slice(1).join(' ') || null;
  }

  return result;
}

// Load and parse existing data
console.log('📂 Loading bike_variants.json...');

try {
  const rawData = await fs.readFile('bike_variants.json', 'utf8');
  const bikeData = JSON.parse(rawData);
  
  console.log(`✅ Loaded data for ${Object.keys(bikeData).length} maker/year combinations`);
  
  // Enhance the data structure
  const enhancedData = {};
  let totalFamilies = 0;
  let totalVariants = 0;
  
  for (const [key, data] of Object.entries(bikeData)) {
    const enhancedFamilies = [];
    
    for (const family of data.families || []) {
      const parsedFamily = parseNameString(family.name);
      const enhancedVariants = [];
      
      for (const variant of family.variants || []) {
        const parsedVariant = parseNameString(variant.name);
        enhancedVariants.push({
          ...parsedVariant,
          url: variant.url,
          variantId: variant.variantId
        });
        totalVariants++;
      }
      
      enhancedFamilies.push({
        ...parsedFamily,
        url: family.url,
        familyId: family.familyId,
        variants: enhancedVariants,
        variantCount: enhancedVariants.length
      });
      totalFamilies++;
    }
    
    enhancedData[key] = {
      ...data,
      families: enhancedFamilies
    };
  }
  
  // Save enhanced data
  await fs.writeFile('enhanced_bike_variants.json', JSON.stringify(enhancedData, null, 2));
  
  console.log(`\n📊 ENHANCEMENT COMPLETE:`);
  console.log(`   ${Object.keys(enhancedData).length} maker/year combinations`);
  console.log(`   ${totalFamilies} bike families`);
  console.log(`   ${totalVariants} bike variants`);
  console.log(`\n✅ Enhanced data saved to enhanced_bike_variants.json`);
  
  // Show a sample of enhanced data
  const firstKey = Object.keys(enhancedData)[0];
  const sampleFamily = enhancedData[firstKey]?.families?.[0];
  const sampleVariant = sampleFamily?.variants?.[0];
  
  if (sampleVariant) {
    console.log(`\n📋 SAMPLE ENHANCED VARIANT:`);
    console.log(`   Raw: "${sampleVariant.rawName}"`);
    console.log(`   Year: ${sampleVariant.year}`);
    console.log(`   Make: "${sampleVariant.make}"`);
    console.log(`   Family: "${sampleVariant.family}"`);
    console.log(`   Model: "${sampleVariant.model}"`);
    console.log(`   Price: ${sampleVariant.price} (${sampleVariant.priceMin})`);
    console.log(`   URL: ${sampleVariant.url}`);
  }
  
  // Show price analysis
  const variants = Object.values(enhancedData)
    .flatMap(d => d.families)
    .flatMap(f => f.variants)
    .filter(v => v.priceMin);
    
  if (variants.length > 0) {
    const prices = variants.map(v => v.priceMin).sort((a, b) => a - b);
    console.log(`\n💰 PRICE ANALYSIS:`);
    console.log(`   Cheapest: $${prices[0].toLocaleString()}`);
    console.log(`   Most expensive: $${prices[prices.length - 1].toLocaleString()}`);
    console.log(`   Average: $${Math.round(prices.reduce((a, b) => a + b) / prices.length).toLocaleString()}`);
  }

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}