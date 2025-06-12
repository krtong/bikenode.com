const { Pool } = require('pg');
const {
  pool,
  upsertMotorcycle
} = require('../../shared/database');
const {
  mockPeravesData,
  mockBMWC1Data,
  sqlInjectionStrings,
  xssTestStrings
} = require('../fixtures/mock-data');

// Skip if no test database
const skipIntegrationTests = !process.env.TEST_DATABASE_URL;
describe.skipIf = skipIntegrationTests ? describe.skip : describe;

describe.skipIf('Database Constraints Integration Tests', () => {
  let testPool;
  let testClient;

  beforeAll(async () => {
    testPool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      ssl: false
    });
    
    testClient = await testPool.connect();
    
    // Ensure tables exist
    await testClient.query(`
      CREATE TABLE IF NOT EXISTS motorcycle_data_specs (
        id SERIAL PRIMARY KEY,
        specifications JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_motorcycle_specs UNIQUE ((specifications))
      )
    `);
    
    await testClient.query(`
      CREATE TABLE IF NOT EXISTS motorcycle_data_make_model_year (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL CHECK (year >= 1885 AND year <= EXTRACT(YEAR FROM NOW()) + 2),
        make VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(make)) > 0),
        model VARCHAR(200) NOT NULL CHECK (LENGTH(TRIM(model)) > 0),
        package VARCHAR(100),
        category VARCHAR(50) CHECK (category IN ('cabin', 'enclosed')),
        spec_id INTEGER REFERENCES motorcycle_data_specs(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_motorcycle_model 
          UNIQUE (year, make, model, COALESCE(package, ''))
      )
    `);
  });

  afterAll(async () => {
    if (testClient) testClient.release();
    if (testPool) await testPool.end();
    if (pool) await pool.end();
  });

  beforeEach(async () => {
    await testClient.query('DELETE FROM motorcycle_data_make_model_year');
    await testClient.query('DELETE FROM motorcycle_data_specs');
  });

  describe('Data Type Constraints', () => {
    test('should enforce year range constraints', async () => {
      // Test year too old (before first motorcycle)
      const tooOld = {
        year: 1884,
        make: 'Ancient',
        model: 'Machine',
        category: 'cabin'
      };

      await expect(upsertMotorcycle(tooOld)).rejects.toThrow(/Year must be between/);

      // Test year too far in future
      const currentYear = new Date().getFullYear();
      const tooNew = {
        year: currentYear + 3,
        make: 'Future',
        model: 'Bike',
        category: 'cabin'
      };

      await expect(upsertMotorcycle(tooNew)).rejects.toThrow(/Year must be between/);
    });

    test('should enforce string length constraints', async () => {
      // Test make too long
      const longMake = {
        year: 2023,
        make: 'A'.repeat(101),
        model: 'Test',
        category: 'cabin'
      };

      await expect(upsertMotorcycle(longMake)).rejects.toThrow(/Make must be less than 100 characters/);

      // Test model too long
      const longModel = {
        year: 2023,
        make: 'Test',
        model: 'B'.repeat(201),
        category: 'cabin'
      };

      await expect(upsertMotorcycle(longModel)).rejects.toThrow(/Model must be less than 200 characters/);
    });

    test('should enforce non-empty string constraints', async () => {
      // Direct database insert should fail with empty strings
      try {
        await testClient.query(`
          INSERT INTO motorcycle_data_make_model_year (year, make, model, category)
          VALUES (2023, '', 'Model', 'cabin')
        `);
        fail('Should have thrown constraint error');
      } catch (error) {
        expect(error.message).toContain('violates check constraint');
      }
    });

    test('should enforce category enum constraint', async () => {
      // Direct database insert with invalid category
      try {
        await testClient.query(`
          INSERT INTO motorcycle_data_make_model_year (year, make, model, category)
          VALUES (2023, 'Test', 'Model', 'open')
        `);
        fail('Should have thrown constraint error');
      } catch (error) {
        expect(error.message).toContain('violates check constraint');
      }
    });
  });

  describe('Unique Constraints', () => {
    test('should enforce unique constraint on year/make/model/package combination', async () => {
      // Insert first motorcycle
      await upsertMotorcycle(mockPeravesData);

      // Try to insert duplicate via direct SQL (bypassing upsert logic)
      try {
        await testClient.query(`
          INSERT INTO motorcycle_data_make_model_year 
          (year, make, model, package, category, spec_id)
          VALUES ($1, $2, $3, $4, $5, 1)
        `, [
          mockPeravesData.year,
          mockPeravesData.make,
          mockPeravesData.model,
          mockPeravesData.package,
          mockPeravesData.category
        ]);
        fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.message).toContain('unique_motorcycle_model');
      }
    });

    test('should treat null package as distinct value', async () => {
      const withPackage = { ...mockBMWC1Data, package: 'Executive' };
      const withoutPackage = { ...mockBMWC1Data, package: null };

      // Both should insert successfully
      await upsertMotorcycle(withPackage);
      await upsertMotorcycle(withoutPackage);

      const result = await testClient.query(
        'SELECT COUNT(*) as count FROM motorcycle_data_make_model_year WHERE make = $1',
        ['BMW']
      );

      expect(parseInt(result.rows[0].count)).toBe(2);
    });

    test('should handle COALESCE in unique constraint', async () => {
      // Insert with null package
      await upsertMotorcycle({ ...mockHondaGyroData, package: null });

      // Try to insert another with empty string (should conflict due to COALESCE)
      const withEmptyPackage = { ...mockHondaGyroData, package: '' };
      
      // The upsert should update, not create new
      await upsertMotorcycle(withEmptyPackage);

      const result = await testClient.query(
        'SELECT COUNT(*) as count FROM motorcycle_data_make_model_year WHERE model = $1',
        ['Gyro Canopy']
      );

      expect(parseInt(result.rows[0].count)).toBe(1);
    });
  });

  describe('Foreign Key Constraints', () => {
    test('should enforce spec_id foreign key constraint', async () => {
      // Try to insert motorcycle with non-existent spec_id
      try {
        await testClient.query(`
          INSERT INTO motorcycle_data_make_model_year 
          (year, make, model, category, spec_id)
          VALUES (2023, 'Test', 'Model', 'cabin', 99999)
        `);
        fail('Should have thrown foreign key constraint error');
      } catch (error) {
        expect(error.message).toContain('violates foreign key constraint');
      }
    });

    test('should cascade updates properly', async () => {
      // Insert motorcycle
      const result = await upsertMotorcycle(mockPeravesData);
      
      // Update the spec
      await testClient.query(
        'UPDATE motorcycle_data_specs SET updated_at = NOW() WHERE id = $1',
        [result.specId]
      );

      // Motorcycle should still be accessible
      const motorcycle = await testClient.query(
        'SELECT * FROM motorcycle_data_make_model_year WHERE id = $1',
        [result.motorcycleId]
      );

      expect(motorcycle.rows[0].spec_id).toBe(result.specId);
    });
  });

  describe('JSONB Constraints', () => {
    test('should enforce unique constraint on specifications JSONB', async () => {
      // Insert first spec
      await upsertMotorcycle(mockPeravesData);

      // Try to insert identical specifications
      const duplicateSpecs = {
        year: 2024, // Different year
        make: 'Different', // Different make
        model: 'Model', // Different model
        category: 'cabin',
        specifications: mockPeravesData.specifications // Same specs
      };

      // Should reuse existing spec ID
      const result = await upsertMotorcycle(duplicateSpecs);
      
      // Verify only one spec exists with these specifications
      const specCount = await testClient.query(
        'SELECT COUNT(*) as count FROM motorcycle_data_specs'
      );
      
      expect(parseInt(specCount.rows[0].count)).toBe(1);
    });

    test('should store complex JSONB data correctly', async () => {
      const complexSpecs = {
        year: 2023,
        make: 'Complex',
        model: 'Spec Test',
        category: 'cabin',
        specifications: {
          nested: {
            deeply: {
              nested: {
                array: [1, 2, { key: 'value' }]
              }
            }
          },
          unicode: '测试数据',
          special: "Test's \"quoted\" value",
          null_value: null,
          boolean: true,
          number: 42.5
        }
      };

      const result = await upsertMotorcycle(complexSpecs);
      
      // Retrieve and verify
      const spec = await testClient.query(
        'SELECT specifications FROM motorcycle_data_specs WHERE id = $1',
        [result.specId]
      );

      expect(spec.rows[0].specifications).toEqual(complexSpecs.specifications);
    });
  });

  describe('SQL Injection Protection', () => {
    test('should sanitize SQL injection attempts in strings', async () => {
      for (const maliciousString of sqlInjectionStrings) {
        const maliciousData = {
          year: 2023,
          make: maliciousString.substring(0, 50), // Limit length
          model: 'Test Model',
          category: 'cabin'
        };

        // Should not throw SQL error, but validation might catch it
        try {
          await upsertMotorcycle(maliciousData);
          
          // If it succeeded, verify the data was sanitized
          const result = await testClient.query(
            'SELECT make FROM motorcycle_data_make_model_year WHERE model = $1',
            ['Test Model']
          );
          
          // Should not contain SQL keywords
          expect(result.rows[0].make).not.toContain('DROP');
          expect(result.rows[0].make).not.toContain('DELETE');
          expect(result.rows[0].make).not.toContain('--');
        } catch (error) {
          // Validation error is expected and acceptable
          expect(error.message).toContain('Validation failed');
        }

        // Clean up for next iteration
        await testClient.query('DELETE FROM motorcycle_data_make_model_year');
      }
    });

    test('should handle XSS attempts in JSONB data', async () => {
      const xssData = {
        year: 2023,
        make: 'XSS Test',
        model: 'Security Model',
        category: 'cabin',
        specifications: {
          description: xssTestStrings[0],
          features: xssTestStrings,
          nested: {
            script: '<script>alert("nested")</script>'
          }
        }
      };

      // Should store without executing
      const result = await upsertMotorcycle(xssData);
      
      // Retrieve and verify stored as-is (not executed)
      const spec = await testClient.query(
        'SELECT specifications FROM motorcycle_data_specs WHERE id = $1',
        [result.specId]
      );

      expect(spec.rows[0].specifications.description).toBe(xssTestStrings[0]);
      expect(spec.rows[0].specifications.features).toEqual(xssTestStrings);
    });
  });

  describe('Transaction Integrity', () => {
    test('should rollback entire transaction on partial failure', async () => {
      // Start tracking counts
      const initialCounts = await testClient.query(`
        SELECT 
          (SELECT COUNT(*) FROM motorcycle_data_make_model_year) as motorcycles,
          (SELECT COUNT(*) FROM motorcycle_data_specs) as specs
      `);

      // Create data that will fail after spec insertion
      const failingData = {
        year: 2023,
        make: 'Test',
        model: 'Model',
        category: 'cabin',
        specifications: { test: true }
      };

      // Mock a failure during motorcycle insertion
      const originalQuery = testClient.query;
      let callCount = 0;
      testClient.query = jest.fn(async (query, params) => {
        callCount++;
        // Fail on the motorcycle insert (after spec insert)
        if (query.includes('INSERT INTO motorcycle_data_make_model_year')) {
          throw new Error('Simulated failure');
        }
        return originalQuery.call(testClient, query, params);
      });

      try {
        await upsertMotorcycle(failingData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Simulated failure');
      }

      // Restore original function
      testClient.query = originalQuery;

      // Verify rollback - counts should be unchanged
      const finalCounts = await testClient.query(`
        SELECT 
          (SELECT COUNT(*) FROM motorcycle_data_make_model_year) as motorcycles,
          (SELECT COUNT(*) FROM motorcycle_data_specs) as specs
      `);

      expect(finalCounts.rows[0]).toEqual(initialCounts.rows[0]);
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent inserts of same model gracefully', async () => {
      // Attempt concurrent inserts of the same motorcycle
      const promises = Array(5).fill(null).map(() => 
        upsertMotorcycle(mockBMWC1Data)
      );

      const results = await Promise.all(promises);
      
      // All should succeed (due to upsert)
      results.forEach(result => {
        expect(result).toHaveProperty('motorcycleId');
        expect(result).toHaveProperty('specId');
      });

      // But only one record should exist
      const count = await testClient.query(
        'SELECT COUNT(*) as count FROM motorcycle_data_make_model_year WHERE make = $1',
        ['BMW']
      );

      expect(parseInt(count.rows[0].count)).toBe(1);
    });

    test('should handle concurrent inserts of different models', async () => {
      const models = [
        { ...mockPeravesData, model: 'Model1' },
        { ...mockPeravesData, model: 'Model2' },
        { ...mockPeravesData, model: 'Model3' },
        { ...mockPeravesData, model: 'Model4' },
        { ...mockPeravesData, model: 'Model5' }
      ];

      const promises = models.map(model => upsertMotorcycle(model));
      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(5);
      
      // All should exist in database
      const count = await testClient.query(
        'SELECT COUNT(*) as count FROM motorcycle_data_make_model_year WHERE make = $1',
        ['Peraves']
      );

      expect(parseInt(count.rows[0].count)).toBe(5);
    });
  });
});