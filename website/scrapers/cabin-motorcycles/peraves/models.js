// Peraves model definitions and specifications

const { CATEGORIES, CABIN_FEATURES } = require('../shared/constants');

const PERAVES_MODELS = {
  ECOMOBILE: {
    make: 'Peraves',
    model: 'Ecomobile',
    yearStart: 1984,
    yearEnd: 2005,
    category: 'cabin',
    subcategory: CATEGORIES.FULLY_ENCLOSED,
    productionNumbers: 91,
    variants: [
      {
        package: 'R100',
        engine: 'BMW R100',
        displacement: 980,
        power: '60 hp',
        years: [1984, 1990]
      },
      {
        package: 'K100',
        engine: 'BMW K100',
        displacement: 987,
        power: '90 hp',
        years: [1991, 2005]
      }
    ],
    specifications: {
      dimensions: {
        length: 3650, // mm
        width: 1250,
        height: 1520,
        wheelbase: 2100,
        seat_height: 600
      },
      weight: {
        curb: 485, // kg
        gross: 650
      },
      performance: {
        top_speed: 200, // km/h
        fuel_consumption: '3.6-4.4 L/100km'
      },
      features: [
        CABIN_FEATURES.FULL_ENCLOSURE,
        CABIN_FEATURES.SUPPORT_WHEELS,
        CABIN_FEATURES.TANDEM_SEATING,
        CABIN_FEATURES.SAFETY_BELTS
      ],
      capacity: {
        passengers: 2,
        fuel: 45 // liters
      }
    }
  },
  
  MONOTRACER: {
    make: 'Peraves',
    model: 'MonoTracer',
    yearStart: 2005,
    yearEnd: 2019,
    category: 'cabin',
    subcategory: CATEGORIES.FULLY_ENCLOSED,
    productionNumbers: 150,
    variants: [
      {
        package: 'K1200RS',
        engine: 'BMW K1200RS',
        displacement: 1157,
        power: '130 hp',
        torque: '117 Nm',
        years: [2005, 2019]
      },
      {
        package: 'K1200RS Turbo',
        engine: 'BMW K1200RS Turbocharged',
        displacement: 1157,
        power: '190 hp',
        years: [2008, 2015]
      }
    ],
    specifications: {
      dimensions: {
        length: 3650,
        width: 1250,
        height: 1520,
        wheelbase: 2100,
        seat_height: 600
      },
      weight: {
        curb: 520,
        gross: 700
      },
      performance: {
        top_speed: 240,
        acceleration_0_100: 5.5, // seconds
        fuel_consumption: '4.7 L/100km'
      },
      features: [
        CABIN_FEATURES.FULL_ENCLOSURE,
        CABIN_FEATURES.SUPPORT_WHEELS,
        CABIN_FEATURES.TANDEM_SEATING,
        CABIN_FEATURES.SAFETY_BELTS,
        CABIN_FEATURES.HEATING
      ],
      capacity: {
        passengers: 2,
        fuel: 52,
        luggage: 150 // liters
      }
    }
  },
  
  E_TRACER: {
    make: 'Peraves',
    model: 'E-Tracer',
    yearStart: 2010,
    yearEnd: null, // Still in production
    category: 'cabin',
    subcategory: CATEGORIES.FULLY_ENCLOSED,
    variants: [
      {
        package: 'MTE-150',
        engine: 'AC Propulsion Electric',
        power: '150 kW (201 hp)',
        torque: '320 Nm',
        battery: '8.1 kWh Li-ion'
      }
    ],
    specifications: {
      dimensions: {
        length: 3650,
        width: 1250,
        height: 1520
      },
      weight: {
        curb: 565
      },
      performance: {
        top_speed: 240,
        acceleration_0_100: 3.8,
        range: 350, // km
        efficiency: '200+ MPGe'
      },
      features: [
        CABIN_FEATURES.FULL_ENCLOSURE,
        CABIN_FEATURES.SUPPORT_WHEELS,
        CABIN_FEATURES.TANDEM_SEATING,
        CABIN_FEATURES.SAFETY_BELTS,
        CABIN_FEATURES.AIR_CONDITIONING
      ],
      awards: ['X-Prize Winner 2010']
    }
  },
  
  MONORACER_130E: {
    make: 'Peraves',
    model: 'MonoRacer-130-E',
    yearStart: 2020,
    yearEnd: null,
    category: 'cabin',
    subcategory: CATEGORIES.FULLY_ENCLOSED,
    specifications: {
      dimensions: {
        length: 3650,
        width: 1250,
        height: 1520,
        seat_height: 600 // "2 feet" from website
      },
      performance: {
        top_speed: 240,
        range: 400 // km
      },
      features: [
        CABIN_FEATURES.FULL_ENCLOSURE,
        CABIN_FEATURES.SUPPORT_WHEELS,
        CABIN_FEATURES.TANDEM_SEATING,
        CABIN_FEATURES.SAFETY_BELTS,
        'High-quality speakers',
        'Multipoint safety belt'
      ],
      capacity: {
        passengers: 2
      },
      certifications: ['EC-Certificate of Conformity']
    }
  },
  
  MONORACER_K12: {
    make: 'Peraves',
    model: 'MonoRacer-K12',
    yearStart: 2012,
    yearEnd: 2016,
    category: 'cabin',
    subcategory: CATEGORIES.FULLY_ENCLOSED,
    discontinued: true,
    specifications: {
      engine: 'BMW K-series',
      note: 'Petrol version discontinued by end of 2016'
    }
  }
};

// Helper function to generate model data for specific years
function generateModelData(modelKey, year, variant = null) {
  const model = PERAVES_MODELS[modelKey];
  if (!model) return null;
  
  // Check if year is within production range
  if (year < model.yearStart || (model.yearEnd && year > model.yearEnd)) {
    return null;
  }
  
  // Find appropriate variant for the year
  let selectedVariant = null;
  if (variant) {
    selectedVariant = model.variants?.find(v => v.package === variant);
  } else if (model.variants) {
    selectedVariant = model.variants.find(v => 
      (!v.years || (year >= v.years[0] && year <= v.years[1]))
    );
  }
  
  return {
    year,
    make: model.make,
    model: model.model,
    package: selectedVariant?.package || null,
    category: model.category,
    specifications: {
      ...model.specifications,
      ...(selectedVariant && {
        engine: {
          type: selectedVariant.engine,
          displacement: selectedVariant.displacement,
          power: selectedVariant.power,
          torque: selectedVariant.torque,
          battery: selectedVariant.battery
        }
      }),
      production: {
        total_units: model.productionNumbers,
        year_start: model.yearStart,
        year_end: model.yearEnd,
        status: model.discontinued ? 'discontinued' : 'active'
      }
    }
  };
}

module.exports = {
  PERAVES_MODELS,
  generateModelData
};