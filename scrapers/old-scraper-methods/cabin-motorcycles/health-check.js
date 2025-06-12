/**
 * Health Check Service for Cabin Motorcycles System
 * Provides health status endpoints and monitoring
 */

const http = require('http');
const { Pool } = require('pg');
const redis = require('redis');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

class HealthChecker {
  constructor() {
    this.checks = {
      system: this.checkSystem.bind(this),
      database: this.checkDatabase.bind(this),
      redis: this.checkRedis.bind(this),
      filesystem: this.checkFilesystem.bind(this),
      scrapers: this.checkScrapers.bind(this)
    };
    
    this.port = process.env.HEALTH_CHECK_PORT || 3000;
  }

  async checkSystem() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      name: 'system',
      status: 'healthy',
      details: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        pid: process.pid,
        node_version: process.version
      }
    };
  }

  async checkDatabase() {
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'bikenode',
      connectionTimeoutMillis: 5000
    });

    try {
      const start = Date.now();
      const result = await pool.query('SELECT COUNT(*) FROM motorcycle_data_make_model_year WHERE category = $1', ['cabin']);
      const latency = Date.now() - start;
      
      await pool.end();
      
      return {
        name: 'database',
        status: 'healthy',
        details: {
          connected: true,
          latency,
          cabin_motorcycles_count: parseInt(result.rows[0].count)
        }
      };
    } catch (error) {
      await pool.end();
      return {
        name: 'database',
        status: 'unhealthy',
        error: error.message,
        details: {
          connected: false
        }
      };
    }
  }

  async checkRedis() {
    const client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        client.quit();
        resolve({
          name: 'redis',
          status: 'unhealthy',
          error: 'Connection timeout',
          details: { connected: false }
        });
      }, 5000);

      client.on('error', (err) => {
        clearTimeout(timeout);
        client.quit();
        resolve({
          name: 'redis',
          status: 'unhealthy',
          error: err.message,
          details: { connected: false }
        });
      });

      client.on('ready', async () => {
        clearTimeout(timeout);
        
        try {
          const start = Date.now();
          await client.ping();
          const latency = Date.now() - start;
          
          const info = await new Promise((res, rej) => {
            client.info((err, reply) => {
              if (err) rej(err);
              else res(reply);
            });
          });
          
          const memoryUsed = info.match(/used_memory_human:(.+)/)?.[1]?.trim();
          
          client.quit();
          
          resolve({
            name: 'redis',
            status: 'healthy',
            details: {
              connected: true,
              latency,
              memory_used: memoryUsed
            }
          });
        } catch (error) {
          client.quit();
          resolve({
            name: 'redis',
            status: 'unhealthy',
            error: error.message,
            details: { connected: false }
          });
        }
      });

      client.connect().catch(() => {
        // Error handled in error event
      });
    });
  }

  async checkFilesystem() {
    const directories = ['data', 'logs', 'debug'];
    const results = {
      name: 'filesystem',
      status: 'healthy',
      details: {
        directories: {}
      }
    };

    for (const dir of directories) {
      try {
        const stats = await fs.stat(dir);
        results.details.directories[dir] = {
          exists: true,
          writable: true
        };
        
        // Test write access
        const testFile = path.join(dir, '.healthcheck');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
      } catch (error) {
        results.status = 'degraded';
        results.details.directories[dir] = {
          exists: false,
          writable: false,
          error: error.message
        };
      }
    }

    return results;
  }

  async checkScrapers() {
    const scraperFiles = [
      'scrapers/peraves-scraper.js',
      'scrapers/bmw-c1-scraper.js',
      'scrapers/honda-gyro-scraper.js',
      'scrapers/lit-motors-scraper.js'
    ];

    const results = {
      name: 'scrapers',
      status: 'healthy',
      details: {
        scrapers: {}
      }
    };

    for (const file of scraperFiles) {
      const scraperName = path.basename(file, '.js');
      try {
        await fs.access(file);
        results.details.scrapers[scraperName] = {
          available: true
        };
      } catch (error) {
        results.status = 'degraded';
        results.details.scrapers[scraperName] = {
          available: false,
          error: 'File not found'
        };
      }
    }

    // Check last scrape time
    try {
      const trackingData = await fs.readFile('data/update-tracking.json', 'utf8');
      const tracking = JSON.parse(trackingData);
      const lastScrape = Object.values(tracking.urls)
        .map(u => u.lastChecked)
        .filter(Boolean)
        .sort()
        .pop();
      
      if (lastScrape) {
        const hoursSinceLastScrape = (Date.now() - new Date(lastScrape).getTime()) / 1000 / 60 / 60;
        results.details.last_scrape = {
          timestamp: lastScrape,
          hours_ago: Math.round(hoursSinceLastScrape)
        };
      }
    } catch (error) {
      // Tracking file may not exist yet
    }

    return results;
  }

  async runAllChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: []
    };

    for (const [name, checkFn] of Object.entries(this.checks)) {
      try {
        const result = await checkFn();
        results.checks.push(result);
        
        if (result.status === 'unhealthy') {
          results.status = 'unhealthy';
        } else if (result.status === 'degraded' && results.status === 'healthy') {
          results.status = 'degraded';
        }
      } catch (error) {
        results.checks.push({
          name,
          status: 'unhealthy',
          error: error.message
        });
        results.status = 'unhealthy';
      }
    }

    return results;
  }

  startServer() {
    const server = http.createServer(async (req, res) => {
      if (req.url === '/health' || req.url === '/') {
        try {
          const results = await this.runAllChecks();
          const statusCode = results.status === 'healthy' ? 200 : 
                           results.status === 'degraded' ? 200 : 503;
          
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(results, null, 2));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            error: error.message
          }));
        }
      } else if (req.url === '/ready') {
        // Simple readiness check
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ready');
      } else if (req.url === '/live') {
        // Simple liveness check
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('alive');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(this.port, () => {
      console.log(`Health check server running on port ${this.port}`);
    });
  }
}

// If running directly, start the server
if (require.main === module) {
  const checker = new HealthChecker();
  
  // If --check flag is passed, run checks and exit
  if (process.argv.includes('--check')) {
    checker.runAllChecks().then(results => {
      console.log(JSON.stringify(results, null, 2));
      process.exit(results.status === 'healthy' ? 0 : 1);
    });
  } else {
    // Otherwise start the HTTP server
    checker.startServer();
  }
}

module.exports = HealthChecker;