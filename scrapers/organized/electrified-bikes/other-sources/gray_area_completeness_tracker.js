// Gray Area E-Bike Database Completeness Tracker
// Defines target sources and metrics to determine when the database is complete

const completenessTracker = {
  // PRIMARY SOURCE TARGETS
  targetSources: {
    // Major E-Bike Publications & Blogs
    publications: [
      {
        name: "Electric Bike Review",
        url: "https://electricbikereview.com",
        categories: ["reviews", "high-speed", "moped-style"],
        priority: "high",
        scraped: false,
        brandsFound: []
      },
      {
        name: "Electrek",
        url: "https://electrek.co/guides/electric-bicycle/",
        categories: ["news", "reviews"],
        priority: "high", 
        scraped: false,
        brandsFound: []
      },
      {
        name: "ElectricBike.com",
        url: "https://electricbike.com",
        categories: ["industry", "components", "builds"],
        priority: "high",
        scraped: false,
        brandsFound: []
      },
      {
        name: "eBike Tips",
        url: "https://ebiketips.road.cc",
        categories: ["reviews", "buying guides"],
        priority: "medium",
        scraped: false,
        brandsFound: []
      },
      {
        name: "Bike Radar Electric",
        url: "https://www.bikeradar.com/advice/buyers-guides/best-electric-bikes/",
        priority: "medium",
        scraped: false,
        brandsFound: []
      }
    ],

    // Major E-Commerce Sites
    ecommerce: [
      {
        name: "Luna Cycle",
        url: "https://lunacycle.com",
        categories: ["high-power", "custom-builds"],
        priority: "high",
        scraped: false,
        brandsFound: []
      },
      {
        name: "EM3ev",
        url: "https://em3ev.com",
        categories: ["batteries", "high-power-builds"],
        priority: "high", 
        scraped: false,
        brandsFound: []
      },
      {
        name: "Electric Bike Company",
        url: "https://electricbikecompany.com",
        priority: "medium",
        scraped: false,
        brandsFound: []
      },
      {
        name: "Grin Technologies",
        url: "https://ebikes.ca",
        categories: ["technical", "components"],
        priority: "high",
        scraped: false,
        brandsFound: []
      },
      {
        name: "Alien Rides", 
        url: "https://alienrides.com",
        categories: ["high-power", "sur-ron"],
        priority: "medium",
        scraped: false,
        brandsFound: []
      }
    ],

    // Forums & Communities
    forums: [
      {
        name: "Endless Sphere",
        url: "https://endless-sphere.com/forums/",
        sections: ["f=28", "f=2", "f=3"],
        priority: "high",
        scraped: false,
        brandsFound: []
      },
      {
        name: "Reddit r/ebikes",
        url: "https://reddit.com/r/ebikes",
        priority: "high",
        scraped: false,
        brandsFound: []
      },
      {
        name: "Reddit r/Surron",
        url: "https://reddit.com/r/Surron", 
        priority: "high",
        scraped: false,
        brandsFound: []
      },
      {
        name: "Reddit r/Super73",
        url: "https://reddit.com/r/Super73",
        priority: "medium",
        scraped: false,
        brandsFound: []
      },
      {
        name: "Electric Bike Forum",
        url: "https://electricbikeforum.com",
        priority: "medium",
        scraped: false,
        brandsFound: []
      }
    ],

    // Manufacturer Direct Sites
    manufacturers: [
      "sur-ronusa.com", "talaria.bike", "super73.com", "onyxmotorbikes.com",
      "mondaymotorbikes.com", "arielrider.com", "juicedbikes.com", 
      "ridecake.com", "stealthelectricbikes.com", "wattwagons.com",
      "biktrix.com", "freybike.com", "delfast.com", "vintageelectricbikes.com"
    ]
  },

  // COMPLETION CRITERIA
  completionCriteria: {
    sourcesCovered: {
      target: 25, // Number of sources that must be scraped
      current: 0,
      highPriority: 15, // High priority sources required
      mediumPriority: 10
    },
    
    brandsCovered: {
      // Minimum brands that must be documented per category
      offRoadDirt: { target: 20, current: 0 }, // Sur-Ron, Talaria style
      urbanCommuter: { target: 15, current: 0 }, // Super73, Ariel Rider style  
      highPowerScooters: { target: 10, current: 0 }, // Standing scooters >1000W
      customBuilders: { target: 8, current: 0 }, // Luna Cycle, EM3ev style
      motorcycleStyle: { target: 12, current: 0 }, // Onyx, Cake style
      chineseBrands: { target: 25, current: 0 }, // Alibaba, direct import
      europeanBrands: { target: 10, current: 0 } // VanMoof, Cake, etc
    },

    geographicCoverage: {
      // Must have brands from these regions
      required: ["USA", "China", "Europe", "Asia-Pacific"],
      current: [],
      target: 4
    },

    priceRangeCoverage: {
      // Must cover these price segments
      budget: { range: "$500-2000", target: 10, current: 0 },
      midRange: { range: "$2000-5000", target: 15, current: 0 },
      premium: { range: "$5000-10000", target: 10, current: 0 },
      luxury: { range: "$10000+", target: 5, current: 0 }
    },

    powerRangeCoverage: {
      // Must cover these power segments
      moderate: { range: "750W-1500W", target: 20, current: 0 },
      high: { range: "1500W-5000W", target: 25, current: 0 },
      extreme: { range: "5000W+", target: 15, current: 0 }
    }
  },

  // QUALITY METRICS
  qualityMetrics: {
    dataCompleteness: {
      // Percentage of brands with complete data
      basicInfo: { target: 95, current: 0 }, // Name, country, website
      pricing: { target: 80, current: 0 }, // Price ranges
      specs: { target: 85, current: 0 }, // Motor, battery, speed, weight
      availability: { target: 70, current: 0 }, // In stock, pre-order, etc
      components: { target: 60, current: 0 } // Suspension, brakes, etc
    },
    
    dataFreshness: {
      // Recency of data updates
      target: "< 30 days old",
      lastUpdated: null
    }
  },

  // VERIFICATION METHODS
  verificationMethods: [
    {
      method: "Cross-reference multiple sources",
      description: "Each brand must appear in at least 2 independent sources"
    },
    {
      method: "Manufacturer website verification", 
      description: "Verify specs against official manufacturer data"
    },
    {
      method: "Community validation",
      description: "Check against enthusiast forums for real-world data"
    },
    {
      method: "Retailer price validation",
      description: "Confirm pricing through multiple retailers"
    }
  ]
};

// PROGRESS TRACKING FUNCTIONS
function calculateCompletionPercentage() {
  const criteria = completenessTracker.completionCriteria;
  let totalTargets = 0;
  let totalAchieved = 0;

  // Sources coverage
  totalTargets += criteria.sourcesCovered.target;
  totalAchieved += criteria.sourcesCovered.current;

  // Brand categories
  Object.values(criteria.brandsCovered).forEach(category => {
    totalTargets += category.target;
    totalAchieved += category.current;
  });

  // Geographic coverage
  totalTargets += criteria.geographicCoverage.target;
  totalAchieved += criteria.geographicCoverage.current.length;

  // Price ranges
  Object.values(criteria.priceRangeCoverage).forEach(range => {
    totalTargets += range.target;
    totalAchieved += range.current;
  });

  // Power ranges  
  Object.values(criteria.powerRangeCoverage).forEach(range => {
    totalTargets += range.target;
    totalAchieved += range.current;
  });

  return Math.round((totalAchieved / totalTargets) * 100);
}

function getNextPrioritySources() {
  const sources = completenessTracker.targetSources;
  const unscraped = [];
  
  ['publications', 'ecommerce', 'forums'].forEach(category => {
    sources[category].forEach(source => {
      if (!source.scraped) {
        unscraped.push({
          name: source.name,
          url: source.url,
          category: category,
          priority: source.priority
        });
      }
    });
  });

  // Sort by priority (high first)
  return unscraped.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    return 0;
  });
}

function identifyDataGaps() {
  const gaps = [];
  const criteria = completenessTracker.completionCriteria;

  // Check brand category gaps
  Object.entries(criteria.brandsCovered).forEach(([category, data]) => {
    if (data.current < data.target) {
      gaps.push({
        type: 'brand_category',
        category: category,
        needed: data.target - data.current,
        priority: 'high'
      });
    }
  });

  // Check geographic gaps
  const missingRegions = criteria.geographicCoverage.required.filter(
    region => !criteria.geographicCoverage.current.includes(region)
  );
  if (missingRegions.length > 0) {
    gaps.push({
      type: 'geographic',
      missing: missingRegions,
      priority: 'medium'
    });
  }

  return gaps;
}

function generateCompletionReport() {
  return {
    overallCompletion: calculateCompletionPercentage(),
    nextActions: getNextPrioritySources().slice(0, 5),
    dataGaps: identifyDataGaps(),
    lastUpdated: new Date().toISOString()
  };
}

module.exports = {
  completenessTracker,
  calculateCompletionPercentage,
  getNextPrioritySources,
  identifyDataGaps,
  generateCompletionReport
};