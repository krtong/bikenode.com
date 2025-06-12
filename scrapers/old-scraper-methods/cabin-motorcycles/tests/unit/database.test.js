const { Pool } = require('pg');
const {
  pool,
  upsertMotorcycle,
  motorcycleExists,
  getMotorcyclesByMake,
  startScrapingLog,
  completeScrapingLog,
  logScrapingActivity
} = require('../../shared/database');

// Mock pg module
jest.mock('pg');

// Mock validation module
jest.mock('../../shared/validation', () => ({
  validateAndSanitize: jest.fn()
}));

const { validateAndSanitize } = require('../../shared/validation');

describe('Database Module', () => {
  let mockPool;
  let mockClient;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    // Create mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn()
    };
    
    // Set up Pool constructor to return our mock
    Pool.mockImplementation(() => mockPool);
  });

  describe('upsertMotorcycle', () => {
    test('should insert new motorcycle successfully', async () => {
      const motorcycleData = {
        year: 2023,
        make: 'Peraves',
        model: 'MonoTracer MTE-150',
        package: 'Standard',
        category: 'cabin',
        specifications: {
          engine: { displacement: 650 }
        }
      };

      // Mock validation
      validateAndSanitize.mockReturnValue({
        isValid: true,
        errors: [],
        data: motorcycleData
      });

      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // Insert specs
          rows: [{ id: 123 }]
        })
        .mockResolvedValueOnce({ // Insert motorcycle
          rows: [{ id: 456 }]
        })
        .mockResolvedValueOnce({}); // COMMIT

      const result = await upsertMotorcycle(motorcycleData);

      expect(result).toEqual({
        motorcycleId: 456,
        specId: 123
      });

      // Verify validation was called
      expect(validateAndSanitize).toHaveBeenCalledWith(motorcycleData);

      // Verify transaction flow
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // Verify specs insert
      const specsCall = mockClient.query.mock.calls[1];
      expect(specsCall[0]).toContain('INSERT INTO motorcycle_data_specs');
      expect(JSON.parse(specsCall[1][0])).toEqual(motorcycleData.specifications);

      // Verify motorcycle insert
      const motorcycleCall = mockClient.query.mock.calls[2];
      expect(motorcycleCall[0]).toContain('INSERT INTO motorcycle_data_make_model_year');
      expect(motorcycleCall[1]).toEqual([
        2023,
        'Peraves',
        'MonoTracer MTE-150',
        'Standard',
        'cabin',
        123
      ]);
    });

    test('should update existing motorcycle', async () => {
      const motorcycleData = {
        year: 2023,
        make: 'BMW',
        model: 'C1',
        category: 'cabin',
        specifications: { updated: true }
      };

      validateAndSanitize.mockReturnValue({
        isValid: true,
        errors: [],
        data: motorcycleData
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 789 }] }) // Upsert specs
        .mockResolvedValueOnce({ rows: [{ id: 101 }] }) // Upsert motorcycle
        .mockResolvedValueOnce({}); // COMMIT

      const result = await upsertMotorcycle(motorcycleData);

      expect(result.motorcycleId).toBe(101);
      expect(result.specId).toBe(789);
      
      // Verify ON CONFLICT clause is present
      const motorcycleQuery = mockClient.query.mock.calls[2][0];
      expect(motorcycleQuery).toContain('ON CONFLICT');
      expect(motorcycleQuery).toContain('DO UPDATE SET');
    });

    test('should handle validation errors', async () => {
      validateAndSanitize.mockReturnValue({
        isValid: false,
        errors: ['Invalid year', 'Missing make'],
        data: null
      });

      await expect(upsertMotorcycle({})).rejects.toThrow('Validation failed: Invalid year, Missing make');
      
      // Ensure no database operations were attempted
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    test('should rollback on database error', async () => {
      const motorcycleData = {
        year: 2023,
        make: 'Test',
        model: 'Model',
        category: 'cabin'
      };

      validateAndSanitize.mockReturnValue({
        isValid: true,
        errors: [],
        data: motorcycleData
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Specs insert fails

      await expect(upsertMotorcycle(motorcycleData)).rejects.toThrow('Database error');

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle null package correctly', async () => {
      const motorcycleData = {
        year: 2023,
        make: 'Honda',
        model: 'Gyro Canopy',
        package: null,
        category: 'cabin'
      };

      validateAndSanitize.mockReturnValue({
        isValid: true,
        errors: [],
        data: motorcycleData
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 111 }] }) // Specs
        .mockResolvedValueOnce({ rows: [{ id: 222 }] }) // Motorcycle
        .mockResolvedValueOnce({}); // COMMIT

      await upsertMotorcycle(motorcycleData);

      const motorcycleCall = mockClient.query.mock.calls[2];
      expect(motorcycleCall[1][3]).toBeNull(); // package should be null
    });
  });

  describe('motorcycleExists', () => {
    test('should return true when motorcycle exists', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      const exists = await motorcycleExists(2023, 'Peraves', 'MonoTracer');

      expect(exists).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM motorcycle_data_make_model_year'),
        [2023, 'Peraves', 'MonoTracer', null]
      );
    });

    test('should return false when motorcycle does not exist', async () => {
      mockPool.query.mockResolvedValue({
        rows: []
      });

      const exists = await motorcycleExists(2023, 'NonExistent', 'Model');

      expect(exists).toBe(false);
    });

    test('should handle package parameter', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      await motorcycleExists(2023, 'BMW', 'C1', 'Executive');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [2023, 'BMW', 'C1', 'Executive']
      );
    });

    test('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      await expect(motorcycleExists(2023, 'Test', 'Model')).rejects.toThrow('Connection failed');
    });
  });

  describe('getMotorcyclesByMake', () => {
    test('should return motorcycles with specifications', async () => {
      const mockData = [
        {
          id: 1,
          year: 2023,
          make: 'Peraves',
          model: 'MonoTracer MTE-150',
          specifications: { engine: { displacement: 650 } }
        },
        {
          id: 2,
          year: 2022,
          make: 'Peraves',
          model: 'MonoTracer E',
          specifications: { engine: { type: 'electric' } }
        }
      ];

      mockPool.query.mockResolvedValue({
        rows: mockData
      });

      const result = await getMotorcyclesByMake('Peraves');

      expect(result).toEqual(mockData);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN motorcycle_data_specs'),
        ['Peraves']
      );
      
      // Verify ordering
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('ORDER BY m.year DESC, m.model');
    });

    test('should return empty array for non-existent make', async () => {
      mockPool.query.mockResolvedValue({
        rows: []
      });

      const result = await getMotorcyclesByMake('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('Scraping Log Functions', () => {
    describe('startScrapingLog', () => {
      test('should start scraping log and return ID', async () => {
        mockPool.query.mockResolvedValue({
          rows: [{ log_scraping_start: 999 }]
        });

        const logId = await startScrapingLog('peraves-scraper', 'Peraves', { source: 'website' });

        expect(logId).toBe(999);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT log_scraping_start($1, $2, $3)',
          ['peraves-scraper', 'Peraves', { source: 'website' }]
        );
      });

      test('should handle null manufacturer and metadata', async () => {
        mockPool.query.mockResolvedValue({
          rows: [{ log_scraping_start: 888 }]
        });

        const logId = await startScrapingLog('generic-scraper');

        expect(logId).toBe(888);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT log_scraping_start($1, $2, $3)',
          ['generic-scraper', null, null]
        );
      });

      test('should return null on error', async () => {
        mockPool.query.mockRejectedValue(new Error('Database error'));

        const logId = await startScrapingLog('test-scraper');

        expect(logId).toBeNull();
        expect(console.error).toHaveBeenCalledWith(
          'Failed to start scraping log:',
          expect.any(Error)
        );
      });
    });

    describe('completeScrapingLog', () => {
      test('should complete scraping log successfully', async () => {
        mockPool.query.mockResolvedValue({});

        await completeScrapingLog(999, 15, 'success', null, { new_models: 5 });

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT log_scraping_complete($1, $2, $3, $4, $5)',
          [999, 15, 'success', null, { new_models: 5 }]
        );
      });

      test('should handle error status', async () => {
        mockPool.query.mockResolvedValue({});

        await completeScrapingLog(999, 0, 'failed', 'Connection timeout', null);

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT log_scraping_complete($1, $2, $3, $4, $5)',
          [999, 0, 'failed', 'Connection timeout', null]
        );
      });

      test('should handle database errors gracefully', async () => {
        mockPool.query.mockRejectedValue(new Error('Update failed'));

        // Should not throw
        await completeScrapingLog(999, 10, 'success');

        expect(console.error).toHaveBeenCalledWith(
          'Failed to complete scraping log:',
          expect.any(Error)
        );
      });
    });

    describe('logScrapingActivity (legacy)', () => {
      test('should start and complete log in sequence', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ log_scraping_start: 777 }] }) // start
          .mockResolvedValueOnce({}); // complete

        await logScrapingActivity('BMW', 5, 'success');

        expect(mockPool.query).toHaveBeenCalledTimes(2);
        
        // Verify start call
        expect(mockPool.query).toHaveBeenNthCalledWith(1,
          'SELECT log_scraping_start($1, $2, $3)',
          ['cabin-motorcycles', 'BMW', null]
        );
        
        // Verify complete call
        expect(mockPool.query).toHaveBeenNthCalledWith(2,
          'SELECT log_scraping_complete($1, $2, $3, $4, $5)',
          [777, 5, 'success', null, null]
        );
      });

      test('should handle error parameter', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ log_scraping_start: 666 }] })
          .mockResolvedValueOnce({});

        await logScrapingActivity('Honda', 0, 'failed', 'Network error');

        const completeCall = mockPool.query.mock.calls[1];
        expect(completeCall[1][3]).toBe('Network error');
      });

      test('should not complete if start fails', async () => {
        mockPool.query.mockRejectedValue(new Error('Start failed'));

        await logScrapingActivity('Test', 10, 'success');

        // Only one call should be made (the failed start)
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Pool configuration', () => {
    test('should configure pool with SSL in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      // Clear the module cache and re-require
      jest.resetModules();
      jest.mock('pg');
      const { Pool: ProductionPool } = require('pg');
      ProductionPool.mockImplementation((config) => {
        expect(config.ssl).toEqual({ rejectUnauthorized: false });
        return mockPool;
      });
      
      require('../../shared/database');
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should configure pool without SSL in development', () => {
      expect(Pool).toHaveBeenCalledWith({
        connectionString: process.env.DATABASE_URL,
        ssl: false
      });
    });
  });
});