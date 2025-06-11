// Cabin motorcycle categories and specifications constants

const CATEGORIES = {
  FULLY_ENCLOSED: 'fully_enclosed',
  SEMI_ENCLOSED: 'semi_enclosed',
  STREAMLINER: 'streamliner'
};

const MANUFACTURERS = {
  PERAVES: {
    name: 'Peraves',
    variants: ['PERAVES AG', 'PERAVES CZ'],
    country: 'Switzerland',
    website: 'https://www.peravescz.com/'
  },
  BMW: {
    name: 'BMW',
    variants: ['BMW Motorrad'],
    country: 'Germany'
  },
  HONDA: {
    name: 'Honda',
    variants: [],
    country: 'Japan'
  },
  LIT_MOTORS: {
    name: 'Lit Motors',
    variants: [],
    country: 'USA',
    website: 'https://litmotors.com/'
  },
  BENELLI: {
    name: 'Benelli',
    variants: [],
    country: 'Italy'
  },
  QUASAR: {
    name: 'Quasar',
    variants: [],
    country: 'UK'
  }
};

const PERAVES_MODELS = {
  ECOMOBILE: {
    name: 'Ecomobile',
    years: { start: 1984, end: 2005 },
    production: 91,
    category: CATEGORIES.FULLY_ENCLOSED
  },
  MONOTRACER: {
    name: 'MonoTracer',
    years: { start: 2005, end: 2019 },
    production: 150,
    category: CATEGORIES.FULLY_ENCLOSED
  },
  E_TRACER: {
    name: 'E-Tracer',
    years: { start: 2010, end: null },
    category: CATEGORIES.FULLY_ENCLOSED,
    notes: 'Electric version, X-Prize winner'
  },
  X_TRACER: {
    name: 'X-Tracer',
    years: { start: 2010, end: null },
    category: CATEGORIES.FULLY_ENCLOSED,
    notes: 'Competition version for X-Prize'
  },
  MONORACER_130E: {
    name: 'MonoRacer-130-E',
    years: { start: 2020, end: null },
    category: CATEGORIES.FULLY_ENCLOSED,
    notes: 'Current electric model'
  },
  MONORACER_K12: {
    name: 'MonoRacer-K12',
    years: { start: 2012, end: 2016 },
    category: CATEGORIES.FULLY_ENCLOSED,
    notes: 'Petrol version, discontinued'
  }
};

const CABIN_FEATURES = {
  SUPPORT_WHEELS: 'support_wheels',
  FULL_ENCLOSURE: 'full_enclosure',
  PARTIAL_ENCLOSURE: 'partial_enclosure',
  TANDEM_SEATING: 'tandem_seating',
  SIDE_BY_SIDE_SEATING: 'side_by_side_seating',
  SAFETY_BELTS: 'safety_belts',
  ROLL_CAGE: 'roll_cage',
  AIR_CONDITIONING: 'air_conditioning',
  HEATING: 'heating',
  WINDSHIELD_WIPER: 'windshield_wiper'
};

module.exports = {
  CATEGORIES,
  MANUFACTURERS,
  PERAVES_MODELS,
  CABIN_FEATURES
};