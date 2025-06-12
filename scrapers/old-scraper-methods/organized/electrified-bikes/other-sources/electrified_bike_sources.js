// Comprehensive data sources for electrified bikes
// Includes manufacturers, retailers, review sites, and forums

export const electrifiedBikeSources = {
  // Primary manufacturers
  manufacturers: [
    // Off-road electric bikes
    {
      name: 'Sur-Ron',
      category: 'off-road',
      urls: [
        'https://sur-ronusa.com/collections/all',
        'https://sur-ron.com/products/',
        'https://www.sur-ronmoto.com/bikes'
      ],
      models: ['Light Bee', 'Storm Bee', 'Ultra Bee']
    },
    {
      name: 'Talaria',
      category: 'off-road',
      urls: [
        'https://talaria.bike/pages/bikes',
        'https://www.talaria-sting.com/models',
        'https://talariabikes.com/collections/bikes'
      ],
      models: ['Sting', 'Sting R', 'XXX', 'Dragon']
    },
    {
      name: 'Segway',
      category: 'multi',
      urls: [
        'https://powersports.segway.com/off-road/',
        'https://store.segway.com/dirt-ebike',
        'https://www.segway.com/products/powersports'
      ],
      models: ['X160', 'X260', 'Villain SX10', 'Fugleman UT10']
    },
    {
      name: 'Zero Motorcycles',
      category: 'street-legal',
      urls: [
        'https://www.zeromotorcycles.com/model',
        'https://www.zeromotorcycles.com/motorcycles',
        'https://www.zeromotorcycles.com/range'
      ],
      models: ['SR/F', 'SR/S', 'S', 'DS', 'DSR', 'FX', 'FXE', 'FXS']
    },
    {
      name: 'Cake',
      category: 'premium',
      urls: [
        'https://ridecake.com/models',
        'https://ridecake.com/en-US/models',
        'https://ridecake.com/work'
      ],
      models: ['Kalk OR', 'Kalk INK', 'Osa+', 'Makka']
    },
    {
      name: 'Stealth Electric Bikes',
      category: 'high-power',
      urls: [
        'https://www.stealthelectricbikes.com/product-category/electric-bikes/',
        'https://stealthelectricbikes.com/bikes/'
      ],
      models: ['B-52', 'H-52', 'F-37', 'P-7']
    },
    {
      name: 'Onyx Motorbikes',
      category: 'moped-style',
      urls: [
        'https://onyxmotorbikes.com/collections/bikes',
        'https://onyxmotorbikes.com/collections/rcr'
      ],
      models: ['RCR', 'CTY2', 'CTY']
    },
    {
      name: 'Monday Motorbikes',
      category: 'urban',
      urls: [
        'https://mondaymotorbikes.com/collections/bikes',
        'https://mondaymotorbikes.com/collections/all'
      ],
      models: ['Presidio', 'Gateway', 'Anza']
    },
    {
      name: 'Super73',
      category: 'moped-style',
      urls: [
        'https://super73.com/collections/bikes',
        'https://super73.com/collections/s-series',
        'https://super73.com/collections/r-series'
      ],
      models: ['S2', 'RX', 'ZX', 'S1', 'R', 'K1D']
    },
    {
      name: 'Ariel Rider',
      category: 'dual-sport',
      urls: [
        'https://arielrider.com/collections/electric-bikes',
        'https://arielrider.com/collections/dual-motor-ebikes'
      ],
      models: ['Grizzly', 'X-Class', 'Kepler', 'D-Class']
    },
    {
      name: 'Juiced Bikes',
      category: 'commuter',
      urls: [
        'https://www.juicedbikes.com/collections/e-bikes',
        'https://www.juicedbikes.com/collections/all'
      ],
      models: ['Scorpion', 'HyperScorpion', 'RipRacer', 'CrossCurrent']
    },
    {
      name: 'Luna Cycle',
      category: 'custom',
      urls: [
        'https://lunacycle.com/electric-bikes/',
        'https://lunacycle.com/luna-cycles-sur-ron/'
      ],
      models: ['Sur-Ron X', 'Apollo', 'Eclipse', 'Z1 Enduro']
    },
    {
      name: 'Huck Cycles',
      category: 'high-power',
      urls: [
        'https://huckcycles.com/collections/bikes',
        'https://huckcycles.com/products'
      ],
      models: ['Stinger', 'Rebel', 'Assault']
    },
    {
      name: 'Delfast',
      category: 'long-range',
      urls: [
        'https://delfastbikes.com/bikes/',
        'https://us.delfastbikes.com/collections/bikes'
      ],
      models: ['Top 3.0', 'Top 3.0i', 'Offroad', 'Prime']
    },
    {
      name: 'CAB Motorworks',
      category: 'custom',
      urls: [
        'https://www.cabmotorworks.com/recon',
        'https://www.cabmotorworks.com/eagle'
      ],
      models: ['Recon', 'Eagle', 'Falcon']
    },
    {
      name: 'Vintage Electric',
      category: 'retro',
      urls: [
        'https://vintageelectricbikes.com/collections/bikes',
        'https://vintageelectricbikes.com/collections/all'
      ],
      models: ['Tracker', 'Scrambler', 'Roadster', 'Cafe']
    },
    {
      name: 'Michael Blast',
      category: 'affordable',
      urls: [
        'https://michaelblast.com/collections/e-bikes',
        'https://michaelblast.com/collections/all'
      ],
      models: ['Outsider', 'Villain', 'Greaser', 'Vacay']
    },
    {
      name: 'Biktrix',
      category: 'high-power',
      urls: [
        'https://www.biktrix.com/collections/ebikes',
        'https://www.biktrix.com/collections/ultra-ebikes'
      ],
      models: ['Juggernaut Ultra Beast', 'Monte Capro Ultra', 'Swift Ultra']
    },
    {
      name: 'Electric Motion',
      category: 'trials',
      urls: [
        'https://www.electric-motion.fr/en/models',
        'https://em-usa.com/models/'
      ],
      models: ['Escape', 'Epure', 'eTrial']
    },
    {
      name: 'Kollter',
      category: 'street',
      urls: [
        'https://kollterusa.com/electric-motorcycles/',
        'https://kollter.es/en/models/'
      ],
      models: ['ES1', 'RS1', 'Tinbot']
    }
  ],

  // Chinese manufacturers
  chineseManufacturers: [
    {
      name: 'Ristretto',
      urls: ['https://www.alibaba.com/product-detail/Ristretto-electric-bike_1600123456789.html'],
      models: ['512', '303', '250']
    },
    {
      name: 'E Ride Pro',
      urls: ['https://eridepro.com'],
      models: ['SR', 'SR-72', 'SR-48']
    },
    {
      name: 'Czem',
      urls: ['https://www.czem-ebike.com'],
      models: ['Tiger', 'Leopard']
    },
    {
      name: 'Torp',
      urls: ['https://www.torpbike.com'],
      models: ['TC-Max', 'TC-Pro']
    }
  ],

  // Retailers with multiple brands
  retailers: [
    {
      name: 'Luna Cycle',
      url: 'https://lunacycle.com/electric-bikes/',
      brands: ['Sur-Ron', 'Talaria', 'Luna']
    },
    {
      name: 'Grin Technologies',
      url: 'https://ebikes.ca/shop/electric-bicycles.html',
      brands: ['Various DIY']
    },
    {
      name: 'Alien Rides',
      url: 'https://alienrides.com/collections/electric-bikes',
      brands: ['Sur-Ron', 'Talaria', 'Segway']
    },
    {
      name: 'Bikes Xpress',
      url: 'https://bikes-xpress.com/collections/electric-bikes',
      brands: ['Sur-Ron', 'Talaria']
    },
    {
      name: 'Charged Cycle Works',
      url: 'https://www.chargedcycleworks.com/collections/bikes',
      brands: ['Sur-Ron', 'Talaria', 'Segway']
    }
  ],

  // Review and news sites
  reviewSites: [
    {
      name: 'Electric Bike Report',
      url: 'https://electricbikereport.com/',
      sections: ['/electric-bikes/', '/electric-motorcycle-reviews/']
    },
    {
      name: 'Electrek',
      url: 'https://electrek.co/',
      sections: ['/guides/electric-motorcycles/', '/guides/electric-bikes/']
    },
    {
      name: 'Electric Bike Review',
      url: 'https://electricbikereview.com/',
      sections: ['/electric-bikes/', '/brand/']
    },
    {
      name: 'InsideEVs',
      url: 'https://insideevs.com/',
      sections: ['/features/motorcycles/', '/news/motorcycles/']
    }
  ],

  // Forums and communities
  forums: [
    {
      name: 'Endless Sphere',
      url: 'https://endless-sphere.com/forums/',
      sections: ['ebikes', 'emotorcycles']
    },
    {
      name: 'Electric Bike Forums',
      url: 'https://www.electricbikeforum.com/',
      sections: ['electric-motorcycles', 'high-power-ebikes']
    },
    {
      name: 'Reddit',
      urls: [
        'https://www.reddit.com/r/Surron/',
        'https://www.reddit.com/r/ElectricScooters/',
        'https://www.reddit.com/r/ebikes/'
      ]
    }
  ],

  // Spec extraction patterns
  specPatterns: {
    motor: [
      /(\d+(?:\.\d+)?)\s*(?:k)?W(?:att)?(?:\s*peak)?/i,
      /Motor[\s:]+(\d+(?:\.\d+)?)\s*(?:k)?W/i,
      /Peak Power[\s:]+(\d+(?:\.\d+)?)\s*(?:k)?W/i,
      /Nominal Power[\s:]+(\d+(?:\.\d+)?)\s*(?:k)?W/i
    ],
    battery: [
      /(\d+(?:\.\d+)?)\s*V\s*(\d+(?:\.\d+)?)\s*Ah/i,
      /Battery[\s:]+(\d+(?:\.\d+)?V\s*\d+(?:\.\d+)?Ah)/i,
      /(\d+(?:\.\d+)?)\s*kWh/i,
      /(\d+(?:\.\d+)?)\s*Wh/i
    ],
    topSpeed: [
      /Top Speed[\s:]+(\d+)\s*mph/i,
      /Max Speed[\s:]+(\d+)\s*mph/i,
      /(\d+)\s*mph\s*top speed/i,
      /Speed[\s:]+(\d+)\s*mph/i
    ],
    range: [
      /Range[\s:]+(\d+)\s*miles?/i,
      /(\d+)\s*miles?\s*range/i,
      /Up to\s*(\d+)\s*miles?/i,
      /(\d+)\s*miles?\s*per charge/i
    ],
    weight: [
      /Weight[\s:]+(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i,
      /(\d+(?:\.\d+)?)\s*kg/i,
      /Weighs?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)/i,
      /(\d+(?:\.\d+)?)\s*(?:lbs?|kg)\s*weight/i
    ],
    price: [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
      /USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /MSRP[\s:]+\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /Price[\s:]+\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i
    ]
  },

  // Model year patterns
  yearPatterns: {
    explicit: [
      /20\d{2}\s+model/i,
      /model\s+year\s+20\d{2}/i,
      /\(20\d{2}\)/
    ],
    inUrl: [
      /20\d{2}/,
      /\d{4}$/
    ]
  }
};

// Helper function to categorize bikes
export function categorizeBike(specs, name = '') {
  const motorPower = parseInt(specs.motor) || 0;
  const topSpeed = parseInt(specs.topSpeed) || 0;
  const nameLower = name.toLowerCase();

  // Category by power
  if (motorPower >= 5000) return 'high-performance';
  if (motorPower >= 3000) return 'performance';
  if (motorPower >= 1500) return 'mid-power';
  if (motorPower >= 750) return 'legal-ebike';

  // Category by speed
  if (topSpeed >= 50) return 'high-performance';
  if (topSpeed >= 35) return 'performance';
  if (topSpeed >= 28) return 'class-3-ebike';
  if (topSpeed >= 20) return 'class-2-ebike';

  // Category by model name
  if (nameLower.includes('storm') || nameLower.includes('xxx')) return 'high-performance';
  if (nameLower.includes('sting') || nameLower.includes('ultra')) return 'performance';
  if (nameLower.includes('light') || nameLower.includes('x160')) return 'entry-level';

  return 'standard';
}

// Helper function to extract year from text
export function extractYear(text) {
  const yearMatch = text.match(/20\d{2}/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    if (year >= 2015 && year <= 2025) {
      return year;
    }
  }
  return null;
}

export default electrifiedBikeSources;