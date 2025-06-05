#!/usr/bin/env node

/**
 * Compile all A-N bicycle brands into a comprehensive CSV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load existing brand research data
function loadExistingBrandData() {
  const brandData = new Map();
  
  // Load K-N brands from our research files
  const researchFiles = [
    'k-brands-research-batch1.json',
    'kl-brands-research-batch2.json',
    'm-brands-research-batch1.json',
    'mn-brands-research-batch2.json'
  ];
  
  researchFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', 'downloads', file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      data.results.forEach(brand => {
        brandData.set(brand.brand_id, brand);
      });
    }
  });
  
  // Load scraped brands (3T, AddMotor, Aegis)
  const scrapedBrandsPath = path.join(__dirname, '..', 'scrapers', 'bicycle_brands.js');
  if (fs.existsSync(scrapedBrandsPath)) {
    try {
      const content = fs.readFileSync(scrapedBrandsPath, 'utf-8');
      // Extract brand info from the JS file
      const match = content.match(/const brandinfo = (\[[\s\S]*?\]);/);
      if (match) {
        const brandsArray = eval(match[1]);
        brandsArray.forEach(brand => {
          brandData.set(brand.brand_id, {
            brand_id: brand.brand_id,
            brand_name: brand.brand_name,
            description: brand.description,
            founding: brand.founding,
            headquarters: brand.headquarters,
            parent_company: brand.parent_company,
            website: brand.website_url || brand.website,
            specialties: brand.product_types || [],
            confidence_score: 95 // High confidence for scraped data
          });
        });
      }
    } catch (error) {
      console.error('Error loading scraped brands:', error);
    }
  }
  
  return brandData;
}

// Load all A-N brands from maker_ids
function loadAllANBrands() {
  const makerIdsPath = path.join(__dirname, '..', 'scrapers', 'maker_ids.js');
  const content = fs.readFileSync(makerIdsPath, 'utf-8');
  
  // Extract the maker_ids object
  const match = content.match(/const maker_ids = \{([\s\S]*?)\};/);
  if (!match) {
    throw new Error('Could not parse maker_ids.js');
  }
  
  const makerIdsContent = '{' + match[1] + '}';
  const maker_ids = eval('(' + makerIdsContent + ')');
  
  // Filter A-N brands
  return Object.entries(maker_ids)
    .filter(([id, name]) => {
      const firstChar = name[0].toUpperCase();
      return firstChar >= 'A' && firstChar <= 'N';
    })
    .map(([id, name]) => ({ id, name }));
}

// Create CSV content
function createCSV(brands, brandData) {
  const headers = [
    'brand_id',
    'brand_name',
    'description',
    'founding_year',
    'founding_location',
    'founders',
    'headquarters_city',
    'headquarters_state',
    'headquarters_country',
    'parent_company',
    'specialties',
    'website',
    'confidence_score',
    'research_status'
  ];
  
  const rows = [headers.join(',')];
  
  brands.forEach(({ id, name }) => {
    const data = brandData.get(id) || {};
    
    const row = [
      id,
      `"${name}"`,
      `"${(data.description || '').replace(/"/g, '""')}"`,
      data.founding?.year || '',
      `"${data.founding?.location ? `${data.founding.location.city || ''}, ${data.founding.location.country || ''}` : ''}"`,
      `"${(data.founders || data.founding?.founders || []).join('; ')}"`,
      `"${data.headquarters?.city || ''}"`,
      `"${data.headquarters?.state_province || ''}"`,
      `"${data.headquarters?.country || ''}"`,
      `"${data.parent_company || ''}"`,
      `"${(data.specialties || []).join('; ')}"`,
      `"${data.website || ''}"`,
      data.confidence_score || '',
      data.brand_id ? 'Researched' : 'Pending'
    ];
    
    rows.push(row.join(','));
  });
  
  return rows.join('\n');
}

// Main execution
function main() {
  console.log('🚴 Compiling A-N Bicycle Brands CSV');
  console.log('=' .repeat(40));
  
  // Load existing brand data
  const brandData = loadExistingBrandData();
  console.log(`✅ Loaded ${brandData.size} researched brands`);
  
  // Load all A-N brands
  const allBrands = loadAllANBrands();
  console.log(`✅ Found ${allBrands.length} A-N brands total`);
  
  // Create CSV
  const csv = createCSV(allBrands, brandData);
  
  // Save CSV
  const outputPath = path.join(__dirname, '..', 'downloads', 'bicycle_brands_a_n.csv');
  fs.writeFileSync(outputPath, csv);
  
  console.log(`\n💾 CSV saved to: ${outputPath}`);
  
  // Summary statistics
  const researched = allBrands.filter(b => brandData.has(b.id)).length;
  const pending = allBrands.length - researched;
  
  console.log('\n📊 Summary:');
  console.log(`   Total brands: ${allBrands.length}`);
  console.log(`   Researched: ${researched}`);
  console.log(`   Pending: ${pending}`);
  console.log(`   Completion: ${((researched / allBrands.length) * 100).toFixed(1)}%`);
}

main();