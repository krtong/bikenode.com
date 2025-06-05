#!/usr/bin/env node

/**
 * IMPROVED Research System v2
 * Fixes: False positives, better validation, relevance checking
 */

import chalk from 'chalk';

class ImprovedBrandResearcher {
  constructor() {
    this.validationRules = {
      minRelevanceScore: 0.6,
      maxYearRange: { min: 1850, max: new Date().getFullYear() + 1 },
      minBrandNameSimilarity: 0.3
    };
  }

  // Check if search result is relevant to the brand we're researching
  calculateRelevanceScore(result, targetBrandName) {
    const targetWords = targetBrandName.toLowerCase().split(/\s+/);
    const resultText = `${result.title} ${result.snippet}`.toLowerCase();
    
    let relevanceScore = 0;
    let matchCount = 0;
    
    // Score based on brand name matches
    for (const word of targetWords) {
      if (word.length >= 3) { // Ignore short words like "co", "ltd"
        if (resultText.includes(word)) {
          matchCount++;
          relevanceScore += 0.3;
        }
      }
    }
    
    // Bonus for bicycle-related keywords
    const bikeKeywords = ['bicycle', 'bike', 'cycling', 'frame', 'manufacturer', 'founded'];
    for (const keyword of bikeKeywords) {
      if (resultText.includes(keyword)) {
        relevanceScore += 0.1;
      }
    }
    
    // Penalty for obviously irrelevant content
    const irrelevantKeywords = ['fake', 'counterfeit', 'never heard', 'obscure brands list'];
    for (const keyword of irrelevantKeywords) {
      if (resultText.includes(keyword)) {
        relevanceScore -= 0.5;
      }
    }
    
    // Bonus for official sources
    if (result.url.includes(targetBrandName.toLowerCase().replace(/\s+/g, ''))) {
      relevanceScore += 0.4;
    }
    
    if (result.url.includes('wikipedia')) {
      relevanceScore += 0.2;
    }
    
    return {
      score: Math.max(0, Math.min(1, relevanceScore)),
      matchCount,
      isRelevant: relevanceScore >= this.validationRules.minRelevanceScore
    };
  }

  // Validate extracted founding year
  validateFoundingYear(year, context) {
    if (!year || isNaN(year)) return { valid: false, reason: 'Not a number' };
    
    if (year < this.validationRules.maxYearRange.min || year > this.validationRules.maxYearRange.max) {
      return { valid: false, reason: `Year ${year} outside valid range` };
    }
    
    // Check if year appears in context of founding
    const foundingKeywords = ['founded', 'established', 'started', 'began', 'launched'];
    const contextText = context.toLowerCase();
    
    for (const keyword of foundingKeywords) {
      if (contextText.includes(`${keyword} in ${year}`) || contextText.includes(`${keyword} ${year}`)) {
        return { valid: true, reason: `Found "${keyword} ${year}" in context` };
      }
    }
    
    return { valid: false, reason: 'Year not in founding context' };
  }

  // Validate extracted founders
  validateFounders(founders, context) {
    const validFounders = [];
    const contextText = context.toLowerCase();
    
    for (const founder of founders) {
      // Check if founder appears near founding keywords
      const founderLower = founder.toLowerCase();
      const foundingPattern = new RegExp(`(founded|established|started).{0,50}${founderLower}|${founderLower}.{0,50}(founded|established|started)`, 'i');
      
      if (foundingPattern.test(context)) {
        validFounders.push(founder);
      } else {
        console.log(chalk.yellow(`    ⚠️ Rejecting founder "${founder}" - not in founding context`));
      }
    }
    
    return validFounders;
  }

  // Improved data extraction with validation
  extractDataWithValidation(searchResults, brandName) {
    console.log(chalk.blue(`🔍 IMPROVED extraction for: ${brandName}`));
    console.log(chalk.gray('Using relevance filtering and validation...'));
    
    const data = {
      brand_id: brandName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''),
      brand_name: brandName,
      founding_year: null,
      founders: [],
      headquarters: {},
      website: null,
      sources: [],
      validation_log: []
    };
    
    let validExtractions = 0;
    let rejectedExtractions = 0;
    
    for (const result of searchResults.results) {
      // Step 1: Check relevance
      const relevance = this.calculateRelevanceScore(result, brandName);
      
      console.log(chalk.gray(`  Processing: ${result.title}`));
      console.log(chalk.gray(`    Relevance: ${(relevance.score * 100).toFixed(1)}% (${relevance.isRelevant ? 'RELEVANT' : 'IRRELEVANT'})`));
      
      if (!relevance.isRelevant) {
        console.log(chalk.red(`    ❌ REJECTED - Below relevance threshold`));
        rejectedExtractions++;
        continue;
      }
      
      const text = `${result.title} ${result.snippet}`;
      
      // Step 2: Extract founding year with validation
      const yearMatch = text.match(/(\d{4})/g);
      if (yearMatch && !data.founding_year) {
        for (const year of yearMatch) {
          const yearValidation = this.validateFoundingYear(parseInt(year), text);
          if (yearValidation.valid) {
            data.founding_year = parseInt(year);
            console.log(chalk.green(`    ✅ Found valid founding year: ${year} (${yearValidation.reason})`));
            data.validation_log.push(`Founding year ${year}: ${yearValidation.reason}`);
            validExtractions++;
            break;
          } else {
            console.log(chalk.yellow(`    ⚠️ Rejected year ${year}: ${yearValidation.reason}`));
          }
        }
      }
      
      // Step 3: Extract founders with validation
      const founderPatterns = [
        /founded by ([A-Z][a-z]+ [A-Z][a-z]+)/g,
        /established by ([A-Z][a-z]+ [A-Z][a-z]+)/g,
        /started by ([A-Z][a-z]+ [A-Z][a-z]+)/g
      ];
      
      for (const pattern of founderPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          const founder = match[1];
          if (!data.founders.includes(founder)) {
            const validatedFounders = this.validateFounders([founder], text);
            if (validatedFounders.length > 0) {
              data.founders.push(founder);
              console.log(chalk.green(`    ✅ Found valid founder: ${founder}`));
              validExtractions++;
            }
          }
        }
      }
      
      // Step 4: Extract headquarters with validation
      const locationPattern = /(in|based in|located in|headquarters in)\s+([A-Z][a-z]+),?\s*([A-Z][a-z]+)?/gi;
      const locationMatches = [...text.matchAll(locationPattern)];
      
      for (const match of locationMatches) {
        if (!data.headquarters.city) {
          const city = match[2];
          const stateCountry = match[3];
          
          // Validate it's a real location context
          if (match[1].includes('headquarters') || match[1].includes('based')) {
            data.headquarters.city = city;
            if (stateCountry) {
              data.headquarters.state_province = stateCountry;
            }
            console.log(chalk.green(`    ✅ Found headquarters: ${city}${stateCountry ? ', ' + stateCountry : ''}`));
            validExtractions++;
            break;
          }
        }
      }
      
      // Step 5: Extract official website
      if (result.url.includes(brandName.toLowerCase().replace(/\s+/g, '')) && !data.website) {
        data.website = result.url;
        console.log(chalk.green(`    ✅ Found official website: ${result.url}`));
        validExtractions++;
      }
      
      data.sources.push({
        ...result,
        relevance_score: relevance.score,
        used_for_extraction: true
      });
    }
    
    // Calculate confidence based on validated extractions
    const maxPossibleExtractions = 4; // year, founders, location, website
    const confidence = Math.min(100, (validExtractions / maxPossibleExtractions) * 100);
    
    console.log(chalk.blue('\n📊 IMPROVED Extraction Results:'));
    console.log(`  • Valid extractions: ${validExtractions}/${maxPossibleExtractions}`);
    console.log(`  • Rejected extractions: ${rejectedExtractions}`);
    console.log(`  • Confidence: ${confidence.toFixed(1)}%`);
    console.log(`  • Quality: ${confidence >= 75 ? 'High' : confidence >= 50 ? 'Medium' : 'Low'}`);
    
    return {
      data,
      confidence,
      validExtractions,
      rejectedExtractions,
      qualityScore: confidence >= 50 ? 'PASS' : 'FAIL'
    };
  }
}

// Test the improved system with both good and bad data
async function testImprovedSystem() {
  console.log(chalk.blue('🧪 TESTING IMPROVED RESEARCH SYSTEM v2'));
  console.log('=' .repeat(50));
  
  const researcher = new ImprovedBrandResearcher();
  
  // Test 1: Good data (Trek)
  console.log(chalk.green('\n✅ TEST 1: Good data (Trek Bicycles)'));
  const goodData = {
    query: "Trek Bicycles company founded",
    results: [
      {
        title: "Trek Bicycle Corporation - Wikipedia",
        url: "https://en.wikipedia.org/wiki/Trek_Bicycle_Corporation",
        snippet: "Trek was established in 1976 by Dick Burke and Bevill Hogg in Waterloo, Wisconsin."
      }
    ]
  };
  
  const goodTest = researcher.extractDataWithValidation(goodData, 'Trek Bicycles');
  
  // Test 2: Bad data (fake brand)
  console.log(chalk.red('\n❌ TEST 2: Bad data (XYZ Bicycles - fake)'));
  const badData = {
    query: "XYZ Bicycles fake brand",
    results: [
      {
        title: "List of bicycle brands and manufacturing companies",
        url: "https://en.wikipedia.org/wiki/List_of_bicycle_brands",
        snippet: "Beyond well-known vintage bicycles like Yeti or Colnago, there are underrated, rare, and forgotten bike brands like Gecko, Confente, Alpinestars from the 1970s."
      }
    ]
  };
  
  const badTest = researcher.extractDataWithValidation(badData, 'XYZ Bicycles');
  
  // Summary
  console.log(chalk.blue('\n📊 IMPROVEMENT TEST RESULTS'));
  console.log('=' .repeat(35));
  console.log(`Good data test - Confidence: ${goodTest.confidence.toFixed(1)}% (${goodTest.qualityScore})`);
  console.log(`Bad data test - Confidence: ${badTest.confidence.toFixed(1)}% (${badTest.qualityScore})`);
  console.log(`Rejected bad extractions: ${badTest.rejectedExtractions}`);
  
  const improvementSuccess = goodTest.qualityScore === 'PASS' && badTest.qualityScore === 'FAIL';
  
  if (improvementSuccess) {
    console.log(chalk.green('\n🎉 IMPROVEMENT SUCCESSFUL!'));
    console.log('✅ Correctly identifies good data');
    console.log('✅ Correctly rejects bad data');
    console.log('✅ No more false positives');
  } else {
    console.log(chalk.red('\n💥 IMPROVEMENT FAILED!'));
    console.log('System still has issues');
  }
  
  return {
    improved: improvementSuccess,
    goodDataConfidence: goodTest.confidence,
    badDataConfidence: badTest.confidence
  };
}

// Run the test
const results = await testImprovedSystem();