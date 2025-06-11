# Database Directory Structure

This directory contains all database-related files for the BikeNode project.

## Directory Structure

- **backups/** - Database backup files
  - Contains SQL dumps and backup files
  
- **data/** - Active database files
  - `bikenode.db` - Main application database
  - `bikes.db` - Bikes-specific database
  - `motorcycles.db` - Motorcycles database
  - `test_brands.db` - Test database for brand data
  
- **docs/** - Documentation
  - Database-related documentation and guides
  
- **migrations/** - Database migration files
  - SQL migration files for schema changes
  - Numbered migrations following the pattern: `00000X_description.up/down.sql`
  
- **reports/** - Generated reports and analysis
  - JSON reports and analysis outputs
  - `motorcycle_matches_to_review.json` - Review data for motorcycle matches
  - `motorcycle_specs_linkage_report.md` - Linkage analysis report
  
- **scripts/** - Database utility scripts
  - JavaScript scripts for database operations
  - `compare_manufacturers.js` - Compare manufacturer data
  - `research_manufacturer_urls.js` - Research manufacturer URLs
  
- **seed-data/** - Initial data for seeding databases
  - CSV, JSON, and text files with initial data
  - SQL scripts for populating tables

## Package Information

The database module uses Node.js dependencies listed in `package.json`.