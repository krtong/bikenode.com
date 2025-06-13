# Cabin Motorcycles Tests

> **⚠️ Testing Principles**
> - Test with real database operations and actual data flows only
> - Don't assume functionality works - verify through actual tests
> - Document real test results and discovered edge cases
> - Leave room for discovering unexpected behaviors in production
> - See core principles in [README_BEFORE_MAKING_ANY_PAGE.md]

Comprehensive test suite for the cabin motorcycles database operations, validation, and PostgreSQL functions.

## Test Structure

```
tests/
├── unit/                      # Unit tests (no database required)
│   ├── validation.test.js     # Tests for data validation and sanitization
│   ├── database.test.js       # Tests for database operations (mocked)
│   └── postgres-functions.test.js  # Tests for PostgreSQL function calls
├── integration/               # Integration tests (requires test database)
│   ├── database.integration.test.js  # Tests with real database
│   └── constraints.test.js    # Tests for database constraints
├── fixtures/                  # Test data and utilities
│   └── mock-data.js          # Mock motorcycle data for testing
├── jest.config.js            # Jest configuration
├── setup.js                  # Test environment setup
└── .env.test                 # Test environment variables

```

## Setup

### 1. Install Dependencies

```bash
cd /path/to/cabin-motorcycles
npm install
```

### 2. Configure Test Database

For integration tests, you need a PostgreSQL test database. Update `.env.test`:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/bikenode_test
TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5432/bikenode_test
```

### 3. Create Test Database

```sql
CREATE DATABASE bikenode_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE bikenode_test TO test_user;
```

### 4. Run Migrations

Apply the necessary migrations to your test database:

```bash
psql -U test_user -d bikenode_test < ../../database/migrations/create_scraping_logs_table.sql
psql -U test_user -d bikenode_test < ../../database/migrations/add_cabin_motorcycles.sql
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm test -- unit/
```

### Run Integration Tests Only
```bash
npm test -- integration/
```

### Run Specific Test File
```bash
npm test -- validation.test.js
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run in Watch Mode
```bash
npm test -- --watch
```

### Run with Verbose Output
```bash
DEBUG_TESTS=1 npm test -- --verbose
```

## Test Categories

### Unit Tests

#### validation.test.js
- Tests all validation functions
- Tests sanitization of user input
- Tests SQL injection prevention
- Tests duplicate detection
- No database connection required

#### database.test.js
- Tests database operations with mocked PostgreSQL
- Tests transaction handling
- Tests error scenarios
- Tests connection pooling

#### postgres-functions.test.js
- Tests PostgreSQL function calls
- Tests parameter handling
- Tests error recovery
- Tests concurrent operations

### Integration Tests

#### database.integration.test.js
- Tests with real PostgreSQL database
- Tests full CRUD operations
- Tests transaction integrity
- Tests data retrieval and joins
- **Requires test database**

#### constraints.test.js
- Tests database constraints
- Tests unique constraints
- Tests foreign key relationships
- Tests data type validations
- Tests SQL injection protection
- **Requires test database**

## Mock Data

The `fixtures/mock-data.js` file provides:
- Valid motorcycle data (Peraves, BMW C1, Honda Gyro, Lit Motors)
- Invalid data for testing validation
- SQL injection test strings
- XSS test strings
- Mock scraping logs
- Utility functions for generating test data

## Writing New Tests

### Adding a Unit Test

```javascript
describe('New Feature', () => {
  test('should do something', () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Adding an Integration Test

```javascript
describe.skipIf('Database Feature', () => {
  beforeEach(async () => {
    // Clean database state
    await testClient.query('DELETE FROM my_table');
  });

  test('should interact with database', async () => {
    // Test real database operations
    const result = await databaseFunction();
    expect(result).toBeDefined();
  });
});
```

## Continuous Integration

For CI environments without a test database:
- Unit tests will always run
- Integration tests will be skipped if `TEST_DATABASE_URL` is not set
- Use `npm test -- unit/` to run only unit tests in CI

## Troubleshooting

### Tests Hanging
- Check for unreleased database connections
- Ensure `afterAll` hooks close pools
- Use `--forceExit` flag if needed

### Database Connection Errors
- Verify PostgreSQL is running
- Check credentials in `.env.test`
- Ensure test database exists
- Check firewall/network settings

### Permission Errors
- Grant necessary permissions to test user
- Ensure test user can create tables
- Check PostgreSQL pg_hba.conf settings

### Constraint Violations
- Clean test data between tests
- Use transactions for test isolation
- Check for leftover data from failed tests

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clean State**: Always clean up test data
3. **Mock External Services**: Don't make real HTTP requests
4. **Use Fixtures**: Reuse test data from mock-data.js
5. **Test Edge Cases**: Include boundary conditions
6. **Error Testing**: Test both success and failure paths
7. **Descriptive Names**: Use clear test descriptions
8. **Fast Tests**: Keep unit tests fast (<100ms)
9. **Deterministic**: Tests should not depend on timing
10. **Coverage**: Aim for >80% code coverage

## NPM Scripts

Add these to the main package.json:

```json
{
  "scripts": {
    "test": "cd tests && jest",
    "test:unit": "cd tests && jest unit/",
    "test:integration": "cd tests && jest integration/",
    "test:coverage": "cd tests && jest --coverage",
    "test:watch": "cd tests && jest --watch"
  }
}
```