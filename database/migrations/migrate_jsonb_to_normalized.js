#!/usr/bin/env node
/**
 * Migration Script: JSONB to Normalized Bike Schema
 * ================================================
 * 
 * This script extracts bike data from the scraped JSON files and populates
 * the normalized PostgreSQL schema.
 * 
 * Usage: node migrate_jsonb_to_normalized.js [--file=path] [--limit=N] [--dry-run]
 */

import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

class BikeDataMigration {
  constructor() {
    this.pool = new pg.Pool(dbConfig);
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
    this.dryRun = false;
  }

  async initialize() {
    // Test database connection
    try {
      const client = await this.pool.connect();
      console.log(chalk.green("✅ Database connection established"));
      client.release();
    } catch (err) {
      console.error(chalk.red("❌ Database connection failed:"), err.message);
      throw err;
    }
  }

  /**
   * Insert or get manufacturer
   */
  async insertManufacturer(makerId, name, url = null) {
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert manufacturer: ${makerId} - ${name}`));
      return 1; // Return dummy ID
    }

    const result = await this.pool.query(`
      INSERT INTO manufacturers (maker_id, name, url)
      VALUES ($1, $2, $3)
      ON CONFLICT (maker_id) DO UPDATE SET
        name = EXCLUDED.name,
        url = COALESCE(EXCLUDED.url, manufacturers.url)
      RETURNING id
    `, [makerId, name, url]);
    
    return result.rows[0].id;
  }

  /**
   * Insert or get bike family
   */
  async insertBikeFamily(familyId, familyName, manufacturerId) {
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert family: ${familyId} - ${familyName}`));
      return 1; // Return dummy ID
    }

    const result = await this.pool.query(`
      INSERT INTO bike_families (family_id, family_name, manufacturer_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (family_id) DO UPDATE SET
        family_name = EXCLUDED.family_name,
        manufacturer_id = EXCLUDED.manufacturer_id
      RETURNING id
    `, [familyId, familyName, manufacturerId]);
    
    return result.rows[0].id;
  }

  /**
   * Insert main bike record
   */
  async insertBike(bike, keyid, manufacturerId, familyId, extractedAt, sourceVariant, hasEmbeddedData) {
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert bike: ${bike.id}`));
      return 1; // Return dummy ID
    }

    const result = await this.pool.query(`
      INSERT INTO bikes (
        bike_id, keyid, url, manufacturer_id, family_id, year, model, model_id,
        category, build_kind, gender, is_frameset, is_ebike,
        msrp, display_price_amount, display_price_currency,
        display_sale_price_amount, display_sale_price_currency,
        frame_material, suspension_config, wheel_configuration,
        description, manufacturer_url, manufacturer_product_url,
        has_full_geometry, is_latest_family_year, is_new_release, has_award,
        primary_thumbnail_url, extracted_at, source_variant, has_embedded_data
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31, $32
      )
      ON CONFLICT (bike_id) DO UPDATE SET
        keyid = EXCLUDED.keyid,
        url = EXCLUDED.url,
        manufacturer_id = EXCLUDED.manufacturer_id,
        family_id = EXCLUDED.family_id,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      bike.id,
      keyid,
      bike.url,
      manufacturerId,
      familyId,
      bike.year,
      bike.model,
      bike.modelId,
      bike.category,
      bike.buildKind || 'complete',
      bike.gender || 'unisex',
      bike.isFrameset || false,
      bike.isEbike || false,
      bike.msrp,
      bike.displayPrice?.amount,
      bike.displayPrice?.currency || 'USD',
      bike.displaySalePrice?.amount,
      bike.displaySalePrice?.currency,
      bike.frameMaterial,
      bike.suspension?.configuration,
      bike.wheels?.configuration,
      bike.description,
      bike.manufacturerUrl,
      bike.manufacturerProductUrl,
      bike.hasFullGeometry || false,
      bike.isLatestFamilyYear || false,
      bike.isNewRelease || false,
      bike.hasAward || false,
      bike.primaryThumbnailURL,
      extractedAt,
      sourceVariant,
      hasEmbeddedData
    ]);
    
    return result.rows[0].id;
  }

  /**
   * Insert bike subcategories
   */
  async insertSubcategories(bikeId, subcategories) {
    if (!subcategories || subcategories.length === 0) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert ${subcategories.length} subcategories`));
      return;
    }

    for (const subcategory of subcategories) {
      await this.pool.query(`
        INSERT INTO bike_subcategories (bike_id, subcategory)
        VALUES ($1, $2)
        ON CONFLICT (bike_id, subcategory) DO NOTHING
      `, [bikeId, subcategory]);
    }
  }

  /**
   * Insert bike colors
   */
  async insertColors(bikeId, colors) {
    if (!colors || colors.length === 0) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert ${colors.length} colors`));
      return;
    }

    for (const color of colors) {
      await this.pool.query(`
        INSERT INTO bike_colors (bike_id, color_key, color_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (bike_id, color_key) DO NOTHING
      `, [bikeId, color.key, color.name]);
    }
  }

  /**
   * Insert wheel kinds
   */
  async insertWheelKinds(bikeId, wheels) {
    if (!wheels?.kinds || wheels.kinds.length === 0) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert ${wheels.kinds.length} wheel kinds`));
      return;
    }

    for (const wheelKind of wheels.kinds) {
      await this.pool.query(`
        INSERT INTO bike_wheel_kinds (bike_id, wheel_kind)
        VALUES ($1, $2)
        ON CONFLICT (bike_id, wheel_kind) DO NOTHING
      `, [bikeId, wheelKind]);
    }
  }

  /**
   * Insert bike features
   */
  async insertFeatures(bikeId, features) {
    if (!features || features.length === 0) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert ${features.length} features`));
      return;
    }

    for (const feature of features) {
      await this.pool.query(`
        INSERT INTO bike_features (bike_id, feature)
        VALUES ($1, $2)
        ON CONFLICT (bike_id, feature) DO NOTHING
      `, [bikeId, feature]);
    }
  }

  /**
   * Insert family siblings
   */
  async insertFamilySiblings(bikeId, family) {
    if (!family?.siblings || family.siblings.length === 0) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert ${family.siblings.length} family siblings`));
      return;
    }

    for (const sibling of family.siblings) {
      await this.pool.query(`
        INSERT INTO family_siblings (bike_id, sibling_bike_id, sibling_msrp)
        VALUES ($1, $2, $3)
        ON CONFLICT (bike_id, sibling_bike_id) DO NOTHING
      `, [bikeId, sibling.id, sibling.msrp]);
    }
  }

  /**
   * Insert bike components
   */
  async insertComponents(bikeId, components) {
    if (!components) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert ${Object.keys(components).length} components`));
      return;
    }

    for (const [componentType, component] of Object.entries(components)) {
      if (component && component.description) {
        await this.pool.query(`
          INSERT INTO bike_components (bike_id, component_type, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (bike_id, component_type) DO UPDATE SET
            description = EXCLUDED.description
        `, [bikeId, componentType, component.description]);
      }
    }
  }

  /**
   * Insert gearing data
   */
  async insertGearing(bikeId, gearing) {
    if (!gearing) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert gearing data`));
      return;
    }

    // First check if gearing exists for this bike
    const existing = await this.pool.query('SELECT id FROM bike_gearing WHERE bike_id = $1', [bikeId]);
    
    if (existing.rows.length > 0) {
      // Update existing
      await this.pool.query(`
        UPDATE bike_gearing SET
          front_count = $2, front_min = $3, front_max = $4,
          rear_count = $5, rear_min = $6, rear_max = $7,
          gear_inches_low = $8, gear_inches_high = $9
        WHERE bike_id = $1
      `, [
        bikeId,
        gearing.front?.count,
        gearing.front?.min,
        gearing.front?.max,
        gearing.rear?.count,
        gearing.rear?.min,
        gearing.rear?.max,
        gearing.gearInches?.low,
        gearing.gearInches?.high
      ]);
    } else {
      // Insert new
      await this.pool.query(`
        INSERT INTO bike_gearing (
          bike_id, front_count, front_min, front_max, rear_count, rear_min, rear_max,
          gear_inches_low, gear_inches_high
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        bikeId,
        gearing.front?.count,
        gearing.front?.min,
        gearing.front?.max,
        gearing.rear?.count,
        gearing.rear?.min,
        gearing.rear?.max,
        gearing.gearInches?.low,
        gearing.gearInches?.high
      ]);
    }
  }

  /**
   * Insert bike sizes and geometry
   */
  async insertSizesAndGeometry(bikeId, sizes) {
    if (!sizes || sizes.length === 0) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert ${sizes.length} sizes and geometry data`));
      return;
    }

    for (const size of sizes) {
      // Insert size
      const sizeResult = await this.pool.query(`
        INSERT INTO bike_sizes (
          bike_id, size_name, size_key, frame_size,
          front_wheel_kind, rear_wheel_kind,
          rider_height_min_cm, rider_height_max_cm, rider_height_confidence
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (bike_id, size_key) DO UPDATE SET
          size_name = EXCLUDED.size_name,
          frame_size = EXCLUDED.frame_size,
          front_wheel_kind = EXCLUDED.front_wheel_kind,
          rear_wheel_kind = EXCLUDED.rear_wheel_kind,
          rider_height_min_cm = EXCLUDED.rider_height_min_cm,
          rider_height_max_cm = EXCLUDED.rider_height_max_cm,
          rider_height_confidence = EXCLUDED.rider_height_confidence
        RETURNING id
      `, [
        bikeId,
        size.name,
        size.key,
        size.frameSize,
        size.wheelKinds?.front,
        size.wheelKinds?.rear,
        size.riderHeight?.minCM,
        size.riderHeight?.maxCM,
        size.riderHeight?.confidence
      ]);

      const sizeId = sizeResult.rows[0].id;

      // Insert geometry measurements
      if (size.geometry) {
        for (const [measurementType, value] of Object.entries(size.geometry)) {
          if (typeof value === 'number') {
            await this.pool.query(`
              INSERT INTO bike_geometry (bike_size_id, measurement_type, value_mm)
              VALUES ($1, $2, $3)
              ON CONFLICT (bike_size_id, measurement_type) DO UPDATE SET
                value_mm = EXCLUDED.value_mm
            `, [sizeId, measurementType, value]);
          }
        }
      }
    }
  }

  /**
   * Insert bike images
   */
  async insertImages(bikeId, images) {
    if (!images || images.length === 0) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert ${images.length} images`));
      return;
    }

    // First delete existing images for this bike to avoid duplicates
    await this.pool.query('DELETE FROM bike_images WHERE bike_id = $1', [bikeId]);
    
    // Insert all images
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      await this.pool.query(`
        INSERT INTO bike_images (
          bike_id, url, width, height, color_key, color_name, tags, image_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        bikeId,
        image.url,
        image.dimensions?.width,
        image.dimensions?.height,
        image.colorKey,
        image.colorName,
        image.tags || [],
        i
      ]);
    }
  }

  /**
   * Insert analysis data
   */
  async insertAnalysis(bikeId, analysis) {
    if (!analysis) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert analysis data`));
      return;
    }

    // Check if analysis exists for this bike
    const existing = await this.pool.query('SELECT id FROM bike_analysis WHERE bike_id = $1', [bikeId]);
    
    if (existing.rows.length > 0) {
      // Update existing
      await this.pool.query(`
        UPDATE bike_analysis SET
          spec_level = $2, ride_feel = $3, popularity = $4, geometry_analysis = $5
        WHERE bike_id = $1
      `, [
        bikeId,
        JSON.stringify(analysis.specLevel),
        JSON.stringify(analysis.rideFeel),
        JSON.stringify(analysis.popularity),
        JSON.stringify(analysis.geometry)
      ]);
    } else {
      // Insert new
      await this.pool.query(`
        INSERT INTO bike_analysis (bike_id, spec_level, ride_feel, popularity, geometry_analysis)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        bikeId,
        JSON.stringify(analysis.specLevel),
        JSON.stringify(analysis.rideFeel),
        JSON.stringify(analysis.popularity),
        JSON.stringify(analysis.geometry)
      ]);
    }
  }

  /**
   * Insert raw data
   */
  async insertRawData(bikeId, rawData) {
    if (!rawData) return;
    
    if (this.dryRun) {
      console.log(chalk.blue(`[DRY RUN] Would insert raw data`));
      return;
    }

    // Check if raw data exists for this bike
    const existing = await this.pool.query('SELECT id FROM bike_raw_data WHERE bike_id = $1', [bikeId]);
    
    if (existing.rows.length > 0) {
      // Update existing
      await this.pool.query(`
        UPDATE bike_raw_data SET
          page_info = $2, embedded_data = $3, visible_data = $4, raw_scripts = $5
        WHERE bike_id = $1
      `, [
        bikeId,
        JSON.stringify(rawData.pageInfo),
        JSON.stringify(rawData.embeddedData),
        JSON.stringify(rawData.visibleData),
        JSON.stringify(rawData.rawScripts)
      ]);
    } else {
      // Insert new
      await this.pool.query(`
        INSERT INTO bike_raw_data (bike_id, page_info, embedded_data, visible_data, raw_scripts)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        bikeId,
        JSON.stringify(rawData.pageInfo),
        JSON.stringify(rawData.embeddedData),
        JSON.stringify(rawData.visibleData),
        JSON.stringify(rawData.rawScripts)
      ]);
    }
  }

  /**
   * Process a single bike record
   */
  async processBike(keyid, bikeData) {
    const client = await this.pool.connect();
    
    try {
      if (!this.dryRun) await client.query('BEGIN');
      
      const bike = bikeData.bike;
      if (!bike) {
        throw new Error('No bike data found');
      }

      console.log(chalk.blue(`  Processing: ${bike.manufacturer} ${bike.model} ${bike.year}`));

      // 1. Insert manufacturer
      const manufacturerId = await this.insertManufacturer(
        bike.makerId,
        bike.manufacturer,
        bike.manufacturerUrl
      );

      // 2. Insert bike family
      let familyId = null;
      if (bike.familyId && bike.familyName) {
        familyId = await this.insertBikeFamily(
          bike.familyId,
          bike.familyName,
          manufacturerId
        );
      }

      // 3. Insert main bike record
      const bikeId = await this.insertBike(
        bike,
        keyid,
        manufacturerId,
        familyId,
        bikeData.extractedAt,
        bikeData.variant,
        bikeData.hasEmbeddedData
      );

      // 4. Insert related data
      await Promise.all([
        this.insertSubcategories(bikeId, bike.subcategories),
        this.insertColors(bikeId, bike.colors),
        this.insertWheelKinds(bikeId, bike.wheels),
        this.insertFeatures(bikeId, bike.features),
        this.insertFamilySiblings(bikeId, bike.family),
        this.insertComponents(bikeId, bike.components),
        this.insertGearing(bikeId, bike.gearing),
        this.insertSizesAndGeometry(bikeId, bike.sizes),
        this.insertImages(bikeId, bike.images),
        this.insertAnalysis(bikeId, bike.analysis),
        this.insertRawData(bikeId, bikeData.raw)
      ]);

      if (!this.dryRun) await client.query('COMMIT');
      
      console.log(chalk.green(`  ✅ Successfully processed bike ${bike.id}`));
      this.stats.successful++;
      
    } catch (error) {
      if (!this.dryRun) await client.query('ROLLBACK');
      console.log(chalk.red(`  ❌ Error processing bike: ${error.message}`));
      this.stats.failed++;
      this.stats.errors.push({
        keyid,
        bike: bikeData.bike?.id,
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * Main migration function
   */
  async migrate(filePath, limit = null) {
    console.log(chalk.bold('\n🚀 Bike Data Migration: JSONB to Normalized Schema\n'));
    
    if (this.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - No data will be written to database\n'));
    }

    // Load JSON data
    console.log(chalk.blue(`📂 Loading data from: ${filePath}`));
    const rawData = await fs.readFile(filePath, 'utf8');
    const bikeData = JSON.parse(rawData);
    
    const bikes = Object.entries(bikeData);
    const totalBikes = limit ? Math.min(bikes.length, limit) : bikes.length;
    
    console.log(chalk.blue(`📊 Found ${bikes.length} bikes, processing ${totalBikes}\n`));
    
    this.stats.processed = 0;
    
    // Process bikes
    for (const [keyid, bike] of bikes.slice(0, totalBikes)) {
      this.stats.processed++;
      const progress = `[${this.stats.processed}/${totalBikes}]`;
      
      console.log(chalk.bold(`${progress} Processing KeyID: ${keyid}`));
      
      try {
        await this.processBike(parseInt(keyid), bike);
      } catch (error) {
        console.log(chalk.red(`  ❌ Fatal error: ${error.message}`));
        this.stats.failed++;
        this.stats.errors.push({
          keyid,
          bike: bike.bike?.id,
          error: error.message
        });
      }
      
      // Small delay to avoid overwhelming the database
      if (this.stats.processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Print summary
    console.log(chalk.bold('\n📊 Migration Summary:'));
    console.log(`  Total processed: ${this.stats.processed}`);
    console.log(`  Successful: ${chalk.green(this.stats.successful)}`);
    console.log(`  Failed: ${chalk.red(this.stats.failed)}`);
    console.log(`  Success rate: ${((this.stats.successful / this.stats.processed) * 100).toFixed(1)}%`);
    
    if (this.stats.errors.length > 0) {
      console.log(chalk.yellow(`\n⚠️ ${this.stats.errors.length} errors occurred:`));
      this.stats.errors.slice(0, 5).forEach(error => {
        console.log(`  - KeyID ${error.keyid}: ${error.error}`);
      });
      if (this.stats.errors.length > 5) {
        console.log(`  ... and ${this.stats.errors.length - 5} more`);
      }
    }
  }

  async cleanup() {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const migration = new BikeDataMigration();
  
  try {
    await migration.initialize();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const fileArg = args.find(arg => arg.startsWith('--file='));
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const dryRun = args.includes('--dry-run');
    
    migration.dryRun = dryRun;
    
    if (args.includes('--help')) {
      console.log(`
${chalk.bold('Bike Data Migration Tool')}

Usage: node migrate_jsonb_to_normalized.js [options]

Options:
  --file=PATH       Path to scraped data JSON file
  --limit=N         Process only N bikes (useful for testing)
  --dry-run         Show what would be done without writing to database
  --help            Show this help message

Examples:
  node migrate_jsonb_to_normalized.js --file=../downloads/scraped_data_2025-06-05T20-49-36-835Z.json
  node migrate_jsonb_to_normalized.js --file=../downloads/scraped_data_2025-06-05T20-49-36-835Z.json --limit=10 --dry-run
`);
      process.exit(0);
    }
    
    // Determine file path
    let filePath = fileArg ? fileArg.split('=')[1] : null;
    if (!filePath) {
      // Default to most recent scraped data file
      const downloadsDir = path.join(__dirname, '../../scrapers/downloads');
      const files = await fs.readdir(downloadsDir);
      const scrapedFiles = files.filter(f => f.startsWith('scraped_data_') && f.endsWith('.json'))
                               .sort().reverse();
      
      if (scrapedFiles.length === 0) {
        throw new Error('No scraped data files found. Please specify --file=PATH');
      }
      
      filePath = path.join(downloadsDir, scrapedFiles[0]);
      console.log(chalk.yellow(`No file specified, using most recent: ${scrapedFiles[0]}`));
    }
    
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
    
    await migration.migrate(filePath, limit);
    
  } catch (error) {
    console.error(chalk.red('\n❌ Migration failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await migration.cleanup();
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default BikeDataMigration;