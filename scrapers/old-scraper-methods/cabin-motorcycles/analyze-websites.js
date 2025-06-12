#!/usr/bin/env node

/**
 * Analyze cabin motorcycle manufacturer websites
 * Run this to understand website structures before scraping
 */

const WebsiteAnalyzer = require('./shared/website-analyzer');
const fs = require('fs').promises;
const path = require('path');

const MANUFACTURER_SITES = {
  peraves: [
    'https://www.peravescz.com',
    'https://www.peravescz.com/models/',
    'https://en.wikipedia.org/wiki/Peraves',
    'https://en.wikipedia.org/wiki/Ecomobile'
  ],
  bmw: [
    'https://en.wikipedia.org/wiki/BMW_C1',
    'https://www.bmw-motorrad.com',
    'https://web.archive.org/web/*/https://www.bmw-motorrad.com/en/models/c1/*'
  ],
  honda: [
    'https://www.honda.co.jp/GYRO/',
    'https://ja.wikipedia.org/wiki/ホンダ・ジャイロ',
    'https://www.honda.co.jp/news/2024/',
    'https://global.honda/innovation/technology/motorcycle/'
  ],
  litMotors: [
    'https://litmotors.com',
    'https://en.wikipedia.org/wiki/Lit_Motors',
    'https://www.crunchbase.com/organization/lit-motors'
  ]
};

async function analyzeAllSites() {
  console.log('🚀 Starting Website Structure Analysis for Cabin Motorcycles');
  console.log('=' * 80);
  
  const analyzer = new WebsiteAnalyzer({
    debugDir: './debug/analysis',
    saveHTML: true
  });

  const results = {
    timestamp: new Date().toISOString(),
    manufacturers: {}
  };

  for (const [manufacturer, urls] of Object.entries(MANUFACTURER_SITES)) {
    console.log(`\n📋 Analyzing ${manufacturer.toUpperCase()} websites...`);
    results.manufacturers[manufacturer] = {
      sites: []
    };

    for (const url of urls) {
      try {
        console.log(`\n🔗 Analyzing: ${url}`);
        
        // Skip archive.org URL pattern
        if (url.includes('web.archive.org/web/*')) {
          console.log('⏭️  Skipping wildcard archive URL');
          continue;
        }

        const analysis = await analyzer.analyze(url, {
          followLinks: manufacturer === 'peraves' // Only follow links for main manufacturer
        });

        results.manufacturers[manufacturer].sites.push({
          url,
          success: !analysis.error,
          hasStructuredData: analysis.dataFormats?.hasStructuredData || false,
          recommendationCount: analysis.recommendations?.length || 0,
          topRecommendation: analysis.recommendations?.[0] || null,
          modelPatternsFound: analysis.pageStructure?.textPatterns?.models?.length || 0,
          containerPatternsFound: analysis.pageStructure?.containerPatterns?.length || 0
        });

        // Show quick summary
        console.log(`✅ Analysis complete:`);
        console.log(`   - Structured data: ${analysis.dataFormats?.hasStructuredData ? 'YES' : 'NO'}`);
        console.log(`   - Model patterns: ${analysis.pageStructure?.textPatterns?.models?.length || 0}`);
        console.log(`   - Recommendations: ${analysis.recommendations?.length || 0}`);

        if (analysis.recommendations && analysis.recommendations.length > 0) {
          console.log(`   - Top recommendation: ${analysis.recommendations[0].message}`);
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Failed to analyze ${url}:`, error.message);
        results.manufacturers[manufacturer].sites.push({
          url,
          success: false,
          error: error.message
        });
      }
    }
  }

  // Save summary report
  await saveSummaryReport(results);
  
  console.log('\n✨ Analysis complete! Check debug/analysis/ for detailed reports.');
}

async function saveSummaryReport(results) {
  const summaryPath = './debug/analysis/ANALYSIS_SUMMARY.md';
  
  let report = `# Cabin Motorcycles Website Analysis Summary\n\n`;
  report += `**Generated:** ${results.timestamp}\n\n`;

  for (const [manufacturer, data] of Object.entries(results.manufacturers)) {
    report += `## ${manufacturer.toUpperCase()}\n\n`;
    
    for (const site of data.sites) {
      report += `### ${site.url}\n`;
      if (site.success) {
        report += `- ✅ Analysis successful\n`;
        report += `- Structured data: ${site.hasStructuredData ? '✅ YES' : '❌ NO'}\n`;
        report += `- Model patterns found: ${site.modelPatternsFound}\n`;
        report += `- Container patterns: ${site.containerPatternsFound}\n`;
        report += `- Recommendations: ${site.recommendationCount}\n`;
        if (site.topRecommendation) {
          report += `- Top strategy: ${site.topRecommendation.message}\n`;
        }
      } else {
        report += `- ❌ Analysis failed: ${site.error}\n`;
      }
      report += `\n`;
    }
  }

  report += `## 🎯 Scraping Strategy Recommendations\n\n`;
  report += `Based on the analysis, here are the recommended approaches:\n\n`;
  
  // Generate strategy based on results
  for (const [manufacturer, data] of Object.entries(results.manufacturers)) {
    const successfulSites = data.sites.filter(s => s.success);
    const hasStructuredData = successfulSites.some(s => s.hasStructuredData);
    const hasModelPatterns = successfulSites.some(s => s.modelPatternsFound > 0);
    
    report += `### ${manufacturer}\n`;
    if (hasStructuredData) {
      report += `- 🎯 Primary: Use structured data extraction\n`;
    }
    if (hasModelPatterns) {
      report += `- 🎯 Secondary: Pattern matching for model names\n`;
    }
    if (successfulSites.some(s => s.containerPatternsFound > 0)) {
      report += `- 🎯 Fallback: Container-based extraction\n`;
    }
    report += `\n`;
  }

  await fs.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.writeFile(summaryPath, report, 'utf8');
  console.log(`\n📊 Summary report saved to: ${summaryPath}`);
}

// Run if called directly
if (require.main === module) {
  analyzeAllSites().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { analyzeAllSites };