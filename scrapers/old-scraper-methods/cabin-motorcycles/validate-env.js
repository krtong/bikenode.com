/**
 * Environment Validation Script
 * Validates required environment variables and configuration
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Configuration schema
const ENV_SCHEMA = {
  // Required variables
  required: {
    DB_HOST: 'Database host',
    DB_PORT: 'Database port',
    DB_USER: 'Database user',
    DB_PASSWORD: 'Database password',
    DB_NAME: 'Database name'
  },
  
  // Optional but recommended
  recommended: {
    REDIS_HOST: 'Redis host',
    REDIS_PORT: 'Redis port',
    NODE_ENV: 'Node environment',
    LOG_LEVEL: 'Log level',
    SCRAPER_USER_AGENT: 'Scraper user agent'
  },
  
  // Numeric validations
  numeric: {
    DB_PORT: { min: 1, max: 65535 },
    REDIS_PORT: { min: 1, max: 65535 },
    SCRAPER_TIMEOUT: { min: 1000, max: 300000 },
    SCRAPER_RETRY_ATTEMPTS: { min: 0, max: 10 }
  },
  
  // Enum validations
  enums: {
    NODE_ENV: ['development', 'staging', 'production', 'test'],
    LOG_LEVEL: ['error', 'warn', 'info', 'debug', 'trace']
  },
  
  // Boolean validations
  boolean: [
    'RATE_LIMIT_ENABLED',
    'CACHE_ENABLED',
    'MONITORING_ENABLED',
    'ENABLE_SCHEDULED_SCRAPING',
    'DEBUG',
    'VERBOSE_LOGGING'
  ]
};

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }
  
  validate() {
    console.log('Validating environment configuration...\n');
    
    // Check required variables
    this.checkRequired();
    
    // Check recommended variables
    this.checkRecommended();
    
    // Validate numeric values
    this.validateNumeric();
    
    // Validate enums
    this.validateEnums();
    
    // Validate booleans
    this.validateBooleans();
    
    // Check file paths
    this.checkPaths();
    
    // Check database connection
    this.checkDatabaseConnection();
    
    // Print results
    this.printResults();
    
    return this.errors.length === 0;
  }
  
  checkRequired() {
    console.log('Checking required variables...');
    
    for (const [key, description] of Object.entries(ENV_SCHEMA.required)) {
      if (!process.env[key]) {
        this.errors.push(`Missing required variable: ${key} (${description})`);
      } else {
        console.log(`  ✓ ${key}`);
      }
    }
  }
  
  checkRecommended() {
    console.log('\nChecking recommended variables...');
    
    for (const [key, description] of Object.entries(ENV_SCHEMA.recommended)) {
      if (!process.env[key]) {
        this.warnings.push(`Missing recommended variable: ${key} (${description})`);
        console.log(`  ! ${key} (not set)`);
      } else {
        console.log(`  ✓ ${key}`);
      }
    }
  }
  
  validateNumeric() {
    console.log('\nValidating numeric values...');
    
    for (const [key, constraints] of Object.entries(ENV_SCHEMA.numeric)) {
      const value = process.env[key];
      if (value) {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          this.errors.push(`${key} must be a number, got: ${value}`);
        } else if (num < constraints.min || num > constraints.max) {
          this.errors.push(`${key} must be between ${constraints.min} and ${constraints.max}, got: ${num}`);
        } else {
          console.log(`  ✓ ${key} = ${num}`);
        }
      }
    }
  }
  
  validateEnums() {
    console.log('\nValidating enum values...');
    
    for (const [key, validValues] of Object.entries(ENV_SCHEMA.enums)) {
      const value = process.env[key];
      if (value && !validValues.includes(value)) {
        this.errors.push(`${key} must be one of: ${validValues.join(', ')}, got: ${value}`);
      } else if (value) {
        console.log(`  ✓ ${key} = ${value}`);
      }
    }
  }
  
  validateBooleans() {
    console.log('\nValidating boolean values...');
    
    const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];
    
    for (const key of ENV_SCHEMA.boolean) {
      const value = process.env[key];
      if (value && !validBooleans.includes(value.toLowerCase())) {
        this.errors.push(`${key} must be a boolean value, got: ${value}`);
      } else if (value) {
        console.log(`  ✓ ${key} = ${value}`);
      }
    }
  }
  
  checkPaths() {
    console.log('\nChecking directory paths...');
    
    const paths = [
      process.env.DATA_DIR || './data',
      process.env.LOGS_DIR || './logs',
      process.env.DEBUG_DIR || './debug',
      process.env.BACKUP_DIR || './backups'
    ];
    
    for (const dirPath of paths) {
      if (!fs.existsSync(dirPath)) {
        this.warnings.push(`Directory does not exist: ${dirPath}`);
        console.log(`  ! ${dirPath} (missing)`);
      } else {
        const stats = fs.statSync(dirPath);
        if (!stats.isDirectory()) {
          this.errors.push(`Path is not a directory: ${dirPath}`);
        } else {
          console.log(`  ✓ ${dirPath}`);
        }
      }
    }
  }
  
  async checkDatabaseConnection() {
    console.log('\nChecking database connection...');
    
    if (!process.env.DB_HOST || !process.env.DB_USER) {
      console.log('  ! Skipping database check (missing configuration)');
      return;
    }
    
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionTimeoutMillis: 5000
    });
    
    try {
      await pool.query('SELECT 1');
      console.log('  ✓ Database connection successful');
      await pool.end();
    } catch (error) {
      this.warnings.push(`Database connection failed: ${error.message}`);
      console.log('  ! Database connection failed');
      await pool.end();
    }
  }
  
  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('VALIDATION RESULTS');
    console.log('='.repeat(50));
    
    if (this.errors.length > 0) {
      console.log('\nERRORS:');
      this.errors.forEach(error => {
        console.log(`  ✗ ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\nWARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`  ! ${warning}`);
      });
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All validation checks passed!');
    } else {
      console.log(`\nSummary: ${this.errors.length} errors, ${this.warnings.length} warnings`);
    }
    
    console.log('='.repeat(50) + '\n');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  const isValid = validator.validate();
  
  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

module.exports = EnvironmentValidator;