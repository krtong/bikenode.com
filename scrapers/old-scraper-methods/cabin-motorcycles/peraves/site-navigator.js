/**
 * Peraves Site Navigator
 * Discovers and navigates through site structure to find all model pages
 */

const { fetchPageWithJS, parseHTML, cleanText } = require('../shared/utils');
const AdaptiveScraper = require('../shared/adaptive-scraper');
const path = require('path');
const fs = require('fs').promises;

class PeravesSiteNavigator {
  constructor(options = {}) {
    this.baseUrl = 'https://www.peravescz.com';
    this.visitedUrls = new Set();
    this.discoveredModels = [];
    this.modelUrls = new Set();
    this.maxDepth = options.maxDepth || 3;
    this.adaptiveScraper = new AdaptiveScraper(options);
    this.debug = options.debug || false;
  }

  /**
   * Navigate the entire Peraves website to discover all model pages
   */
  async navigate() {
    console.log('\n🔍 Starting Peraves site navigation...');
    
    const results = {
      models: [],
      urls_discovered: [],
      navigation_map: {},
      errors: [],
      metadata: {
        start_time: new Date().toISOString(),
        base_url: this.baseUrl
      }
    };

    try {
      // 1. Start with homepage and discover navigation structure
      console.log('📍 Analyzing homepage navigation...');
      const navStructure = await this.analyzeNavigation(this.baseUrl);
      results.navigation_map = navStructure;

      // 2. Find model-related pages
      const modelPages = await this.findModelPages(navStructure);
      console.log(`📄 Found ${modelPages.length} potential model pages`);

      // 3. Navigate through each model page
      for (const pageUrl of modelPages) {
        if (this.visitedUrls.has(pageUrl)) continue;
        
        console.log(`\n🔗 Navigating to: ${this.getRelativePath(pageUrl)}`);
        await this.exploreModelPage(pageUrl, results, 0);
        
        // Add delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 4. Also check for linked pages from model pages
      console.log('\n🔍 Checking for additional linked pages...');
      await this.followModelLinks(results);

      // 5. Deduplicate and organize results
      results.models = this.deduplicateModels(this.discoveredModels);
      results.urls_discovered = Array.from(this.visitedUrls);
      
      results.metadata.end_time = new Date().toISOString();
      results.metadata.total_pages_visited = this.visitedUrls.size;
      results.metadata.total_models_found = results.models.length;

      console.log(`\n✅ Navigation complete: ${results.models.length} models found`);
      
      // Save navigation report if debug enabled
      if (this.debug) {
        await this.saveNavigationReport(results);
      }

    } catch (error) {
      console.error('Navigation error:', error);
      results.errors.push({
        stage: 'navigation',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Analyze the navigation structure of a page
   */
  async analyzeNavigation(url) {
    const navigation = {
      url,
      menu_items: [],
      links: [],
      model_links: []
    };

    try {
      const html = await fetchPageWithJS(url);
      const $ = parseHTML(html);

      // Find navigation menus
      const menuSelectors = [
        'nav', '.nav', '#nav',
        '.menu', '#menu', '.navigation',
        '.navbar', 'header nav',
        '[role="navigation"]'
      ];

      menuSelectors.forEach(selector => {
        $(selector).find('a[href]').each((i, link) => {
          const href = $(link).attr('href');
          const text = cleanText($(link).text());
          
          if (href && text) {
            const fullUrl = this.resolveUrl(href, url);
            navigation.menu_items.push({
              text,
              url: fullUrl,
              is_model_related: this.isModelRelated(text, href)
            });
          }
        });
      });

      // Find all links on page
      $('a[href]').each((i, link) => {
        const href = $(link).attr('href');
        const text = cleanText($(link).text());
        
        if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
          const fullUrl = this.resolveUrl(href, url);
          
          // Check if it's internal
          if (fullUrl.includes(this.baseUrl.replace('https://', '').replace('http://', ''))) {
            navigation.links.push({
              text,
              url: fullUrl,
              context: this.getLinkContext($, link)
            });

            // Check if model-related
            if (this.isModelRelated(text, href)) {
              navigation.model_links.push(fullUrl);
            }
          }
        }
      });

    } catch (error) {
      console.error(`Error analyzing navigation for ${url}:`, error.message);
    }

    return navigation;
  }

  /**
   * Find pages likely to contain model information
   */
  async findModelPages(navStructure) {
    const modelPages = new Set();
    
    // Add explicit model links
    navStructure.model_links.forEach(url => modelPages.add(url));

    // Check menu items
    navStructure.menu_items.forEach(item => {
      if (item.is_model_related) {
        modelPages.add(item.url);
      }
    });

    // Look for common model page patterns
    const modelPatterns = [
      /models?/i,
      /products?/i,
      /vehicles?/i,
      /monotracer/i,
      /ecomobile/i,
      /e-tracer/i,
      /monoracer/i,
      /lineup/i,
      /range/i
    ];

    navStructure.links.forEach(link => {
      const matchesPattern = modelPatterns.some(pattern => 
        pattern.test(link.text) || pattern.test(link.url)
      );
      
      if (matchesPattern) {
        modelPages.add(link.url);
      }
    });

    // Always include some key pages
    const keyPages = [
      this.baseUrl,
      `${this.baseUrl}/models`,
      `${this.baseUrl}/products`,
      `${this.baseUrl}/monotracer`,
      `${this.baseUrl}/monoracer`
    ];

    keyPages.forEach(url => modelPages.add(url));

    return Array.from(modelPages);
  }

  /**
   * Explore a model page and extract data
   */
  async exploreModelPage(url, results, depth) {
    if (depth > this.maxDepth || this.visitedUrls.has(url)) {
      return;
    }

    this.visitedUrls.add(url);

    try {
      // Use adaptive scraper to extract data
      const scraped = await this.adaptiveScraper.scrape(url, {
        javascript: true,
        enhance: true
      });

      if (scraped.data && scraped.data.length > 0) {
        console.log(`✅ Found ${scraped.data.length} items on ${this.getRelativePath(url)}`);
        
        // Process and add to discovered models
        scraped.data.forEach(item => {
          if (this.isValidModel(item)) {
            this.discoveredModels.push({
              ...this.normalizeModelData(item),
              source_url: url,
              discovered_at: new Date().toISOString()
            });
          }
        });
      }

      // Look for sub-pages (galleries, specifications, etc.)
      if (depth < this.maxDepth) {
        const subPages = await this.findSubPages(url);
        for (const subPage of subPages) {
          await this.exploreModelPage(subPage, results, depth + 1);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        }
      }

    } catch (error) {
      console.error(`Error exploring ${url}:`, error.message);
      results.errors.push({
        url,
        error: error.message
      });
    }
  }

  /**
   * Find sub-pages from a model page
   */
  async findSubPages(url) {
    const subPages = new Set();

    try {
      const html = await fetchPageWithJS(url);
      const $ = parseHTML(html);

      // Look for links that might be sub-pages
      $('a[href]').each((i, link) => {
        const href = $(link).attr('href');
        const text = cleanText($(link).text());
        
        if (href && !this.visitedUrls.has(href)) {
          const fullUrl = this.resolveUrl(href, url);
          
          // Check if it's a relevant sub-page
          const subPagePatterns = [
            /specification/i,
            /technical/i,
            /gallery/i,
            /photos/i,
            /details/i,
            /features/i,
            /\d{4}/  // Year pages
          ];

          const isSubPage = subPagePatterns.some(pattern => 
            pattern.test(text) || pattern.test(href)
          );

          if (isSubPage && fullUrl.includes(this.baseUrl.replace(/https?:\/\//, ''))) {
            subPages.add(fullUrl);
          }
        }
      });
    } catch (error) {
      console.error(`Error finding sub-pages for ${url}:`, error.message);
    }

    return Array.from(subPages);
  }

  /**
   * Follow links from model pages to discover more
   */
  async followModelLinks(results) {
    const additionalUrls = new Set();

    // Look through discovered models for additional URLs
    this.discoveredModels.forEach(model => {
      if (model.links) {
        model.links.forEach(link => {
          if (!this.visitedUrls.has(link.url) && this.isModelRelated(link.text, link.url)) {
            additionalUrls.add(link.url);
          }
        });
      }
    });

    console.log(`📎 Found ${additionalUrls.size} additional URLs to check`);

    // Visit additional URLs
    for (const url of additionalUrls) {
      await this.exploreModelPage(url, results, 0);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Check if text/URL is model-related
   */
  isModelRelated(text, url) {
    const patterns = [
      /monotracer/i,
      /monoracer/i,
      /ecomobile/i,
      /e-tracer/i,
      /model/i,
      /product/i,
      /vehicle/i,
      /specification/i,
      /MTE-\d+/i,  // Model numbers
      /\d+\s*kW/i,  // Power specs
      /cabin/i
    ];

    return patterns.some(pattern => 
      pattern.test(text) || pattern.test(url)
    );
  }

  /**
   * Check if extracted data represents a valid model
   */
  isValidModel(item) {
    // Must have at least a model name or title
    if (!item.model && !item.title && !item.name) {
      return false;
    }

    // Check if it contains Peraves model keywords
    const modelKeywords = ['monotracer', 'monoracer', 'ecomobile', 'e-tracer', 'peraves'];
    const itemText = JSON.stringify(item).toLowerCase();
    
    return modelKeywords.some(keyword => itemText.includes(keyword));
  }

  /**
   * Normalize model data to standard format
   */
  normalizeModelData(item) {
    const model = {
      make: 'Peraves',
      category: 'cabin',
      specifications: {}
    };

    // Extract model name
    if (item.model) {
      model.model = item.model;
    } else if (item.title) {
      // Try to extract model from title
      const modelMatch = item.title.match(/(MonoTracer|MonoRacer|Ecomobile|E-Tracer)[\s-]*([\w-]*)/i);
      if (modelMatch) {
        model.model = modelMatch[0].trim();
      } else {
        model.model = item.title;
      }
    } else if (item.name) {
      model.model = item.name;
    }

    // Extract year
    if (item.year) {
      model.year = parseInt(item.year);
    }

    // Merge specifications
    if (item.specifications) {
      Object.assign(model.specifications, item.specifications);
    }

    // Add additional metadata
    if (item.images) {
      model.specifications.images = item.images;
    }

    if (item.links) {
      model.specifications.related_links = item.links;
    }

    return model;
  }

  /**
   * Get relative path from URL
   */
  getRelativePath(url) {
    return url.replace(this.baseUrl, '') || '/';
  }

  /**
   * Resolve relative URL to absolute
   */
  resolveUrl(href, baseUrl) {
    if (href.startsWith('http')) {
      return href;
    }
    
    if (href.startsWith('//')) {
      return 'https:' + href;
    }
    
    if (href.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${href}`;
    }
    
    // Relative path
    const base = new URL(baseUrl);
    const basePath = base.pathname.split('/').slice(0, -1).join('/');
    return `${base.protocol}//${base.host}${basePath}/${href}`;
  }

  /**
   * Get context around a link
   */
  getLinkContext($, link) {
    const $link = $(link);
    const parent = $link.parent();
    const context = {
      parent_tag: parent.prop('tagName'),
      parent_class: parent.attr('class'),
      siblings: []
    };

    // Get text of siblings
    parent.children().each((i, child) => {
      if (child !== link) {
        const text = cleanText($(child).text());
        if (text) {
          context.siblings.push(text);
        }
      }
    });

    return context;
  }

  /**
   * Deduplicate discovered models
   */
  deduplicateModels(models) {
    const seen = new Map();
    
    models.forEach(model => {
      const key = `${model.make}-${model.model}-${model.year || 'unknown'}`;
      
      if (!seen.has(key)) {
        seen.set(key, model);
      } else {
        // Merge data from duplicate
        const existing = seen.get(key);
        if (model.specifications) {
          Object.assign(existing.specifications, model.specifications);
        }
        // Keep the URL that provided more data
        if (JSON.stringify(model).length > JSON.stringify(existing).length) {
          seen.set(key, model);
        }
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Save navigation report for debugging
   */
  async saveNavigationReport(results) {
    const reportPath = path.join(__dirname, '..', 'debug', 'navigation', 'peraves-navigation-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
      console.log(`\n📄 Navigation report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Error saving navigation report:', error.message);
    }
  }
}

// Export for use
module.exports = PeravesSiteNavigator;