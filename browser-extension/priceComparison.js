/**
 * Price Comparison Engine
 * Compares prices and features across scraped classified ads
 */

class PriceComparison {
  constructor() {
    this.similarityThreshold = 0.7; // Minimum similarity to consider items comparable
  }

  // Parse price string to number
  parsePrice(priceStr) {
    if (!priceStr) return null;
    
    const cleanPrice = priceStr.replace(/[^\d.,]/g, '');
    const numPrice = parseFloat(cleanPrice.replace(/,/g, ''));
    
    return isNaN(numPrice) ? null : numPrice;
  }

  // Calculate text similarity using Levenshtein distance
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    const matrix = [];
    const len1 = s1.length;
    const len2 = s2.length;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    
    return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
  }

  // Extract key features from title and description
  extractFeatures(ad) {
    const text = `${ad.title || ''} ${ad.description || ''}`.toLowerCase();
    const features = {
      brand: '',
      model: '',
      year: null,
      keywords: []
    };

    // Common brand patterns
    const brandPatterns = {
      bikes: ['trek', 'specialized', 'giant', 'cannondale', 'scott', 'santa cruz', 'bianchi', 'cervelo'],
      cars: ['toyota', 'honda', 'ford', 'chevrolet', 'bmw', 'mercedes', 'audi', 'volkswagen'],
      electronics: ['apple', 'samsung', 'sony', 'lg', 'dell', 'hp', 'lenovo', 'asus']
    };

    // Find brand
    for (const category in brandPatterns) {
      for (const brand of brandPatterns[category]) {
        if (text.includes(brand)) {
          features.brand = brand;
          break;
        }
      }
      if (features.brand) break;
    }

    // Extract year (4-digit number between 1900-2030)
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      if (year >= 1900 && year <= 2030) {
        features.year = year;
      }
    }

    // Extract important keywords
    const importantWords = text.match(/\b\w{3,}\b/g) || [];
    features.keywords = importantWords
      .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'very', 'good', 'great'].includes(word))
      .slice(0, 10);

    return features;
  }

  // Find similar ads based on title, category, and features
  findSimilarAds(targetAd, allAds, maxResults = 10) {
    const targetFeatures = this.extractFeatures(targetAd);
    const similarities = [];

    for (const ad of allAds) {
      if (ad.id === targetAd.id) continue; // Skip self
      
      let similarity = 0;
      const adFeatures = this.extractFeatures(ad);

      // Category match (high weight)
      if (ad.category === targetAd.category) {
        similarity += 0.3;
      }

      // Brand match (high weight)
      if (targetFeatures.brand && adFeatures.brand === targetFeatures.brand) {
        similarity += 0.25;
      }

      // Year proximity (if both have years)
      if (targetFeatures.year && adFeatures.year) {
        const yearDiff = Math.abs(targetFeatures.year - adFeatures.year);
        const yearSimilarity = Math.max(0, (5 - yearDiff) / 5);
        similarity += yearSimilarity * 0.15;
      }

      // Title similarity
      const titleSim = this.calculateSimilarity(targetAd.title, ad.title);
      similarity += titleSim * 0.3;

      // Keyword overlap
      const keywordOverlap = this.calculateKeywordOverlap(targetFeatures.keywords, adFeatures.keywords);
      similarity += keywordOverlap * 0.2;

      if (similarity >= this.similarityThreshold) {
        similarities.push({
          ad: ad,
          similarity: similarity,
          features: adFeatures
        });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  // Calculate keyword overlap ratio
  calculateKeywordOverlap(keywords1, keywords2) {
    if (!keywords1.length || !keywords2.length) return 0;
    
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    return intersection.size / Math.max(set1.size, set2.size);
  }

  // Generate comparison report for an ad
  generateComparisonReport(targetAd, allAds) {
    const similarAds = this.findSimilarAds(targetAd, allAds);
    const targetPrice = this.parsePrice(targetAd.price);
    
    const report = {
      targetAd: {
        title: targetAd.title,
        price: targetAd.price,
        priceNumeric: targetPrice,
        url: targetAd.url,
        domain: targetAd.domain
      },
      similarAds: [],
      priceAnalysis: {
        averagePrice: null,
        medianPrice: null,
        minPrice: null,
        maxPrice: null,
        pricePosition: null, // 'below', 'average', 'above'
        potentialSavings: null,
        deals: [] // Ads with significantly better prices
      },
      recommendations: []
    };

    // Process similar ads
    const validPrices = [];
    
    for (const similar of similarAds) {
      const price = this.parsePrice(similar.ad.price);
      if (price !== null) {
        validPrices.push(price);
      }
      
      report.similarAds.push({
        title: similar.ad.title,
        price: similar.ad.price,
        priceNumeric: price,
        url: similar.ad.url,
        domain: similar.ad.domain,
        similarity: Math.round(similar.similarity * 100),
        priceDifference: targetPrice && price ? price - targetPrice : null
      });
    }

    // Calculate price statistics
    if (validPrices.length > 0 && targetPrice !== null) {
      validPrices.sort((a, b) => a - b);
      
      report.priceAnalysis.averagePrice = validPrices.reduce((a, b) => a + b) / validPrices.length;
      report.priceAnalysis.medianPrice = validPrices[Math.floor(validPrices.length / 2)];
      report.priceAnalysis.minPrice = validPrices[0];
      report.priceAnalysis.maxPrice = validPrices[validPrices.length - 1];
      
      // Determine price position
      const avgPrice = report.priceAnalysis.averagePrice;
      if (targetPrice < avgPrice * 0.9) {
        report.priceAnalysis.pricePosition = 'below';
      } else if (targetPrice > avgPrice * 1.1) {
        report.priceAnalysis.pricePosition = 'above';
      } else {
        report.priceAnalysis.pricePosition = 'average';
      }
      
      // Calculate potential savings
      report.priceAnalysis.potentialSavings = Math.max(0, targetPrice - report.priceAnalysis.minPrice);
      
      // Find deals (significantly cheaper similar items)
      report.priceAnalysis.deals = report.similarAds
        .filter(ad => ad.priceNumeric && ad.priceNumeric < targetPrice * 0.8)
        .sort((a, b) => a.priceNumeric - b.priceNumeric);
    }

    // Generate recommendations
    this.generateRecommendations(report);
    
    return report;
  }

  // Generate personalized recommendations
  generateRecommendations(report) {
    const recommendations = [];
    
    if (report.priceAnalysis.pricePosition === 'above') {
      recommendations.push({
        type: 'price_warning',
        message: `This item is priced ${Math.round((report.targetAd.priceNumeric / report.priceAnalysis.averagePrice - 1) * 100)}% above average market price.`,
        priority: 'high'
      });
    }
    
    if (report.priceAnalysis.deals.length > 0) {
      recommendations.push({
        type: 'better_deal',
        message: `Found ${report.priceAnalysis.deals.length} similar items with better prices. Potential savings: $${Math.round(report.priceAnalysis.potentialSavings)}.`,
        priority: 'high',
        deals: report.priceAnalysis.deals.slice(0, 3)
      });
    }
    
    if (report.priceAnalysis.pricePosition === 'below') {
      recommendations.push({
        type: 'good_deal',
        message: `This appears to be a good deal - priced below market average!`,
        priority: 'medium'
      });
    }
    
    if (report.similarAds.length < 3) {
      recommendations.push({
        type: 'limited_data',
        message: `Limited comparable items found. Consider expanding search or checking other platforms.`,
        priority: 'low'
      });
    }
    
    report.recommendations = recommendations;
  }

  // Generate market analysis for multiple ads
  generateMarketAnalysis(ads, category = null) {
    const filteredAds = category ? ads.filter(ad => ad.category === category) : ads;
    const prices = filteredAds.map(ad => this.parsePrice(ad.price)).filter(p => p !== null);
    
    if (prices.length === 0) {
      return { error: 'No valid prices found for analysis' };
    }
    
    prices.sort((a, b) => a - b);
    
    const analysis = {
      category: category || 'All Categories',
      totalAds: filteredAds.length,
      adsWithPrices: prices.length,
      priceStatistics: {
        min: prices[0],
        max: prices[prices.length - 1],
        average: prices.reduce((a, b) => a + b) / prices.length,
        median: prices[Math.floor(prices.length / 2)],
        standardDeviation: this.calculateStandardDeviation(prices)
      },
      priceDistribution: this.calculatePriceDistribution(prices),
      topDeals: this.findTopDeals(filteredAds),
      platformComparison: this.comparePlatforms(filteredAds)
    };
    
    return analysis;
  }

  // Calculate standard deviation
  calculateStandardDeviation(prices) {
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  // Calculate price distribution in ranges
  calculatePriceDistribution(prices) {
    const min = prices[0];
    const max = prices[prices.length - 1];
    const range = max - min;
    const bucketSize = range / 5;
    
    const distribution = [];
    
    for (let i = 0; i < 5; i++) {
      const bucketMin = min + (i * bucketSize);
      const bucketMax = min + ((i + 1) * bucketSize);
      const count = prices.filter(p => p >= bucketMin && p < bucketMax).length;
      
      distribution.push({
        range: `$${Math.round(bucketMin)} - $${Math.round(bucketMax)}`,
        count: count,
        percentage: Math.round((count / prices.length) * 100)
      });
    }
    
    return distribution;
  }

  // Find top deals (best price-to-similarity ratio)
  findTopDeals(ads) {
    const adsWithPrices = ads.filter(ad => this.parsePrice(ad.price) !== null);
    
    return adsWithPrices
      .sort((a, b) => this.parsePrice(a.price) - this.parsePrice(b.price))
      .slice(0, 5)
      .map(ad => ({
        title: ad.title,
        price: ad.price,
        url: ad.url,
        domain: ad.domain
      }));
  }

  // Compare prices across different platforms
  comparePlatforms(ads) {
    const platforms = {};
    
    ads.forEach(ad => {
      const price = this.parsePrice(ad.price);
      if (price !== null) {
        if (!platforms[ad.domain]) {
          platforms[ad.domain] = {
            count: 0,
            prices: [],
            averagePrice: 0
          };
        }
        platforms[ad.domain].count++;
        platforms[ad.domain].prices.push(price);
      }
    });
    
    // Calculate averages
    for (const domain in platforms) {
      const prices = platforms[domain].prices;
      platforms[domain].averagePrice = prices.reduce((a, b) => a + b) / prices.length;
    }
    
    return platforms;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = { PriceComparison };
}

// Make globally available
window.PriceComparison = PriceComparison;