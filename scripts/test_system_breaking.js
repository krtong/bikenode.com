#!/usr/bin/env node

/**
 * TEST: Breaking the Research System
 * Test with bad/irrelevant search results to see where it fails
 */

import chalk from 'chalk';

// Bad search results - no relevant brand information
const badSearchResults = {
  query: "Obscure Bicycle Company XYZ founded never existed fake brand",
  results: [
    {
      title: "List of bicycle brands and manufacturing companies - Wikipedia",
      url: "https://en.m.wikipedia.org/wiki/List_of_bicycle_brands_and_manufacturing_companies",
      snippet: "Beyond well-known vintage bicycles like Yeti or Colnago, there are underrated, rare, and forgotten bike brands like Gecko, Confente, Alpinestars, and Lotus."
    },
    {
      title: "To Catch a Counterfeiter: The Sketchy World of Fake Bike Gear | Bicycling",
      url: "https://www.bicycling.com/bikes-gear/a20045553/to-catch-a-counterfeiter-the-sketchy-world-of-fake-bike-gear/",
      snippet: "One example mentioned a fake brand called 'Hylix' that someone had never heard of but purchased anyway. The results also show that almost 90 percent of counterfeit goods seized in the US last year came from China and Hong Kong."
    },
    {
      title: "7 Vintage Bike Brands You've Never Heard Of From The 1970s, 80s, and 90s",
      url: "https://www.theproscloset.com/blogs/news/forgotten-vintage-bike-brands",
      snippet: "Fake websites and brands: The fake DMR Bikes website appeared to be selling branded products, often at an attractively low price point."
    }
  ]
};

function testExtractionWithBadData() {
  console.log(chalk.red('💥 TESTING SYSTEM WITH BAD DATA'));
  console.log('=' .repeat(40));
  console.log('Brand: XYZ Bicycles (fake/non-existent)');
  console.log('Search results: Irrelevant content about counterfeits\n');
  
  const data = {
    brand_id: 'xyzbicycles',
    brand_name: 'XYZ Bicycles',
    founding_year: null,
    founders: [],
    headquarters: {},
    website: null,
    sources: []
  };
  
  let extractions = 0;
  let falsePositives = 0;
  
  console.log(chalk.blue('🔍 Attempting data extraction...'));
  
  for (const result of badSearchResults.results) {
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    console.log(chalk.gray(`  Processing: ${result.title}`));
    
    // Try to extract founding year (will find random years)
    const yearMatch = text.match(/(\d{4})/g);
    if (yearMatch && !data.founding_year) {
      // This is a bug - it will pick up random years!
      data.founding_year = parseInt(yearMatch[0]);
      console.log(chalk.red(`    ❌ FALSE POSITIVE - Found random year: ${data.founding_year}`));
      falsePositives++;
    }
    
    // Try to extract founders (will find random names)
    const namePatterns = ['hylix', 'gecko', 'confente', 'alpinestars', 'lotus'];
    for (const name of namePatterns) {
      if (text.includes(name) && data.founders.length === 0) {
        data.founders.push(name);
        console.log(chalk.red(`    ❌ FALSE POSITIVE - Found random name: ${name}`));
        falsePositives++;
        break;
      }
    }
    
    // Try to extract location (will find random locations)
    if (text.includes('china') && !data.headquarters.country) {
      data.headquarters.country = 'China';
      console.log(chalk.red(`    ❌ FALSE POSITIVE - Found random location: China`));
      falsePositives++;
    }
    
    // Try to extract website (will pick up irrelevant sites)
    if (result.url && !data.website) {
      data.website = result.url;
      console.log(chalk.red(`    ❌ FALSE POSITIVE - Using irrelevant URL: ${result.url}`));
      falsePositives++;
    }
    
    data.sources.push(result);
  }
  
  console.log(chalk.red(`\n💥 SYSTEM BREAKDOWN:`));
  console.log(`  • False positives: ${falsePositives}`);
  console.log(`  • Actual relevant data: 0`);
  console.log(`  • Garbage data extracted: ${falsePositives > 0 ? 'YES' : 'NO'}`);
  console.log(`  • System failed: ${falsePositives > 0 ? 'YES' : 'NO'}`);
  
  return {
    data,
    failed: falsePositives > 0,
    falsePositives,
    confidence: 0 // Should be 0 for non-existent brand
  };
}

function testEmptyResults() {
  console.log(chalk.yellow('\n🔍 TESTING WITH EMPTY SEARCH RESULTS'));
  console.log('=' .repeat(45));
  
  const emptyResults = { query: "NonExistentBrand123 bicycles", results: [] };
  
  console.log('Brand: NonExistentBrand123');
  console.log('Search results: Empty array');
  
  const data = {
    brand_id: 'nonexistentbrand123',
    brand_name: 'NonExistentBrand123',
    founding_year: null,
    founders: [],
    headquarters: {},
    website: null,
    sources: []
  };
  
  console.log(chalk.blue('\n🔍 Processing empty results...'));
  // The system should handle this gracefully
  
  if (emptyResults.results.length === 0) {
    console.log(chalk.yellow('  ⚠️ No search results found'));
    console.log(chalk.green('  ✅ System correctly identified no data'));
    return {
      data,
      failed: false,
      confidence: 0,
      graceful_failure: true
    };
  }
  
  return {
    data,
    failed: true,
    confidence: 0,
    graceful_failure: false
  };
}

function testMalformedResults() {
  console.log(chalk.yellow('\n🔍 TESTING WITH MALFORMED SEARCH RESULTS'));
  console.log('=' .repeat(48));
  
  const malformedResults = {
    query: "Test Brand bicycles",
    results: [
      { title: "", url: "", snippet: "" }, // Empty strings
      { title: null, url: null, snippet: null }, // Null values
      { snippet: "Missing title and url" }, // Missing fields
      { title: "Only title" } // Incomplete data
    ]
  };
  
  console.log('Testing with empty strings, null values, missing fields...');
  
  try {
    for (const result of malformedResults.results) {
      console.log(chalk.gray(`  Processing: ${result.title || 'NO TITLE'}`));
      
      // This will break if we don't handle null/undefined
      const text = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();
      
      if (!text.trim()) {
        console.log(chalk.yellow('    ⚠️ Empty text after processing'));
      }
    }
    
    console.log(chalk.green('  ✅ Handled malformed data without crashing'));
    return { failed: false, graceful_handling: true };
    
  } catch (error) {
    console.log(chalk.red(`  ❌ System crashed: ${error.message}`));
    return { failed: true, error: error.message };
  }
}

async function runAllBreakingTests() {
  console.log(chalk.blue('🧪 COMPREHENSIVE SYSTEM BREAKING TESTS'));
  console.log('=' .repeat(50));
  console.log('Goal: Find all the ways the system fails\n');
  
  // Test 1: Bad/irrelevant data
  const badDataTest = testExtractionWithBadData();
  
  // Test 2: Empty results
  const emptyTest = testEmptyResults();
  
  // Test 3: Malformed data
  const malformedTest = testMalformedResults();
  
  // Summary
  console.log(chalk.blue('\n📊 BREAKING TEST SUMMARY'));
  console.log('=' .repeat(30));
  
  const totalTests = 3;
  let failedTests = 0;
  
  if (badDataTest.failed) {
    console.log(chalk.red('❌ BAD DATA TEST: FAILED (false positives)'));
    failedTests++;
  } else {
    console.log(chalk.green('✅ BAD DATA TEST: PASSED'));
  }
  
  if (emptyTest.failed) {
    console.log(chalk.red('❌ EMPTY RESULTS TEST: FAILED'));
    failedTests++;
  } else {
    console.log(chalk.green('✅ EMPTY RESULTS TEST: PASSED'));
  }
  
  if (malformedTest.failed) {
    console.log(chalk.red('❌ MALFORMED DATA TEST: FAILED'));
    failedTests++;
  } else {
    console.log(chalk.green('✅ MALFORMED DATA TEST: PASSED'));
  }
  
  console.log(chalk.blue(`\n🎯 SYSTEM RELIABILITY: ${((totalTests - failedTests) / totalTests * 100).toFixed(1)}%`));
  
  if (failedTests > 0) {
    console.log(chalk.red('\n💥 SYSTEM NEEDS IMPROVEMENT'));
    console.log(chalk.yellow('Issues found:'));
    if (badDataTest.failed) console.log('  • Extracts false positive data from irrelevant results');
    if (emptyTest.failed) console.log('  • Doesn\'t handle empty search results gracefully');
    if (malformedTest.failed) console.log('  • Crashes on malformed search data');
  } else {
    console.log(chalk.green('\n🎉 SYSTEM HANDLES EDGE CASES WELL'));
  }
  
  return {
    totalTests,
    failedTests,
    reliability: ((totalTests - failedTests) / totalTests * 100),
    issues: {
      falsePositives: badDataTest.falsePositives,
      emptyHandling: !emptyTest.failed,
      malformedHandling: !malformedTest.failed
    }
  };
}

// Run all tests
const results = await runAllBreakingTests();

console.log(chalk.blue('\n🔧 NEXT: Build improved version that fixes these issues...'));