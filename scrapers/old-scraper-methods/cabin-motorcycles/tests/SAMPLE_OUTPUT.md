# Sample Test Output

This is what you should see when running the tests:

## Running All Tests

```bash
$ npm test

> cabin-motorcycles-scraper@1.0.0 test
> cd tests && jest

 PASS  unit/validation.test.js
  Validation Module
    validateMotorcycleData
      ✓ should validate correct motorcycle data (3 ms)
      ✓ should reject missing required fields (1 ms)
      ✓ should reject invalid year (1 ms)
      ✓ should reject invalid category
      ✓ should validate string length limits (1 ms)
    validateSpecifications
      ✓ should validate correct specifications
      ✓ should reject invalid subcategory (1 ms)
      ✓ should validate engine specifications
      ✓ should validate dimensions
      ✓ should validate performance metrics (1 ms)
      ✓ should validate cabin features as array
    sanitizeString
      ✓ should remove SQL injection attempts
      ✓ should remove comments
      ✓ should trim whitespace (1 ms)
      ✓ should handle non-string input
    sanitizeMotorcycleData
      ✓ should sanitize all string fields
      ✓ should handle null package
    validateAndSanitize
      ✓ should sanitize and validate complete data (1 ms)
      ✓ should return errors for invalid data
      ✓ should validate specifications if present
    isDuplicate
      ✓ should detect exact duplicates
      ✓ should detect duplicates with case differences (1 ms)
      ✓ should handle null packages correctly
      ✓ should not detect non-duplicates
    Constants
      ✓ should export valid categories
      ✓ should export valid subcategories

 PASS  unit/database.test.js
  Database Module
    upsertMotorcycle
      ✓ should insert new motorcycle successfully (4 ms)
      ✓ should update existing motorcycle (1 ms)
      ✓ should handle validation errors (1 ms)
      ✓ should rollback on database error (1 ms)
      ✓ should handle null package correctly
    motorcycleExists
      ✓ should return true when motorcycle exists (1 ms)
      ✓ should return false when motorcycle does not exist
      ✓ should handle package parameter
      ✓ should handle database errors (1 ms)
    getMotorcyclesByMake
      ✓ should return motorcycles with specifications
      ✓ should return empty array for non-existent make
    Scraping Log Functions
      startScrapingLog
        ✓ should start scraping log and return ID (1 ms)
        ✓ should handle null manufacturer and metadata
        ✓ should return null on error
      completeScrapingLog
        ✓ should complete scraping log successfully (1 ms)
        ✓ should handle error status
        ✓ should handle database errors gracefully
      logScrapingActivity (legacy)
        ✓ should start and complete log in sequence
        ✓ should handle error parameter (1 ms)
        ✓ should not complete if start fails
    Pool configuration
      ✓ should configure pool without SSL in development

 PASS  unit/postgres-functions.test.js
  PostgreSQL Function Tests
    log_scraping_start function
      ✓ should handle basic parameters correctly (2 ms)
      ✓ should handle metadata parameter
      ✓ should handle null manufacturer
      ✓ should handle database errors gracefully (1 ms)
      ✓ should handle missing function error
    log_scraping_complete function
      ✓ should handle success status
      ✓ should handle failed status with error message
      ✓ should handle partial success with metadata (1 ms)
      ✓ should handle database errors gracefully
      ✓ should handle very long error messages
    logScrapingActivity (legacy wrapper)
      ✓ should orchestrate start and complete calls (1 ms)
      ✓ should not call complete if start fails
      ✓ should pass error message through
    PostgreSQL function parameter validation
      ✓ should handle special characters in scraper name
      ✓ should handle Unicode in manufacturer name (1 ms)
      ✓ should handle complex JSON metadata
    Edge cases and error scenarios
      ✓ should handle undefined vs null parameters differently
      ✓ should handle empty result from database
      ✓ should handle malformed database response (1 ms)
      ✓ should handle concurrent logging attempts

 PASS  integration/database.integration.test.js
  Database Integration Tests
    upsertMotorcycle integration
      ✓ should insert and retrieve motorcycle with specifications (125 ms)
      ✓ should update existing motorcycle specifications (45 ms)
      ✓ should handle multiple motorcycles from same manufacturer (89 ms)
      ✓ should handle constraint violations gracefully (32 ms)
    Scraping log integration
      ✓ should create and complete scraping log (112 ms)
      ✓ should handle failed scraping with error (25 ms)
      ✓ should track multiple concurrent scraping sessions (38 ms)
    Data integrity constraints
      ✓ should enforce unique constraint on year/make/model/package (28 ms)
      ✓ should allow same model with different packages (45 ms)
      ✓ should handle null package correctly in constraints (41 ms)

 PASS  integration/constraints.test.js
  Database Constraints Integration Tests
    Data Type Constraints
      ✓ should enforce year range constraints (15 ms)
      ✓ should enforce string length constraints (8 ms)
      ✓ should enforce non-empty string constraints (12 ms)
      ✓ should enforce category enum constraint (10 ms)
    Unique Constraints
      ✓ should enforce unique constraint on year/make/model/package combination (25 ms)
      ✓ should treat null package as distinct value (32 ms)
      ✓ should handle COALESCE in unique constraint (28 ms)
    Foreign Key Constraints
      ✓ should enforce spec_id foreign key constraint (15 ms)
      ✓ should cascade updates properly (22 ms)
    JSONB Constraints
      ✓ should enforce unique constraint on specifications JSONB (35 ms)
      ✓ should store complex JSONB data correctly (18 ms)
    SQL Injection Protection
      ✓ should sanitize SQL injection attempts in strings (125 ms)
      ✓ should handle XSS attempts in JSONB data (20 ms)
    Transaction Integrity
      ✓ should rollback entire transaction on partial failure (45 ms)
    Concurrent Access
      ✓ should handle concurrent inserts of same model gracefully (65 ms)
      ✓ should handle concurrent inserts of different models (72 ms)

Test Suites: 5 passed, 5 total
Tests:       108 passed, 108 total
Snapshots:   0 total
Time:        3.245 s
```

## Running Unit Tests Only

```bash
$ npm run test:unit

> cabin-motorcycles-scraper@1.0.0 test:unit
> cd tests && jest unit/

 PASS  unit/validation.test.js (26 tests)
 PASS  unit/database.test.js (22 tests)
 PASS  unit/postgres-functions.test.js (20 tests)

Test Suites: 3 passed, 3 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        0.892 s
```

## Running with Coverage

```bash
$ npm run test:coverage

> cabin-motorcycles-scraper@1.0.0 test:coverage
> cd tests && jest --coverage

... test output ...

-----------------------------|---------|----------|---------|---------|-------------------
File                         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------------------|---------|----------|---------|---------|-------------------
All files                    |   95.12 |    92.31 |   96.77 |   95.65 |                   
 shared                      |   94.87 |    91.67 |   96.43 |   95.45 |                   
  constants.js               |     100 |      100 |     100 |     100 |                   
  database.js                |   92.31 |    88.89 |   94.74 |   92.86 | 70,124            
  utils.js                   |     100 |      100 |     100 |     100 |                   
  validation.js              |   96.15 |    93.75 |     100 |   96.83 | 67,117            
 bmw                         |     100 |      100 |     100 |     100 |                   
  models.js                  |     100 |      100 |     100 |     100 |                   
 honda                       |     100 |      100 |     100 |     100 |                   
  models.js                  |     100 |      100 |     100 |     100 |                   
 peraves                     |     100 |      100 |     100 |     100 |                   
  models.js                  |     100 |      100 |     100 |     100 |                   
 lit-motors                  |     100 |      100 |     100 |     100 |                   
  models.js                  |     100 |      100 |     100 |     100 |                   
-----------------------------|---------|----------|---------|---------|-------------------
```

## Running in Watch Mode

```bash
$ npm run test:watch

 PASS  unit/validation.test.js
 PASS  unit/database.test.js

Test Suites: 2 passed, 2 total
Tests:       48 passed, 48 total

Watch Usage
 › Press f to run only failed tests.
 › Press o to only run tests related to changed files.
 › Press p to filter by a filename regex pattern.
 › Press t to filter by a test name regex pattern.
 › Press q to quit watch mode.
 › Press Enter to trigger a test run.
```

## CI Output (GitHub Actions)

```
Run npm run test:unit
  
> cabin-motorcycles-scraper@1.0.0 test:unit
> cd tests && jest unit/

PASS unit/validation.test.js
PASS unit/database.test.js  
PASS unit/postgres-functions.test.js

Test Suites: 3 passed, 3 total
Tests:       68 passed, 68 total
Snapshots:   0 total
Time:        0.723s, estimated 1s
Ran all test suites matching /unit\//i.

✅ Unit tests passed for Node.js 18.x
```