// Tests for PostgreSQL functions log_scraping_start and log_scraping_complete
// These tests verify the SQL function behavior by mocking the database responses

const { Pool } = require('pg');
const {
  startScrapingLog,
  completeScrapingLog,
  logScrapingActivity
} = require('../../shared/database');

jest.mock('pg');

describe('PostgreSQL Function Tests', () => {
  let mockPool;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn()
    };
    
    Pool.mockImplementation(() => mockPool);
  });

  describe('log_scraping_start function', () => {
    test('should handle basic parameters correctly', async () => {
      const expectedLogId = 12345;
      mockPool.query.mockResolvedValue({
        rows: [{ log_scraping_start: expectedLogId }]
      });

      const logId = await startScrapingLog('test-scraper', 'TestMaker');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT log_scraping_start($1, $2, $3)',
        ['test-scraper', 'TestMaker', null]
      );
      expect(logId).toBe(expectedLogId);
    });

    test('should handle metadata parameter', async () => {
      const metadata = {
        version: '1.0.0',
        source_url: 'https://example.com',
        user_agent: 'Mozilla/5.0'
      };

      mockPool.query.mockResolvedValue({
        rows: [{ log_scraping_start: 67890 }]
      });

      await startScrapingLog('metadata-scraper', 'MetaMaker', metadata);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT log_scraping_start($1, $2, $3)',
        ['metadata-scraper', 'MetaMaker', metadata]
      );
    });

    test('should handle null manufacturer', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ log_scraping_start: 11111 }]
      });

      await startScrapingLog('generic-scraper', null, { type: 'bulk' });

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT log_scraping_start($1, $2, $3)',
        ['generic-scraper', null, { type: 'bulk' }]
      );
    });

    test('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection refused'));

      const logId = await startScrapingLog('error-scraper');

      expect(logId).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to start scraping log:',
        expect.any(Error)
      );
    });

    test('should handle missing function error', async () => {
      mockPool.query.mockRejectedValue(new Error('function log_scraping_start does not exist'));

      const logId = await startScrapingLog('missing-function-scraper');

      expect(logId).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('log_scraping_complete function', () => {
    test('should handle success status', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await completeScrapingLog(12345, 25, 'success');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT log_scraping_complete($1, $2, $3, $4, $5)',
        [12345, 25, 'success', null, null]
      );
    });

    test('should handle failed status with error message', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const errorMessage = 'Failed to parse HTML: Invalid structure';
      await completeScrapingLog(12345, 0, 'failed', errorMessage);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT log_scraping_complete($1, $2, $3, $4, $5)',
        [12345, 0, 'failed', errorMessage, null]
      );
    });

    test('should handle partial success with metadata', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const metadata = {
        successful_models: 18,
        failed_models: 7,
        error_types: ['timeout', 'parse_error']
      };

      await completeScrapingLog(12345, 18, 'completed_with_errors', 'Some models failed', metadata);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT log_scraping_complete($1, $2, $3, $4, $5)',
        [12345, 18, 'completed_with_errors', 'Some models failed', metadata]
      );
    });

    test('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Invalid log ID'));

      // Should not throw
      await expect(completeScrapingLog(99999, 10, 'success')).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to complete scraping log:',
        expect.any(Error)
      );
    });

    test('should handle very long error messages', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const longError = 'A'.repeat(5000); // Very long error message
      await completeScrapingLog(12345, 0, 'failed', longError);

      const call = mockPool.query.mock.calls[0];
      expect(call[1][3]).toBe(longError);
    });
  });

  describe('logScrapingActivity (legacy wrapper)', () => {
    test('should orchestrate start and complete calls', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ log_scraping_start: 55555 }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await logScrapingActivity('LegacyMaker', 30, 'success');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      
      // First call should be start
      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        'SELECT log_scraping_start($1, $2, $3)',
        ['cabin-motorcycles', 'LegacyMaker', null]
      );
      
      // Second call should be complete with the returned ID
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        'SELECT log_scraping_complete($1, $2, $3, $4, $5)',
        [55555, 30, 'success', null, null]
      );
    });

    test('should not call complete if start fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Cannot start log'));

      await logScrapingActivity('FailedMaker', 0, 'failed');

      // Only one call should be made (the failed start)
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    test('should pass error message through', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ log_scraping_start: 77777 }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      const errorMsg = 'Network timeout after 3 retries';
      await logScrapingActivity('TimeoutMaker', 0, 'failed', errorMsg);

      const completeCall = mockPool.query.mock.calls[1];
      expect(completeCall[1][3]).toBe(errorMsg);
    });
  });

  describe('PostgreSQL function parameter validation', () => {
    test('should handle special characters in scraper name', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ log_scraping_start: 88888 }]
      });

      await startScrapingLog('scraper-with-special_chars.v2', 'Maker');

      const call = mockPool.query.mock.calls[0];
      expect(call[1][0]).toBe('scraper-with-special_chars.v2');
    });

    test('should handle Unicode in manufacturer name', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ log_scraping_start: 99999 }]
      });

      await startScrapingLog('unicode-test', 'Moto-Guzmüller');

      const call = mockPool.query.mock.calls[0];
      expect(call[1][1]).toBe('Moto-Guzmüller');
    });

    test('should handle complex JSON metadata', async () => {
      const complexMetadata = {
        nested: {
          deeply: {
            nested: {
              value: 'test'
            }
          }
        },
        array: [1, 2, { key: 'value' }],
        special_chars: "Test's \"quoted\" value",
        unicode: '测试数据',
        null_value: null,
        boolean: true,
        number: 42.5
      };

      mockPool.query.mockResolvedValue({
        rows: [{ log_scraping_start: 123456 }]
      });

      await startScrapingLog('json-test', 'JSONMaker', complexMetadata);

      const call = mockPool.query.mock.calls[0];
      expect(call[1][2]).toEqual(complexMetadata);
    });
  });

  describe('Edge cases and error scenarios', () => {
    test('should handle undefined vs null parameters differently', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ log_scraping_start: 111111 }]
      });

      // Test with undefined (should become null)
      await startScrapingLog('test', undefined, undefined);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT log_scraping_start($1, $2, $3)',
        ['test', null, null]
      );
    });

    test('should handle empty result from database', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const logId = await startScrapingLog('empty-result');

      expect(logId).toBeNull();
    });

    test('should handle malformed database response', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ wrong_column: 123 }] // Wrong column name
      });

      const logId = await startScrapingLog('malformed-response');

      expect(logId).toBeUndefined();
    });

    test('should handle concurrent logging attempts', async () => {
      let callCount = 0;
      mockPool.query.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          rows: [{ log_scraping_start: 100000 + callCount }]
        });
      });

      // Start multiple logs concurrently
      const promises = [
        startScrapingLog('concurrent-1', 'Maker1'),
        startScrapingLog('concurrent-2', 'Maker2'),
        startScrapingLog('concurrent-3', 'Maker3')
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([100001, 100002, 100003]);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
  });
});