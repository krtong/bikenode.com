# Cabin Motorcycles Deployment Guide

This guide covers deployment procedures for the Cabin Motorcycles scraping and API system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Deployment](#development-deployment)
4. [Production Deployment](#production-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Migrations](#database-migrations)
8. [Health Monitoring](#health-monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Software
- Node.js 16+ and npm
- PostgreSQL 13+
- Redis 6+
- Docker and Docker Compose (for containerized deployment)
- Git

### Optional Software
- Nginx (for reverse proxy)
- PM2 (for process management)
- Grafana/Prometheus (for monitoring)

## Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd scrapers/cabin-motorcycles
   ```

2. **Run the setup script:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   This script will:
   - Check dependencies
   - Create required directories
   - Copy .env.example to .env
   - Install npm dependencies
   - Run database migrations

3. **Configure environment:**
   Edit `.env` with your specific configuration:
   ```bash
   nano .env
   ```

4. **Validate configuration:**
   ```bash
   node validate-env.js
   ```

## Development Deployment

### Local Development

1. **Start services manually:**
   ```bash
   # Start PostgreSQL and Redis (if not using Docker)
   sudo systemctl start postgresql redis

   # Run scrapers
   npm run scrape:all

   # Start health check server
   node health-check.js
   ```

2. **Using Docker Compose:**
   ```bash
   docker-compose up -d
   ```

### Development Best Practices
- Use `.env.development` for development-specific settings
- Enable debug logging: `LOG_LEVEL=debug`
- Use smaller scraping limits for faster testing
- Keep `SAVE_DEBUG_HTML=true` for troubleshooting

## Production Deployment

### Using the Deploy Script

1. **Run deployment:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh production
   ```

2. **What the script does:**
   - Validates environment
   - Runs tests
   - Creates backups
   - Builds Docker images
   - Runs migrations
   - Performs zero-downtime deployment
   - Runs health checks

### Manual Production Deployment

1. **Build and tag images:**
   ```bash
   docker build -t cabin-motorcycles:latest .
   docker tag cabin-motorcycles:latest cabin-motorcycles:v1.0.0
   ```

2. **Run migrations:**
   ```bash
   docker-compose run --rm scrapers node database/migrate.js
   ```

3. **Deploy services:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## Docker Deployment

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale scrapers
docker-compose up -d --scale scrapers=3

# Stop services
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

### Production Docker Compose

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  scrapers:
    restart: always
    environment:
      NODE_ENV: production
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `DB_NAME` | Database name | `bikenode` |

### Recommended Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `LOG_LEVEL` | Logging level | `info` |
| `SCRAPER_TIMEOUT` | Scraper timeout (ms) | `30000` |
| `RATE_LIMIT_ENABLED` | Enable API rate limiting | `true` |

### Environment-Specific Settings

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_SCHEDULED_SCRAPING=true
MONITORING_ENABLED=true
```

#### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_SCHEDULED_SCRAPING=false
DEBUG=true
```

## Database Migrations

### Running Migrations

1. **Using Docker:**
   ```bash
   docker-compose run --rm scrapers node database/migrate.js
   ```

2. **Manually:**
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/migrations/001_create_tables.sql
   ```

### Creating New Migrations

1. Create migration file: `database/migrations/XXX_description.sql`
2. Test in development
3. Add to version control
4. Deploy to production

## Health Monitoring

### Health Check Endpoints

- **Main health check:** `http://localhost:3000/health`
- **Readiness probe:** `http://localhost:3000/ready`
- **Liveness probe:** `http://localhost:3000/live`

### Monitoring Setup

1. **Prometheus metrics:**
   ```yaml
   - job_name: 'cabin-motorcycles'
     static_configs:
       - targets: ['localhost:3000']
   ```

2. **Grafana dashboard:**
   Import the dashboard from `monitoring/grafana-dashboard.json`

### Alerts Configuration

Configure alerts for:
- Service downtime
- High error rates
- Database connection failures
- Low disk space
- High memory usage

## Troubleshooting

### Common Issues

1. **Database connection errors:**
   ```bash
   # Check PostgreSQL status
   docker-compose ps postgres
   
   # View logs
   docker-compose logs postgres
   
   # Test connection
   psql -h localhost -U postgres -d bikenode
   ```

2. **Redis connection errors:**
   ```bash
   # Check Redis status
   docker-compose ps redis
   
   # Test connection
   redis-cli ping
   ```

3. **Scraper failures:**
   ```bash
   # View scraper logs
   docker-compose logs scrapers
   
   # Check debug HTML
   ls -la debug/
   
   # Run single scraper
   node scrapers/peraves-scraper.js
   ```

### Debug Mode

Enable debug mode for detailed logging:
```bash
DEBUG=true VERBOSE_LOGGING=true npm run scrape:all
```

## Rollback Procedures

### Quick Rollback

1. **Using Docker:**
   ```bash
   # Rollback to previous version
   docker-compose down
   docker tag cabin-motorcycles:previous cabin-motorcycles:latest
   docker-compose up -d
   ```

2. **Database rollback:**
   ```bash
   # Restore from backup
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backups/YYYYMMDD_HHMMSS/database.sql
   ```

### Full Rollback Process

1. **Stop current deployment:**
   ```bash
   docker-compose down
   ```

2. **Restore database:**
   ```bash
   # Drop and recreate database
   psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME"
   psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME"
   
   # Restore backup
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backups/latest/database.sql
   ```

3. **Deploy previous version:**
   ```bash
   git checkout <previous-version-tag>
   ./deploy.sh production
   ```

## Security Considerations

1. **Environment variables:**
   - Never commit `.env` files
   - Use secrets management in production
   - Rotate credentials regularly

2. **Network security:**
   - Use firewall rules
   - Enable SSL/TLS
   - Restrict database access

3. **Container security:**
   - Run as non-root user
   - Use minimal base images
   - Scan for vulnerabilities

## Maintenance

### Regular Tasks

1. **Daily:**
   - Check health endpoints
   - Review error logs
   - Monitor disk space

2. **Weekly:**
   - Run security updates
   - Review scraping success rates
   - Clean old debug files

3. **Monthly:**
   - Rotate logs
   - Update dependencies
   - Review and optimize queries

### Backup Strategy

1. **Automated backups:**
   ```bash
   # Add to crontab
   0 3 * * * /path/to/cabin-motorcycles/scripts/backup.sh
   ```

2. **Manual backup:**
   ```bash
   ./scripts/backup.sh
   ```

3. **Backup retention:**
   - Daily backups: 7 days
   - Weekly backups: 4 weeks
   - Monthly backups: 12 months

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Run diagnostics: `node health-check.js --check`
3. Review this documentation
4. Contact the development team