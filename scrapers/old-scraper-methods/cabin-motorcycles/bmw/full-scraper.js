/**
 * BMW C1 Full Scraper
 * Combines multiple sources: Wikipedia, Archive.org, and motorcycle databases
 */

const { scrapeBMWArchive } = require('./archive-scraper');
const { scrapeBMWDatabases } = require('./motorcycle-db-scraper');
const { scrapeWikipedia } = require('./scraper');
const fs = require('fs').promises;
const path = require('path');

class BMWFullScraper {
  constructor(options = {}) {
    this.options = {
      useArchive: options.useArchive !== false,
      useDatabases: options.useDatabases !== false,
      useWikipedia: options.useWikipedia !== false,
      debug: options.debug || false,
      ...options
    };
  }

  /**
   * Perform comprehensive BMW C1 scraping
   */
  async scrape() {
    console.log('\n🚗 Starting Comprehensive BMW C1 Scraping');
    console.log('=' .repeat(60));
    
    const results = {
      models: [],
      sources: [],
      errors: [],
      metadata: {
        start_time: new Date().toISOString(),
        scraper_version: '2.0',
        methods_used: []
      }
    };

    try {
      // 1. Scrape Wikipedia
      if (this.options.useWikipedia) {
        console.log('\n📍 Phase 1: Wikipedia Scraping');
        console.log('-'.repeat(40));
        
        try {
          const wikiModels = await scrapeWikipedia();
          if (wikiModels.length > 0) {
            results.models.push(...wikiModels);
            results.sources.push({
              name: 'Wikipedia',
              count: wikiModels.length,
              languages: ['en', 'de']
            });
            results.metadata.methods_used.push('wikipedia');
            console.log(`✅ Found ${wikiModels.length} models from Wikipedia`);
          }
        } catch (error) {
          console.error('Wikipedia scraping error:', error.message);
          results.errors.push({ source: 'wikipedia', error: error.message });
        }
      }

      // 2. Scrape Archive.org
      if (this.options.useArchive) {
        console.log('\n📍 Phase 2: Archive.org Historical Data');
        console.log('-'.repeat(40));
        
        try {
          const archiveResults = await scrapeBMWArchive({ debug: this.options.debug });
          if (archiveResults.models && archiveResults.models.length > 0) {
            results.models.push(...archiveResults.models);
            results.sources.push({
              name: 'Archive.org',
              count: archiveResults.models.length,
              snapshots_analyzed: archiveResults.snapshots.length
            });
            results.metadata.methods_used.push('archive.org');
            console.log(`✅ Found ${archiveResults.models.length} models from Archive.org`);
          }
        } catch (error) {
          console.error('Archive.org scraping error:', error.message);
          results.errors.push({ source: 'archive.org', error: error.message });
        }
      }

      // 3. Scrape Motorcycle Databases
      if (this.options.useDatabases) {
        console.log('\n📍 Phase 3: Motorcycle Specification Databases');
        console.log('-'.repeat(40));
        
        try {
          const dbResults = await scrapeBMWDatabases({ debug: this.options.debug });
          if (dbResults.models && dbResults.models.length > 0) {
            results.models.push(...dbResults.models);
            results.sources.push({
              name: 'Motorcycle Databases',
              count: dbResults.models.length,
              databases: dbResults.sources.map(s => s.name)
            });
            results.metadata.methods_used.push('motorcycle_databases');
            console.log(`✅ Found ${dbResults.models.length} models from databases`);
          }
        } catch (error) {
          console.error('Database scraping error:', error.message);
          results.errors.push({ source: 'databases', error: error.message });
        }
      }

      // 4. Consolidate and enhance results
      console.log('\n📍 Phase 4: Data Consolidation & Enhancement');
      console.log('-'.repeat(40));
      
      results.models = this.consolidateModels(results.models);
      results.models = this.enhanceModels(results.models);
      
      // Calculate confidence scores
      results.metadata.confidence_score = this.calculateConfidence(results);
      results.metadata.completeness_score = this.calculateCompleteness(results.models);

      // Final metadata
      results.metadata.end_time = new Date().toISOString();
      results.metadata.total_unique_models = results.models.length;
      results.metadata.production_years = this.getProductionYears(results.models);

      // Save comprehensive report
      if (this.options.debug) {
        await this.saveFullReport(results);
      }

      console.log('\n' + '='.repeat(60));
      console.log(`✅ BMW C1 scraping complete!`);
      console.log(`📊 Total unique models: ${results.models.length}`);
      console.log(`🎯 Confidence score: ${results.metadata.confidence_score.toFixed(2)}%`);
      console.log(`📈 Completeness: ${results.metadata.completeness_score.toFixed(2)}%`);

    } catch (error) {
      console.error('\n❌ Full scraping error:', error);
      results.errors.push({
        stage: 'full_scraping',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Consolidate models from multiple sources
   */
  consolidateModels(models) {
    const consolidated = new Map();
    
    models.forEach(model => {
      const key = this.getModelKey(model);
      
      if (!consolidated.has(key)) {
        consolidated.set(key, {
          ...model,
          sources: [this.getModelSource(model)]
        });
      } else {
        // Merge data from multiple sources
        const existing = consolidated.get(key);
        
        // Add source
        existing.sources.push(this.getModelSource(model));
        
        // Merge specifications
        if (model.specifications) {
          existing.specifications = {
            ...existing.specifications,
            ...model.specifications
          };
        }
        
        // Prefer specific fields from certain sources
        if (!existing.year && model.year) {
          existing.year = model.year;
        }
        
        if (!existing.variant && model.variant) {
          existing.variant = model.variant;
        }
      }
    });

    // Convert back to array
    return Array.from(consolidated.values()).map(model => {
      // Remove duplicate sources
      model.sources = [...new Set(model.sources)];
      
      // Add validation score
      model.validation = {
        source_count: model.sources.length,
        has_year: !!model.year,
        has_variant: !!model.variant,
        has_specs: Object.keys(model.specifications || {}).length > 3
      };
      
      return model;
    });
  }

  /**
   * Enhance models with additional data
   */
  enhanceModels(models) {
    return models.map(model => {
      // Standardize variant names
      if (model.variant) {
        model.variant_display = this.getVariantDisplayName(model.variant);
      }

      // TODO: Remove hardcoded displacement mapping after DOM Scout
      // Displacement should be scraped from sources, not assumed
      if (!model.specifications.displacement_cc && model.variant) {
        console.warn('⚠️ Displacement data should come from scraped sources');
      }

      // Add production period
      if (model.year) {
        model.production_period = this.getProductionPeriod(model.year, model.variant);
      }

      // Calculate data quality score
      model.data_quality = this.calculateDataQuality(model);

      // Add historical context
      model.historical_context = this.getHistoricalContext(model);

      return model;
    });
  }

  /**
   * Get model key for deduplication
   */
  getModelKey(model) {
    const variant = model.variant || model.package || 'standard';
    const year = model.year || 'unknown';
    return `c1-${variant}-${year}`;
  }

  /**
   * Get model source identifier
   */
  getModelSource(model) {
    if (model.specifications?.source) {
      return model.specifications.source;
    }
    if (model.specifications?.url) {
      const url = model.specifications.url;
      if (url.includes('wikipedia')) return 'wikipedia';
      if (url.includes('archive.org')) return 'archive.org';
      if (url.includes('motorcyclespecs')) return 'motorcyclespecs.co.za';
      if (url.includes('bikez')) return 'bikez.com';
      if (url.includes('cyclechaos')) return 'cyclechaos.com';
    }
    return 'unknown';
  }

  /**
   * Get variant display name
   * NOTE: This should be replaced with data from DOM Scout
   */
  getVariantDisplayName(variant) {
    // TODO: Remove hardcoded mapping after DOM Scout analysis
    console.warn('⚠️ Using variant display name without DOM Scout data');
    return variant ? `C1 ${variant}` : 'C1';
  }

  /**
   * Get production period for model
   * NOTE: This should be discovered through DOM Scout, not hardcoded
   */
  getProductionPeriod(year, variant) {
    // TODO: Remove all hardcoded production data after DOM Scout analysis
    console.warn('⚠️ Using production period without DOM Scout data');
    return {
      note: 'Production period data should come from scraped sources'
    };
  }

  /**
   * Calculate data quality score
   */
  calculateDataQuality(model) {
    let score = 0;
    const factors = [];

    // Multiple sources (very important)
    if (model.sources && model.sources.length > 1) {
      score += 30;
      factors.push(`${model.sources.length} sources`);
    } else {
      score += 10;
      factors.push('single source');
    }

    // Has year
    if (model.year) {
      score += 20;
      factors.push('year confirmed');
    }

    // Has variant
    if (model.variant) {
      score += 15;
      factors.push('variant identified');
    }

    // Specifications count
    const specCount = Object.keys(model.specifications || {}).length;
    if (specCount > 10) {
      score += 20;
      factors.push('detailed specs');
    } else if (specCount > 5) {
      score += 10;
      factors.push('basic specs');
    }

    // Has technical data
    if (model.specifications?.displacement_cc || model.specifications?.power) {
      score += 15;
      factors.push('technical data');
    }

    return {
      score: Math.min(score, 100),
      factors
    };
  }

  /**
   * Get historical context
   * NOTE: This should be extracted from scraped sources, not hardcoded
   */
  getHistoricalContext(model) {
    // TODO: Replace with actual historical data from DOM Scout sources
    console.warn('⚠️ Historical context should come from scraped sources');
    return {
      note: 'Historical context should be scraped from Wikipedia or other sources'
    };
  }

  /**
   * Get production years from models
   */
  getProductionYears(models) {
    const years = new Set();
    models.forEach(model => {
      if (model.year) {
        years.add(model.year);
      }
    });
    return Array.from(years).sort();
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(results) {
    let score = 0;

    // Models found
    if (results.models.length > 0) score += 20;
    if (results.models.length >= 5) score += 20;
    if (results.models.length >= 10) score += 10;

    // Multiple sources used
    if (results.metadata.methods_used.length === 3) score += 30;
    else if (results.metadata.methods_used.length === 2) score += 20;
    else if (results.metadata.methods_used.length === 1) score += 10;

    // Model validation
    const validatedModels = results.models.filter(m => m.validation.source_count > 1);
    if (validatedModels.length > results.models.length / 2) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Calculate completeness score
   */
  calculateCompleteness(models) {
    if (models.length === 0) return 0;

    const scores = models.map(model => {
      let score = 0;
      
      if (model.year) score += 25;
      if (model.variant) score += 25;
      if (model.specifications && Object.keys(model.specifications).length > 5) score += 25;
      if (model.sources && model.sources.length > 1) score += 25;
      
      return score;
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Save comprehensive report
   */
  async saveFullReport(results) {
    const reportDir = path.join(__dirname, '..', 'debug', 'reports');
    const reportPath = path.join(reportDir, 'bmw-c1-full-report.json');
    const csvPath = path.join(reportDir, 'bmw-c1-models.csv');
    
    try {
      await fs.mkdir(reportDir, { recursive: true });
      
      // Create summary
      const summary = {
        timestamp: new Date().toISOString(),
        total_models: results.models.length,
        sources_used: results.sources,
        methods: results.metadata.methods_used,
        confidence: results.metadata.confidence_score,
        completeness: results.metadata.completeness_score,
        variants_found: {},
        year_distribution: {},
        quality_distribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        }
      };

      // Analyze models
      results.models.forEach(model => {
        // Variant distribution
        const variant = model.variant_display || 'Standard';
        summary.variants_found[variant] = (summary.variants_found[variant] || 0) + 1;

        // Year distribution
        if (model.year) {
          summary.year_distribution[model.year] = (summary.year_distribution[model.year] || 0) + 1;
        }

        // Quality distribution
        const quality = model.data_quality?.score || 0;
        if (quality >= 80) summary.quality_distribution.excellent++;
        else if (quality >= 60) summary.quality_distribution.good++;
        else if (quality >= 40) summary.quality_distribution.fair++;
        else summary.quality_distribution.poor++;
      });

      // Save full report
      const fullReport = {
        summary,
        results,
        models_detailed: results.models
      };

      await fs.writeFile(reportPath, JSON.stringify(fullReport, null, 2));
      console.log(`\n📄 Full report saved to: ${reportPath}`);

      // Save CSV
      await this.saveCSVReport(results.models, csvPath);

    } catch (error) {
      console.error('Error saving report:', error.message);
    }
  }

  /**
   * Save CSV report
   */
  async saveCSVReport(models, csvPath) {
    try {
      const headers = [
        'Make', 'Model', 'Variant', 'Year', 'Displacement', 
        'Power', 'Sources', 'Data Quality', 'Specifications Count'
      ];
      const rows = [headers.join(',')];

      models.forEach(model => {
        const row = [
          'BMW',
          'C1',
          model.variant_display || model.variant || '',
          model.year || '',
          model.specifications?.displacement_cc || model.specifications?.displacement || '',
          model.specifications?.power || model.specifications?.horsepower || '',
          model.sources ? model.sources.join(';') : '',
          model.data_quality?.score ? `${model.data_quality.score}%` : '',
          Object.keys(model.specifications || {}).length
        ];
        rows.push(row.map(cell => `"${cell}"`).join(','));
      });

      await fs.writeFile(csvPath, rows.join('\n'));
      console.log(`📄 CSV report saved to: ${csvPath}`);

    } catch (error) {
      console.error('Error saving CSV:', error.message);
    }
  }
}

// Export convenient function
async function scrapeBMWFull(options = {}) {
  const scraper = new BMWFullScraper(options);
  return await scraper.scrape();
}

module.exports = {
  BMWFullScraper,
  scrapeBMWFull
};