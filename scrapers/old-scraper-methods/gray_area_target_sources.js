// Gray Area E-Bike Target Sources Research
// Comprehensive list of sources to scrape for complete coverage

const targetSources = {
  // CONSUMER PUBLICATIONS & BLOGS
  consumerPublications: [
    {
      name: "Electric Bike Review",
      url: "https://electricbikereview.com",
      focus: "Reviews, high-speed category",
      priority: "critical"
    },
    {
      name: "Electrek", 
      url: "https://electrek.co",
      focus: "EV news, e-bike coverage",
      priority: "critical"
    },
    {
      name: "ElectricBike.com",
      url: "https://electricbike.com", 
      focus: "Technical, industry focus",
      priority: "high"
    },
    {
      name: "eBike Tips",
      url: "https://ebiketips.road.cc",
      focus: "UK/European perspective",
      priority: "high"
    },
    {
      name: "BikeRadar Electric",
      url: "https://www.bikeradar.com/electric-bikes/",
      focus: "Mainstream cycling publication",
      priority: "medium"
    },
    {
      name: "Cycling Electric",
      url: "https://cyclingelectric.co.uk",
      focus: "UK market",
      priority: "medium"
    },
    {
      name: "E-Bike Tips & Reviews",
      url: "https://www.ebikereview.com",
      focus: "Consumer reviews",
      priority: "medium"
    }
  ],

  // FORUMS & COMMUNITIES
  forums: [
    {
      name: "Endless Sphere",
      url: "https://endless-sphere.com/forums/",
      focus: "Technical DIY community",
      priority: "critical",
      sections: ["General Discussion", "Technical", "Kits"]
    },
    {
      name: "Reddit r/ebikes",
      url: "https://reddit.com/r/ebikes",
      focus: "General e-bike community",
      priority: "critical"
    },
    {
      name: "Reddit r/Surron", 
      url: "https://reddit.com/r/Surron",
      focus: "Sur-Ron specific",
      priority: "high"
    },
    {
      name: "Reddit r/Super73",
      url: "https://reddit.com/r/Super73", 
      focus: "Super73 specific",
      priority: "medium"
    },
    {
      name: "Electric Bike Forum",
      url: "https://electricbikeforum.com",
      focus: "General e-bike discussions",
      priority: "high"
    },
    {
      name: "Sur-Ron Forum",
      url: "https://sur-ronforum.com",
      focus: "Sur-Ron community",
      priority: "high"
    },
    {
      name: "Facebook Groups",
      urls: [
        "High Power E-Bikes",
        "Sur-Ron Owners",
        "Talaria Owners",
        "E-Bike Builders"
      ],
      priority: "medium"
    }
  ],

  // E-COMMERCE & RETAILERS
  retailers: [
    {
      name: "Luna Cycle",
      url: "https://lunacycle.com",
      focus: "High-power builds, components",
      priority: "critical"
    },
    {
      name: "EM3ev",
      url: "https://em3ev.com",
      focus: "Batteries, high-power builds",
      priority: "critical"
    },
    {
      name: "Grin Technologies",
      url: "https://ebikes.ca",
      focus: "Technical components, kits",
      priority: "high"
    },
    {
      name: "Electric Bike Company",
      url: "https://electricbikecompany.com",
      focus: "Consumer e-bikes",
      priority: "medium"
    },
    {
      name: "Alien Rides",
      url: "https://alienrides.com", 
      focus: "Sur-Ron, high-power",
      priority: "high"
    },
    {
      name: "E-Cells",
      url: "https://e-cells.com",
      focus: "High-power e-bikes",
      priority: "medium"
    },
    {
      name: "California eBike",
      url: "https://www.californiaebike.com",
      focus: "High-power conversions",
      priority: "medium"
    },
    {
      name: "Electric Bike Outpost",
      url: "https://electricbikeoutpost.com",
      focus: "Custom builds",
      priority: "medium"
    }
  ],

  // MANUFACTURER DIRECT
  manufacturers: [
    // Primary gray area brands
    "sur-ronusa.com", "sur-ron.com",
    "talaria.bike", 
    "super73.com",
    "onyxmotorbikes.com", 
    "mondaymotorbikes.com",
    "arielrider.com",
    "juicedbikes.com",
    "ridecake.com",
    "stealthelectricbikes.com",
    "wattwagons.com",
    "biktrix.com",
    "freybike.com",
    "delfast.com",
    "vintageelectricbikes.com",
    "michaelblast.com",
    "hi-powercycles.com",
    "ubco.com",
    "kollterusa.com",
    "ryvid.com",
    "damon.com",
    "zeromotorcycles.com",
    "energicamotor.com"
  ],

  // INDUSTRY & TRADE PUBLICATIONS
  industryPublications: [
    {
      name: "Bike Europe",
      url: "https://bike-eu.com",
      focus: "European industry news",
      priority: "high"
    },
    {
      name: "Bicycle Retailer",
      url: "https://bicycleretailer.com",
      focus: "US trade publication",
      priority: "high"
    },
    {
      name: "LEVA (Light Electric Vehicle Association)",
      url: "https://levassociation.com",
      focus: "Industry association",
      priority: "medium"
    },
    {
      name: "Electric Bike Report",
      url: "https://electricbikereport.com",
      focus: "Industry analysis",
      priority: "medium"
    }
  ],

  // YOUTUBE CHANNELS & VIDEO CONTENT
  videoSources: [
    "Electric Bike Review (Court)",
    "Electrified Reviews", 
    "Micah Toll",
    "eBike School",
    "Sur-Ron official",
    "Talaria official"
  ],

  // CHINESE/ALIBABA SOURCES
  chineseSources: [
    {
      name: "Alibaba Electric Bikes",
      url: "https://alibaba.com",
      search: "electric bike 3000W, 5000W, 8000W",
      priority: "high"
    },
    {
      name: "Made-in-China",
      url: "https://made-in-china.com",
      search: "high power electric bike",
      priority: "medium"
    },
    {
      name: "DHgate",
      url: "https://dhgate.com", 
      search: "electric motorcycle bike",
      priority: "medium"
    }
  ],

  // REGIONAL SOURCES
  regionalSources: {
    europe: [
      "pedelecforum.de (German)",
      "cyclisme-mag.com (French)",
      "bikeradar.com (UK)",
      "bike-eu.com (Industry)"
    ],
    asia: [
      "biketo.com (Chinese)",
      "cyclist.today (Southeast Asia)"
    ],
    australia: [
      "bicycles.net.au",
      "mtb-mag.com"
    ]
  }
};

// COVERAGE VALIDATION CRITERIA
const validationCriteria = {
  minimumSources: {
    critical: 5,    // Must scrape all critical sources
    high: 8,        // Must scrape 80% of high priority
    medium: 6       // Must scrape 50% of medium priority
  },
  
  brandValidation: {
    // Each brand should appear in at least 2-3 sources
    minSourcesPerBrand: 2,
    preferredSources: 3
  },
  
  completenessCheck: {
    // When to consider database complete
    sourcesCovered: 19,     // Total sources scraped
    brandsValidated: 90,    // % of brands found in multiple sources
    specsComplete: 85,      // % of brands with full specs
    pricingComplete: 75     // % of brands with pricing
  }
};

// SCRAPING PRIORITY ORDER
const scrapingOrder = [
  // Phase 1: Critical sources
  "electricbikereview.com",
  "endless-sphere.com", 
  "reddit.com/r/ebikes",
  "lunacycle.com",
  "em3ev.com",
  
  // Phase 2: High priority
  "electrek.co",
  "electricbike.com",
  "grin.ca",
  "sur-ronforum.com",
  "alienrides.com",
  
  // Phase 3: Manufacturer direct
  "All manufacturer websites",
  
  // Phase 4: Additional validation
  "Medium priority sources",
  "Regional sources",
  "Chinese sources"
];

module.exports = {
  targetSources,
  validationCriteria, 
  scrapingOrder
};