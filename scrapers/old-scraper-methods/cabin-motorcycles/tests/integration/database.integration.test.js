const { Pool } = require('pg');
const {
  pool,
  upsertMotorcycle,
  motorcycleExists,
  getMotorcyclesByMake,
  startScrapingLog,
  completeScrapingLog
} = require('../../shared/database');

// This test requires a real test database
// Skip if TEST_DATABASE_URL is not set
const skipIntegrationTests = !process.env.TEST_DATABASE_URL;

describe.skipIf = skipIntegrationTests ? describe.skip : describe;

describe.skipIf('Database Integration Tests', () => {
  let testPool;
  let testClient;

  beforeAll(async () => {
    // Create a separate connection for cleanup
    testPool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      ssl: false
    });
    
    testClient = await testPool.connect();
    
    // Create test tables if they don't exist
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
        year INTEGER NOT NULL,
        make VARCHAR(100) NOT NULL,
        model VARCHAR(200) NOT NULL,
        package VARCHAR(100),
        category VARCHAR(50),
        spec_id INTEGER REFERENCES motorcycle_data_specs(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_motorcycle_model 
          UNIQUE (year, make, model, COALESCE(package, ''))
      )
    `);
    
    // Create scraping log functions if they don't exist
    await testClient.query(`
      CREATE OR REPLACE FUNCTION log_scraping_start(
        p_scraper_name VARCHAR(100),
        p_manufacturer VARCHAR(100) DEFAULT NULL,
        p_metadata JSONB DEFAULT NULL
      ) RETURNS INTEGER AS $$
      DECLARE
        v_log_id INTEGER;
      BEGIN
        INSERT INTO scraping_logs (
          scraper_name, manufacturer, status, started_at, metadata
        ) VALUES (
          p_scraper_name, p_manufacturer, 'running', NOW(), p_metadata
        ) RETURNING id INTO v_log_id;
        
        RETURN v_log_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await testClient.query(`
      CREATE OR REPLACE FUNCTION log_scraping_complete(
        p_log_id INTEGER,
        p_models_scraped INTEGER,
        p_status VARCHAR(50),
        p_error_message TEXT DEFAULT NULL,
        p_metadata JSONB DEFAULT NULL
      ) RETURNS VOID AS $$
      BEGIN
        UPDATE scraping_logs
        SET 
          models_scraped = p_models_scraped,
          status = p_status,
          error_message = p_error_message,
          completed_at = NOW(),
          metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb)
        WHERE id = p_log_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await testClient.query(`
      CREATE TABLE IF NOT EXISTS scraping_logs (
        id SERIAL PRIMARY KEY,
        scraper_name VARCHAR(100) NOT NULL,
        manufacturer VARCHAR(100),
        models_scraped INTEGER DEFAULT 0,
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  });

  afterAll(async () => {
    // Clean up
    if (testClient) {
      testClient.release();
    }
    if (testPool) {
      await testPool.end();
    }
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    // Clean test data before each test
    await testClient.query('DELETE FROM motorcycle_data_make_model_year');
    await testClient.query('DELETE FROM motorcycle_data_specs');
    await testClient.query('DELETE FROM scraping_logs');
  });

  describe('upsertMotorcycle integration', () => {
    test('should insert and retrieve motorcycle with specifications', async () => {
      const motorcycleData = {
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
            type: 'parallel twin'
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
          cabin_features: ['air_conditioning', 'heating', 'stereo', 'airbags']
        }
      };

      // Insert the motorcycle
      const result = await upsertMotorcycle(motorcycleData);
      
      expect(result).toHaveProperty('motorcycleId');
      expect(result).toHaveProperty('specId');
      expect(result.motorcycleId).toBeGreaterThan(0);
      expect(result.specId).toBeGreaterThan(0);

      // Verify it exists
      const exists = await motorcycleExists(2023, 'Peraves', 'MonoTracer MTE-150', 'Standard');
      expect(exists).toBe(true);

      // Retrieve and verify data
      const motorcycles = await getMotorcyclesByMake('Peraves');
      expect(motorcycles).toHaveLength(1);
      
      const retrieved = motorcycles[0];
      expect(retrieved.year).toBe(2023);
      expect(retrieved.make).toBe('Peraves');
      expect(retrieved.model).toBe('MonoTracer MTE-150');
      expect(retrieved.package).toBe('Standard');
      expect(retrieved.category).toBe('cabin');
      expect(retrieved.specifications).toEqual(motorcycleData.specifications);
    });

    test('should update existing motorcycle specifications', async () => {
      const initialData = {
        year: 2022,
        make: 'BMW',
        model: 'C1',
        category: 'cabin',
        specifications: {
          engine: { displacement: 125 }
        }
      };

      // Insert initial data
      const initial = await upsertMotorcycle(initialData);
      
      // Update with new specifications
      const updatedData = {
        ...initialData,
        specifications: {
          engine: { displacement: 125, power: '15 hp' },
          dimensions: { length: 2100 }
        }
      };

      const updated = await upsertMotorcycle(updatedData);
      
      // Should have same motorcycle ID but different spec ID
      expect(updated.motorcycleId).toBeDefined();
      
      // Verify updated data
      const motorcycles = await getMotorcyclesByMake('BMW');
      expect(motorcycles).toHaveLength(1);
      expect(motorcycles[0].specifications.engine.power).toBe('15 hp');
      expect(motorcycles[0].specifications.dimensions.length).toBe(2100);
    });

    test('should handle multiple motorcycles from same manufacturer', async () => {
      const models = [
        {
          year: 2023,
          make: 'Peraves',
          model: 'MonoTracer MTE-150',
          category: 'cabin',
          specifications: { engine: { displacement: 650 } }
        },
        {
          year: 2022,
          make: 'Peraves',
          model: 'MonoTracer E',
          category: 'cabin',
          specifications: { engine: { type: 'electric' } }
        },
        {
          year: 2020,
          make: 'Peraves',
          model: 'EcoMobile',
          category: 'cabin',
          specifications: { engine: { displacement: 1200 } }
        }
      ];

      // Insert all models
      for (const model of models) {
        await upsertMotorcycle(model);
      }

      // Retrieve all Peraves motorcycles
      const motorcycles = await getMotorcyclesByMake('Peraves');
      
      expect(motorcycles).toHaveLength(3);
      
      // Verify they're ordered by year DESC
      expect(motorcycles[0].year).toBe(2023);
      expect(motorcycles[1].year).toBe(2022);
      expect(motorcycles[2].year).toBe(2020);
      
      // Verify each has correct specifications
      expect(motorcycles[0].specifications.engine.displacement).toBe(650);
      expect(motorcycles[1].specifications.engine.type).toBe('electric');
      expect(motorcycles[2].specifications.engine.displacement).toBe(1200);
    });

    test('should handle constraint violations gracefully', async () => {
      const motorcycleData = {
        year: 2023,
        make: 'Honda',
        model: 'Gyro Canopy',
        category: 'cabin',
        specifications: { seating: 1 }
      };

      // Insert first time
      await upsertMotorcycle(motorcycleData);

      // Try to insert same model with same specs (should update)
      const result = await upsertMotorcycle(motorcycleData);
      expect(result.motorcycleId).toBeDefined();

      // Verify only one exists
      const exists = await motorcycleExists(2023, 'Honda', 'Gyro Canopy');
      expect(exists).toBe(true);

      const motorcycles = await getMotorcyclesByMake('Honda');
      expect(motorcycles).toHaveLength(1);
    });
  });

  describe('Scraping log integration', () => {
    test('should create and complete scraping log', async () => {
      // Start scraping
      const logId = await startScrapingLog('integration-test', 'TestMaker', {
        test_run: true,
        version: '1.0.0'
      });
      
      expect(logId).toBeDefined();
      expect(logId).toBeGreaterThan(0);

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));

      // Complete scraping
      await completeScrapingLog(logId, 25, 'success', null, {
        new_models: 5,
        updated_models: 20
      });

      // Verify log was updated
      const result = await testClient.query(
        'SELECT * FROM scraping_logs WHERE id = $1',
        [logId]
      );

      expect(result.rows).toHaveLength(1);
      
      const log = result.rows[0];
      expect(log.scraper_name).toBe('integration-test');
      expect(log.manufacturer).toBe('TestMaker');
      expect(log.models_scraped).toBe(25);
      expect(log.status).toBe('success');
      expect(log.error_message).toBeNull();
      expect(log.completed_at).toBeDefined();
      expect(log.metadata).toEqual({
        test_run: true,
        version: '1.0.0',
        new_models: 5,
        updated_models: 20
      });
    });

    test('should handle failed scraping with error', async () => {
      const logId = await startScrapingLog('error-test', 'FailMaker');
      
      await completeScrapingLog(
        logId, 
        0, 
        'failed', 
        'Network timeout: Unable to reach target website',
        { retry_count: 3 }
      );

      const result = await testClient.query(
        'SELECT * FROM scraping_logs WHERE id = $1',
        [logId]
      );

      const log = result.rows[0];
      expect(log.status).toBe('failed');
      expect(log.models_scraped).toBe(0);
      expect(log.error_message).toContain('Network timeout');
      expect(log.metadata.retry_count).toBe(3);
    });

    test('should track multiple concurrent scraping sessions', async () => {
      // Start multiple scraping sessions
      const logId1 = await startScrapingLog('concurrent-1', 'Maker1');
      const logId2 = await startScrapingLog('concurrent-2', 'Maker2');
      const logId3 = await startScrapingLog('concurrent-3', 'Maker3');

      // Complete them in different order with different statuses
      await completeScrapingLog(logId2, 10, 'success');
      await completeScrapingLog(logId1, 0, 'failed', 'Test error');
      await completeScrapingLog(logId3, 5, 'completed_with_errors', 'Partial failure');

      // Verify all logs
      const result = await testClient.query(
        'SELECT * FROM scraping_logs ORDER BY id',
        []
      );

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].status).toBe('failed');
      expect(result.rows[1].status).toBe('success');
      expect(result.rows[2].status).toBe('completed_with_errors');
    });
  });

  describe('Data integrity constraints', () => {
    test('should enforce unique constraint on year/make/model/package', async () => {
      const motorcycleData = {
        year: 2023,
        make: 'Lit Motors',
        model: 'C-1',
        package: 'Base',
        category: 'cabin',
        specifications: { type: 'gyroscopic' }
      };

      // First insert should succeed
      const first = await upsertMotorcycle(motorcycleData);
      expect(first.motorcycleId).toBeDefined();

      // Second insert with same data should update, not create new
      const second = await upsertMotorcycle(motorcycleData);
      
      // Query to verify only one record exists
      const result = await testClient.query(
        'SELECT COUNT(*) as count FROM motorcycle_data_make_model_year WHERE make = $1',
        ['Lit Motors']
      );
      
      expect(parseInt(result.rows[0].count)).toBe(1);
    });

    test('should allow same model with different packages', async () => {
      const base = {
        year: 2023,
        make: 'BMW',
        model: 'C1',
        package: 'Base',
        category: 'cabin',
        specifications: { features: ['basic'] }
      };

      const executive = {
        year: 2023,
        make: 'BMW',
        model: 'C1',
        package: 'Executive',
        category: 'cabin',
        specifications: { features: ['premium', 'leather'] }
      };

      await upsertMotorcycle(base);
      await upsertMotorcycle(executive);

      const motorcycles = await getMotorcyclesByMake('BMW');
      expect(motorcycles).toHaveLength(2);
      
      const packages = motorcycles.map(m => m.package).sort();
      expect(packages).toEqual(['Base', 'Executive']);
    });

    test('should handle null package correctly in constraints', async () => {
      const withoutPackage = {
        year: 2023,
        make: 'Honda',
        model: 'Gyro Canopy',
        package: null,
        category: 'cabin',
        specifications: {}
      };

      const withPackage = {
        year: 2023,
        make: 'Honda',
        model: 'Gyro Canopy',
        package: 'Deluxe',
        category: 'cabin',
        specifications: {}
      };

      await upsertMotorcycle(withoutPackage);
      await upsertMotorcycle(withPackage);

      const motorcycles = await getMotorcyclesByMake('Honda');
      expect(motorcycles).toHaveLength(2);
    });
  });
});