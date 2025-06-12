/**
 * Full Peraves Scraper
 * Combines site navigation with adaptive scraping for comprehensive data extraction
 */

const PeravesSiteNavigator = require('./site-navigator');
const { scrapePeravesAdaptive } = require('./adaptive-scraper');
const fs = require('fs').promises;
const path = require('path');

class PeravesFullScraper {
  constructor(options = {}) {
    this.options = {
      navigate: options.navigate !== false,
      debug: options.debug || false,
      maxDepth: options.maxDepth || 3,
      ...options
    };
  }

  /**
   * Perform full scraping with navigation and adaptive extraction
   */
  async scrape() {
    console.log('\n🚀 Starting Full Peraves Scraping');
    console.log('=' .repeat(60));
    
    const results = {
      models: [],
      sources: [],
      navigation: null,
      errors: [],
      metadata: {
        start_time: new Date().toISOString(),
        scraper_version: '2.0',
        methods_used: []
      }
    };

    try {
      // 1. Navigate site structure to discover all pages
      if (this.options.navigate) {
        console.log('\n📍 Phase 1: Site Navigation');
        console.log('-'.repeat(40));
        
        const navigator = new PeravesSiteNavigator({
          debug: this.options.debug,
          maxDepth: this.options.maxDepth
        });
        
        const navResults = await navigator.navigate();
        results.navigation = navResults;
        results.metadata.methods_used.push('site_navigation');
        
        // Add models discovered through navigation
        if (navResults.models && navResults.models.length > 0) {
          results.models.push(...navResults.models);
          results.sources.push({
            method: 'site_navigation',
            count: navResults.models.length,
            urls_visited: navResults.urls_discovered.length
          });
        }
        
        console.log(`\n✅ Navigation found ${navResults.models.length} models from ${navResults.urls_discovered.length} pages`);
      }

      // 2. Use adaptive scraping on key sources
      console.log('\n📍 Phase 2: Adaptive Scraping');
      console.log('-'.repeat(40));
      
      const adaptiveResults = await scrapePeravesAdaptive();
      results.metadata.methods_used.push('adaptive_scraping');
      
      if (adaptiveResults.models && adaptiveResults.models.length > 0) {
        results.models.push(...adaptiveResults.models);
        results.sources.push({
          method: 'adaptive_scraping',
          count: adaptiveResults.models.length,
          sources_used: adaptiveResults.metadata.sources_succeeded.map(s => s.source)
        });
      }
      
      console.log(`\n✅ Adaptive scraping found ${adaptiveResults.models.length} models`);

      // 3. Combine and deduplicate results
      console.log('\n📍 Phase 3: Data Consolidation');
      console.log('-'.repeat(40));
      
      results.models = this.consolidateModels(results.models);
      
      // 4. Enhance with cross-referencing
      if (results.models.length > 0) {
        results.models = await this.enhanceModels(results.models);
      }

      // Final metadata
      results.metadata.end_time = new Date().toISOString();
      results.metadata.total_unique_models = results.models.length;
      results.metadata.confidence_score = this.calculateConfidence(results);

      // Save comprehensive report
      if (this.options.debug) {
        await this.saveFullReport(results);
      }

      console.log('\n' + '='.repeat(60));
      console.log(`✅ Full scraping complete!`);
      console.log(`📊 Total unique models: ${results.models.length}`);
      console.log(`🎯 Confidence score: ${results.metadata.confidence_score.toFixed(2)}%`);

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
   * Consolidate and deduplicate models from multiple sources
   */
  consolidateModels(models) {
    const consolidated = new Map();
    
    models.forEach(model => {
      const key = this.getModelKey(model);
      
      if (!consolidated.has(key)) {
        consolidated.set(key, {
          ...model,
          sources: [model.source_url || model.specifications?.source || 'unknown']
        });
      } else {
        // Merge data from multiple sources
        const existing = consolidated.get(key);
        
        // Add source
        if (model.source_url || model.specifications?.source) {
          existing.sources.push(model.source_url || model.specifications.source);
        }
        
        // Merge specifications
        if (model.specifications) {
          existing.specifications = {
            ...existing.specifications,
            ...model.specifications
          };
        }
        
        // Prefer year if missing
        if (!existing.year && model.year) {
          existing.year = model.year;
        }
      }
    });

    // Convert back to array and clean up
    return Array.from(consolidated.values()).map(model => {
      // Remove duplicate sources
      model.sources = [...new Set(model.sources)];
      
      // Add data quality indicator
      model.data_quality = {
        source_count: model.sources.length,
        has_year: !!model.year,
        has_specs: Object.keys(model.specifications || {}).length > 2
      };
      
      return model;
    });
  }

  /**
   * Enhance models with additional processing
   */
  async enhanceModels(models) {
    return models.map(model => {
      // Standardize model names
      if (model.model) {
        model.model = this.standardizeModelName(model.model);
      }

      // Add model family
      model.family = this.determineModelFamily(model);

      // Estimate missing years based on model
      if (!model.year && model.family) {
        model.estimated_year_range = this.estimateYearRange(model.family);
      }

      // Calculate completeness score
      model.completeness = this.calculateCompleteness(model);

      return model;
    });
  }

  /**
   * Get unique key for a model
   */
  getModelKey(model) {
    const modelName = this.standardizeModelName(model.model || 'unknown');
    const year = model.year || 'unknown';
    return `${modelName}-${year}`;
  }

  /**
   * Standardize model names
   */
  standardizeModelName(name) {
    return name
      .replace(/\s+/g, ' ')
      .replace(/[-_]+/g, '-')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Determine model family
   */
  determineModelFamily(model) {
    const modelName = (model.model || '').toLowerCase();
    
    if (modelName.includes('ecomobile')) return 'Ecomobile';
    if (modelName.includes('monotracer')) return 'MonoTracer';
    if (modelName.includes('e-tracer')) return 'E-Tracer';
    if (modelName.includes('monoracer')) return 'MonoRacer';
    
    // Check specifications for clues
    const specs = JSON.stringify(model.specifications || {}).toLowerCase();
    if (specs.includes('ecomobile')) return 'Ecomobile';
    if (specs.includes('monotracer')) return 'MonoTracer';
    
    return null;
  }

  /**
   * Estimate year range for model family
   */
  estimateYearRange(family) {
    const ranges = {
      'Ecomobile': { start: 1984, end: 2005 },
      'MonoTracer': { start: 2005, end: 2019 },
      'E-Tracer': { start: 2010, end: 2015 },
      'MonoRacer': { start: 2019, end: new Date().getFullYear() }
    };
    
    return ranges[family] || null;
  }

  /**
   * Calculate model completeness
   */
  calculateCompleteness(model) {
    let score = 0;
    let total = 0;

    // Required fields
    const required = ['make', 'model', 'year', 'category'];
    required.forEach(field => {
      total += 20;
      if (model[field]) score += 20;
    });

    // Specifications
    const specCount = Object.keys(model.specifications || {}).length;
    total += 20;
    if (specCount > 5) score += 20;
    else if (specCount > 2) score += 10;
    else if (specCount > 0) score += 5;

    return (score / total) * 100;
  }

  /**
   * Calculate confidence score for results
   */
  calculateConfidence(results) {
    let score = 0;

    // Models found
    if (results.models.length > 0) score += 30;
    if (results.models.length > 5) score += 20;

    // Multiple sources used
    if (results.metadata.methods_used.length > 1) score += 20;

    // Navigation successful
    if (results.navigation && results.navigation.urls_discovered.length > 5) score += 15;

    // Model completeness
    const avgCompleteness = results.models.reduce((sum, m) => sum + (m.completeness || 0), 0) / (results.models.length || 1);
    score += (avgCompleteness / 100) * 15;

    return Math.min(score, 100);
  }

  /**
   * Save comprehensive report
   */
  async saveFullReport(results) {
    const reportPath = path.join(__dirname, '..', 'debug', 'reports', 'peraves-full-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      
      // Create summary
      const summary = {
        timestamp: new Date().toISOString(),
        total_models: results.models.length,
        methods_used: results.metadata.methods_used,
        confidence_score: results.metadata.confidence_score,
        model_families: {},
        year_distribution: {},
        completeness_distribution: {
          complete: 0,
          partial: 0,
          minimal: 0
        }
      };

      // Analyze models
      results.models.forEach(model => {
        // Family distribution
        if (model.family) {
          summary.model_families[model.family] = (summary.model_families[model.family] || 0) + 1;
        }

        // Year distribution
        if (model.year) {
          summary.year_distribution[model.year] = (summary.year_distribution[model.year] || 0) + 1;
        }

        // Completeness distribution
        if (model.completeness >= 80) summary.completeness_distribution.complete++;
        else if (model.completeness >= 50) summary.completeness_distribution.partial++;
        else summary.completeness_distribution.minimal++;
      });

      // Save full report
      const fullReport = {
        summary,
        results,
        models_detailed: results.models
      };

      await fs.writeFile(reportPath, JSON.stringify(fullReport, null, 2));
      console.log(`\n📄 Full report saved to: ${reportPath}`);

      // Also save a simplified CSV
      await this.saveCSVReport(results.models);

    } catch (error) {
      console.error('Error saving report:', error.message);
    }
  }

  /**
   * Save CSV report for easy viewing
   */
  async saveCSVReport(models) {
    const csvPath = path.join(__dirname, '..', 'debug', 'reports', 'peraves-models.csv');
    
    try {
      // Create CSV header
      const headers = ['Make', 'Model', 'Family', 'Year', 'Sources', 'Completeness', 'Has Specs'];
      const rows = [headers.join(',')];

      // Add model rows
      models.forEach(model => {
        const row = [
          model.make || '',
          model.model || '',
          model.family || '',
          model.year || model.estimated_year_range ? `${model.estimated_year_range.start}-${model.estimated_year_range.end}` : '',
          model.sources ? model.sources.length : 0,
          model.completeness ? `${model.completeness.toFixed(0)}%` : '',
          model.specifications ? Object.keys(model.specifications).length : 0
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
async function scrapePeravesFull(options = {}) {
  const scraper = new PeravesFullScraper(options);
  return await scraper.scrape();
}

module.exports = {
  PeravesFullScraper,
  scrapePeravesFull
};