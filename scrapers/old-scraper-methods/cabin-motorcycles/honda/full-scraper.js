/**
 * Honda Gyro Full Scraper
 * Combines Honda Japan website, motorcycle databases, and historical data
 */

const { scrapeHondaJapan } = require('./honda-japan-scraper');
const { scrapeHondaDatabases } = require('./motorcycle-db-scraper');
const fs = require('fs').promises;
const path = require('path');

class HondaFullScraper {
  constructor(options = {}) {
    this.options = {
      useJapanSite: options.useJapanSite !== false,
      useDatabases: options.useDatabases !== false,
      debug: options.debug || false,
      ...options
    };
  }

  /**
   * Perform comprehensive Honda Gyro scraping
   */
  async scrape() {
    console.log('\n🏍️  Starting Comprehensive Honda Gyro Scraping');
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
      // 1. Scrape Honda Japan official website
      if (this.options.useJapanSite) {
        console.log('\n📍 Phase 1: Honda Japan Official Website');
        console.log('-'.repeat(40));
        
        try {
          const japanResults = await scrapeHondaJapan({ debug: this.options.debug });
          if (japanResults.models && japanResults.models.length > 0) {
            results.models.push(...japanResults.models);
            results.sources.push({
              name: 'Honda Japan',
              count: japanResults.models.length,
              language: 'Japanese',
              urls: japanResults.sources.map(s => s.url)
            });
            results.metadata.methods_used.push('honda_japan');
            console.log(`✅ Found ${japanResults.models.length} models from Honda Japan`);
          }
        } catch (error) {
          console.error('Honda Japan scraping error:', error.message);
          results.errors.push({ source: 'honda_japan', error: error.message });
        }
      }

      // 2. Scrape Motorcycle Databases
      if (this.options.useDatabases) {
        console.log('\n📍 Phase 2: Motorcycle Specification Databases');
        console.log('-'.repeat(40));
        
        try {
          const dbResults = await scrapeHondaDatabases({ debug: this.options.debug });
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

      // 3. No historical data generation - only real scraped data
      // Removed: generateHistorical option and generateHistoricalModels method
      // We only return what we actually find on websites

      // 4. Consolidate and enhance results
      console.log('\n📍 Phase 4: Data Consolidation & Enhancement');
      console.log('-'.repeat(40));
      
      results.models = this.consolidateModels(results.models);
      results.models = this.enhanceModels(results.models);
      
      // Calculate metadata
      results.metadata.confidence_score = this.calculateConfidence(results);
      results.metadata.completeness_score = this.calculateCompleteness(results.models);
      results.metadata.model_distribution = this.getModelDistribution(results.models);

      // Return empty results if no data found - this is correct behavior
      if (results.models.length === 0) {
        console.log('ℹ️  No models found from any source.');
        console.log('ℹ️  This may indicate website changes or connectivity issues.');
        results.metadata.data_found = false;
      }

      // Final metadata
      results.metadata.end_time = new Date().toISOString();
      results.metadata.total_unique_models = results.models.length;
      results.metadata.production_years = this.getProductionYears(results.models);

      // Save comprehensive report
      if (this.options.debug) {
        await this.saveFullReport(results);
      }

      console.log('\n' + '='.repeat(60));
      console.log(`✅ Honda Gyro scraping complete!`);
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

  // REMOVED: generateHistoricalModels method
  // This method was generating fake data for years 1990-present
  // We only return real data that we actually scrape from websites

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
        // Merge data
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
        
        // Prefer specific data from certain sources
        if (!existing.year && model.year) {
          existing.year = model.year;
        }
        
        if (!existing.package && model.package) {
          existing.package = model.package;
        }
      }
    });

    // Convert back to array
    return Array.from(consolidated.values()).map(model => {
      // Remove duplicate sources
      model.sources = [...new Set(model.sources)];
      
      // Add validation
      model.validation = {
        source_count: model.sources.length,
        has_year: !!model.year,
        has_package: !!model.package,
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
      // Determine model generation
      if (model.package) {
        if (model.package.includes('TA02')) {
          model.generation = 'First Generation (2-stroke)';
          model.production_period = '1990-2008';
        } else if (model.package.includes('TA03')) {
          model.generation = 'Second Generation (4-stroke)';
          model.production_period = '2008-present';
        } else if (model.package.includes('EF14')) {
          model.generation = 'Electric';
          model.production_period = '2021-present';
        }
      }

      // Add market context
      model.market_context = {
        primary_use: 'Commercial delivery',
        key_users: ['Japan Post', 'Pizza delivery', 'Courier services'],
        market: 'Japan domestic'
      };

      // Calculate data quality
      model.data_quality = this.calculateDataQuality(model);

      // Add historical significance
      if (model.year === 1990) {
        model.historical_note = 'First year of Gyro Canopy production';
      } else if (model.year === 2008) {
        model.historical_note = 'Transition to 4-stroke engine';
      } else if (model.year === 2021 && model.model.includes('e:')) {
        model.historical_note = 'Introduction of electric version';
      }

      return model;
    });
  }

  /**
   * Get model key for deduplication
   */
  getModelKey(model) {
    const modelName = model.model || 'Gyro Canopy';
    const package_ = model.package || 'unknown';
    const year = model.year || 'unknown';
    return `${modelName}-${package_}-${year}`;
  }

  /**
   * Get model source identifier
   */
  getModelSource(model) {
    if (model.specifications?.source) {
      return model.specifications.source;
    }
    return 'unknown';
  }

  /**
   * Calculate data quality score
   */
  calculateDataQuality(model) {
    let score = 0;
    const factors = [];

    // Multiple sources
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

    // Has package/model code
    if (model.package) {
      score += 20;
      factors.push('model code identified');
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

    // From official source
    if (model.specifications?.source?.includes('honda')) {
      score += 10;
      factors.push('official source');
    }

    return {
      score: Math.min(score, 100),
      factors
    };
  }

  /**
   * Get model distribution
   */
  getModelDistribution(models) {
    const distribution = {
      by_generation: {},
      by_year: {},
      by_source: {}
    };

    models.forEach(model => {
      // By generation
      const gen = model.generation || 'Unknown';
      distribution.by_generation[gen] = (distribution.by_generation[gen] || 0) + 1;

      // By year
      if (model.year) {
        const decade = Math.floor(model.year / 10) * 10;
        const decadeKey = `${decade}s`;
        distribution.by_year[decadeKey] = (distribution.by_year[decadeKey] || 0) + 1;
      }

      // By source
      if (model.sources) {
        model.sources.forEach(source => {
          distribution.by_source[source] = (distribution.by_source[source] || 0) + 1;
        });
      }
    });

    return distribution;
  }

  /**
   * Get production years
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
   * Calculate confidence score
   */
  calculateConfidence(results) {
    let score = 0;

    // Models found
    if (results.models.length > 0) score += 20;
    if (results.models.length >= 10) score += 20;
    if (results.models.length >= 30) score += 10;

    // Multiple sources used
    const methodCount = results.metadata.methods_used.length;
    if (methodCount >= 3) score += 30;
    else if (methodCount === 2) score += 20;
    else if (methodCount === 1) score += 10;

    // Model validation
    const validatedModels = results.models.filter(m => m.validation && m.validation.source_count > 1);
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
      if (model.package) score += 25;
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
    const reportPath = path.join(reportDir, 'honda-gyro-full-report.json');
    const csvPath = path.join(reportDir, 'honda-gyro-models.csv');
    
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
        distribution: results.metadata.model_distribution,
        quality_distribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        }
      };

      // Analyze quality
      results.models.forEach(model => {
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
        'Make', 'Model', 'Package', 'Year', 'Generation', 
        'Engine Type', 'Sources', 'Data Quality', 'Specifications Count'
      ];
      const rows = [headers.join(',')];

      models.forEach(model => {
        const row = [
          'Honda',
          model.model || 'Gyro Canopy',
          model.package || '',
          model.year || '',
          model.generation || '',
          model.specifications?.engine_type || '',
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
async function scrapeHondaFull(options = {}) {
  const scraper = new HondaFullScraper(options);
  return await scraper.scrape();
}

module.exports = {
  HondaFullScraper,
  scrapeHondaFull
};