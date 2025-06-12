const {
  validateMotorcycleData,
  validateSpecifications,
  sanitizeString,
  sanitizeMotorcycleData,
  validateAndSanitize,
  isDuplicate,
  VALID_CATEGORIES,
  VALID_SUBCATEGORIES
} = require('../../shared/validation');

describe('Validation Module', () => {
  describe('validateMotorcycleData', () => {
    test('should validate correct motorcycle data', () => {
      const validData = {
        year: 2023,
        make: 'Peraves',
        model: 'MonoTracer MTE-150',
        category: 'cabin',
        package: 'Standard'
      };
      
      const result = validateMotorcycleData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject missing required fields', () => {
      const invalidData = {
        year: 2023,
        // missing make
        model: 'MonoTracer',
        category: 'cabin'
      };
      
      const result = validateMotorcycleData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Make is required and must be a non-empty string');
    });

    test('should reject invalid year', () => {
      const currentYear = new Date().getFullYear();
      
      // Test year too old
      const tooOld = {
        year: 1884,
        make: 'Test',
        model: 'Model',
        category: 'cabin'
      };
      
      let result = validateMotorcycleData(tooOld);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Year must be between');
      
      // Test year too far in future
      const tooNew = {
        year: currentYear + 3,
        make: 'Test',
        model: 'Model',
        category: 'cabin'
      };
      
      result = validateMotorcycleData(tooNew);
      expect(result.isValid).toBe(false);
    });

    test('should reject invalid category', () => {
      const invalidCategory = {
        year: 2023,
        make: 'Test',
        model: 'Model',
        category: 'invalid_category'
      };
      
      const result = validateMotorcycleData(invalidCategory);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Category must be one of:');
    });

    test('should validate string length limits', () => {
      const tooLong = {
        year: 2023,
        make: 'A'.repeat(101),
        model: 'B'.repeat(201),
        category: 'cabin',
        package: 'C'.repeat(101)
      };
      
      const result = validateMotorcycleData(tooLong);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Make must be less than 100 characters');
      expect(result.errors).toContain('Model must be less than 200 characters');
      expect(result.errors).toContain('Package must be a string less than 100 characters');
    });
  });

  describe('validateSpecifications', () => {
    test('should validate correct specifications', () => {
      const validSpecs = {
        subcategory: 'fully_enclosed',
        engine: {
          displacement: 650,
          power: '55 hp'
        },
        dimensions: {
          length: 3500,
          width: 1200,
          height: 1400,
          wheelbase: 2400
        },
        weight: {
          curb: 550
        },
        performance: {
          top_speed: 200,
          range: 400
        },
        cabin_features: ['air_conditioning', 'heating', 'stereo']
      };
      
      const result = validateSpecifications(validSpecs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid subcategory', () => {
      const invalidSpecs = {
        subcategory: 'invalid_sub'
      };
      
      const result = validateSpecifications(invalidSpecs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Subcategory must be one of:');
    });

    test('should validate engine specifications', () => {
      const invalidEngine = {
        engine: {
          displacement: -100,
          power: 123 // should be string
        }
      };
      
      const result = validateSpecifications(invalidEngine);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Engine displacement must be a number between 0 and 10000');
      expect(result.errors).toContain('Engine power must be a string');
    });

    test('should validate dimensions', () => {
      const invalidDimensions = {
        dimensions: {
          length: -100,
          width: 15000,
          height: 'tall', // should be number
          wheelbase: 2400
        }
      };
      
      const result = validateSpecifications(invalidDimensions);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate performance metrics', () => {
      const invalidPerformance = {
        performance: {
          top_speed: 700, // too high
          range: -50 // negative
        }
      };
      
      const result = validateSpecifications(invalidPerformance);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Top speed must be a number between 0 and 600 km/h');
      expect(result.errors).toContain('Range must be a number between 0 and 2000 km');
    });

    test('should validate cabin features as array', () => {
      const invalidFeatures = {
        cabin_features: 'air_conditioning' // should be array
      };
      
      const result = validateSpecifications(invalidFeatures);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cabin features must be an array');
    });
  });

  describe('sanitizeString', () => {
    test('should remove SQL injection attempts', () => {
      expect(sanitizeString("'; DROP TABLE users; --")).toBe(' DROP TABLE users ');
      expect(sanitizeString('test\'; DELETE FROM')).toBe('test DELETE FROM');
      expect(sanitizeString('normal string')).toBe('normal string');
    });

    test('should remove comments', () => {
      expect(sanitizeString('test -- comment')).toBe('test  comment');
      expect(sanitizeString('test /* block comment */')).toBe('test  block comment */');
    });

    test('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
      expect(sanitizeString('\n\ttest\n\t')).toBe('test');
    });

    test('should handle non-string input', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
    });
  });

  describe('sanitizeMotorcycleData', () => {
    test('should sanitize all string fields', () => {
      const dirty = {
        year: 2023,
        make: "Peraves'; DROP TABLE",
        model: 'MonoTracer--comment',
        package: '  Standard  ',
        category: 'cabin/*test*/'
      };
      
      const clean = sanitizeMotorcycleData(dirty);
      expect(clean.make).toBe('Peraves DROP TABLE');
      expect(clean.model).toBe('MonoTracercomment');
      expect(clean.package).toBe('Standard');
      expect(clean.category).toBe('cabintest*/');
      expect(clean.year).toBe(2023); // number unchanged
    });

    test('should handle null package', () => {
      const data = {
        year: 2023,
        make: 'Peraves',
        model: 'MonoTracer',
        category: 'cabin',
        package: null
      };
      
      const result = sanitizeMotorcycleData(data);
      expect(result.package).toBeNull();
    });
  });

  describe('validateAndSanitize', () => {
    test('should sanitize and validate complete data', () => {
      const data = {
        year: 2023,
        make: "Peraves'; --",
        model: 'MonoTracer MTE-150',
        category: 'cabin',
        specifications: {
          subcategory: 'fully_enclosed',
          engine: {
            displacement: 650,
            power: '55 hp'
          }
        }
      };
      
      const result = validateAndSanitize(data);
      expect(result.isValid).toBe(true);
      expect(result.data.make).toBe('Peraves ');
      expect(result.data.specifications.engine.displacement).toBe(650);
    });

    test('should return errors for invalid data', () => {
      const invalidData = {
        year: 'twenty-twenty-three', // should be number
        make: '',
        model: 'Test',
        category: 'invalid'
      };
      
      const result = validateAndSanitize(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeNull();
    });

    test('should validate specifications if present', () => {
      const data = {
        year: 2023,
        make: 'BMW',
        model: 'C1',
        category: 'cabin',
        specifications: {
          engine: {
            displacement: -100 // invalid
          }
        }
      };
      
      const result = validateAndSanitize(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Engine displacement must be a number between 0 and 10000');
    });
  });

  describe('isDuplicate', () => {
    const existingData = [
      {
        year: 2023,
        make: 'Peraves',
        model: 'MonoTracer MTE-150',
        package: 'Standard'
      },
      {
        year: 2022,
        make: 'BMW',
        model: 'C1',
        package: null
      }
    ];

    test('should detect exact duplicates', () => {
      const duplicate = {
        year: 2023,
        make: 'Peraves',
        model: 'MonoTracer MTE-150',
        package: 'Standard'
      };
      
      expect(isDuplicate(duplicate, existingData)).toBe(true);
    });

    test('should detect duplicates with case differences', () => {
      const duplicate = {
        year: 2023,
        make: 'PERAVES',
        model: 'monotracer mte-150',
        package: 'STANDARD'
      };
      
      expect(isDuplicate(duplicate, existingData)).toBe(true);
    });

    test('should handle null packages correctly', () => {
      const duplicate = {
        year: 2022,
        make: 'BMW',
        model: 'C1',
        package: null
      };
      
      expect(isDuplicate(duplicate, existingData)).toBe(true);
      
      const notDuplicate = {
        year: 2022,
        make: 'BMW',
        model: 'C1',
        package: 'Executive'
      };
      
      expect(isDuplicate(notDuplicate, existingData)).toBe(false);
    });

    test('should not detect non-duplicates', () => {
      const notDuplicate = {
        year: 2024,
        make: 'Peraves',
        model: 'MonoTracer MTE-150',
        package: 'Standard'
      };
      
      expect(isDuplicate(notDuplicate, existingData)).toBe(false);
    });
  });

  describe('Constants', () => {
    test('should export valid categories', () => {
      expect(VALID_CATEGORIES).toContain('cabin');
      expect(VALID_CATEGORIES).toContain('enclosed');
      expect(Array.isArray(VALID_CATEGORIES)).toBe(true);
    });

    test('should export valid subcategories', () => {
      expect(VALID_SUBCATEGORIES).toContain('fully_enclosed');
      expect(VALID_SUBCATEGORIES).toContain('semi_enclosed');
      expect(VALID_SUBCATEGORIES).toContain('streamliner');
      expect(Array.isArray(VALID_SUBCATEGORIES)).toBe(true);
    });
  });
});