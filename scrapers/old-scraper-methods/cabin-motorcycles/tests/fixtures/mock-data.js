// Mock data for testing cabin motorcycles

const mockPeravesData = {
  year: 2023,
  make: 'Peraves',
  model: 'MonoTracer MTE-150',
  package: 'Standard',
  category: 'cabin',
  specifications: {
    subcategory: 'fully_enclosed',
    engine: {
      displacement: 650,
      power: '55 hp',
      type: 'parallel twin',
      manufacturer: 'BMW'
    },
    dimensions: {
      length: 3500,
      width: 890,
      height: 1400,
      wheelbase: 2400
    },
    weight: {
      curb: 550,
      gross: 750
    },
    performance: {
      top_speed: 200,
      acceleration_0_100: 5.7,
      range: 400,
      fuel_consumption: 3.5
    },
    cabin_features: [
      'air_conditioning',
      'heating',
      'stereo',
      'airbags',
      'roll_cage',
      'gull_wing_doors'
    ],
    safety_features: [
      'abs',
      'traction_control',
      'stability_control',
      'crumple_zones'
    ],
    price: {
      base: 75000,
      currency: 'EUR'
    }
  }
};

const mockBMWC1Data = {
  year: 2002,
  make: 'BMW',
  model: 'C1',
  package: null,
  category: 'cabin',
  specifications: {
    subcategory: 'semi_enclosed',
    engine: {
      displacement: 125,
      power: '15 hp',
      type: 'single cylinder',
      cooling: 'liquid'
    },
    dimensions: {
      length: 2100,
      width: 790,
      height: 1670,
      wheelbase: 1470
    },
    weight: {
      curb: 185,
      payload: 90
    },
    performance: {
      top_speed: 95,
      acceleration_0_50: 4.9,
      fuel_consumption: 3.0
    },
    cabin_features: [
      'windshield',
      'roof',
      'seatbelt',
      'roll_bar'
    ],
    safety_features: [
      'abs',
      'crumple_zones',
      'safety_cell'
    ]
  }
};

const mockHondaGyroData = {
  year: 2023,
  make: 'Honda',
  model: 'Gyro Canopy',
  package: null,
  category: 'cabin',
  specifications: {
    subcategory: 'semi_enclosed',
    engine: {
      displacement: 125,
      power: '12 hp',
      type: 'single cylinder',
      cooling: 'air'
    },
    dimensions: {
      length: 1895,
      width: 660,
      height: 1690,
      wheelbase: 1310
    },
    weight: {
      curb: 139,
      payload: 90
    },
    performance: {
      top_speed: 60,
      fuel_consumption: 2.0
    },
    cabin_features: [
      'windshield',
      'roof',
      'wiper'
    ],
    unique_features: [
      'tilting_mechanism',
      'three_wheels',
      'delivery_box_compatible'
    ]
  }
};

const mockLitMotorsData = {
  year: 2024,
  make: 'Lit Motors',
  model: 'C-1',
  package: 'Launch Edition',
  category: 'cabin',
  specifications: {
    subcategory: 'fully_enclosed',
    engine: {
      type: 'electric',
      power: '40 kW',
      torque: '100 Nm'
    },
    battery: {
      capacity: 10.4,
      type: 'lithium-ion',
      range: 160,
      charging_time_fast: 2,
      charging_time_standard: 6
    },
    dimensions: {
      length: 2400,
      width: 1000,
      height: 1400,
      wheelbase: 1800
    },
    weight: {
      curb: 360,
      gross: 500
    },
    performance: {
      top_speed: 160,
      acceleration_0_100: 6.0
    },
    cabin_features: [
      'air_conditioning',
      'heating',
      'infotainment_system',
      'smartphone_integration',
      'keyless_entry'
    ],
    unique_features: [
      'gyroscopic_stabilization',
      'self_balancing',
      'drive_by_wire'
    ],
    price: {
      base: 32000,
      currency: 'USD'
    }
  }
};

// Invalid data for testing validation
const invalidMotorcycleData = {
  missingYear: {
    make: 'Test',
    model: 'Model',
    category: 'cabin'
  },
  invalidYear: {
    year: 'twenty-twenty-three',
    make: 'Test',
    model: 'Model',
    category: 'cabin'
  },
  yearTooOld: {
    year: 1800,
    make: 'Test',
    model: 'Model',
    category: 'cabin'
  },
  missingMake: {
    year: 2023,
    model: 'Model',
    category: 'cabin'
  },
  emptyMake: {
    year: 2023,
    make: '',
    model: 'Model',
    category: 'cabin'
  },
  invalidCategory: {
    year: 2023,
    make: 'Test',
    model: 'Model',
    category: 'open'
  },
  invalidSpecs: {
    year: 2023,
    make: 'Test',
    model: 'Model',
    category: 'cabin',
    specifications: {
      engine: {
        displacement: -100
      },
      dimensions: {
        length: 'long'
      },
      performance: {
        top_speed: 700
      }
    }
  }
};

// Scraping log test data
const mockScrapingLogs = [
  {
    scraper_name: 'peraves-scraper',
    manufacturer: 'Peraves',
    models_scraped: 15,
    status: 'success',
    metadata: {
      source: 'https://www.peravescz.com',
      new_models: 3,
      updated_models: 12
    }
  },
  {
    scraper_name: 'bmw-scraper',
    manufacturer: 'BMW',
    models_scraped: 0,
    status: 'failed',
    error_message: 'Connection timeout',
    metadata: {
      retry_count: 3,
      last_error: 'ETIMEDOUT'
    }
  },
  {
    scraper_name: 'honda-scraper',
    manufacturer: 'Honda',
    models_scraped: 8,
    status: 'completed_with_errors',
    error_message: 'Some models could not be parsed',
    metadata: {
      failed_models: ['Gyro X', 'Canopy 2000'],
      partial_success: true
    }
  }
];

// SQL injection test strings
const sqlInjectionStrings = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "admin'--",
  "1; DELETE FROM motorcycles WHERE 1=1; --",
  "' UNION SELECT * FROM passwords; --",
  "Robert'); DROP TABLE Students;--"
];

// XSS test strings
const xssTestStrings = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  'javascript:alert("XSS")',
  '<body onload="alert(\'XSS\')">'
];

module.exports = {
  // Valid motorcycle data
  mockPeravesData,
  mockBMWC1Data,
  mockHondaGyroData,
  mockLitMotorsData,
  
  // Collections
  validMotorcycles: [
    mockPeravesData,
    mockBMWC1Data,
    mockHondaGyroData,
    mockLitMotorsData
  ],
  
  // Invalid data
  invalidMotorcycleData,
  
  // Scraping logs
  mockScrapingLogs,
  
  // Security test strings
  sqlInjectionStrings,
  xssTestStrings,
  
  // Utility functions
  generateMockMotorcycle: (overrides = {}) => ({
    year: 2023,
    make: 'TestMake',
    model: 'TestModel',
    category: 'cabin',
    specifications: {
      engine: { displacement: 500 },
      ...overrides.specifications
    },
    ...overrides
  }),
  
  generateMockScrapingLog: (overrides = {}) => ({
    scraper_name: 'test-scraper',
    manufacturer: 'TestManufacturer',
    models_scraped: 10,
    status: 'success',
    error_message: null,
    metadata: {},
    ...overrides
  })
};