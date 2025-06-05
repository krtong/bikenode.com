#!/usr/bin/env node
import pg from 'pg';
import chalk from 'chalk';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
};

async function addClosingFieldAndUpdateAllCity() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🔧 Adding closing field to brands table...'));
    
    // Add closing field to brands table
    await pool.query(`
      ALTER TABLE brands 
      ADD COLUMN IF NOT EXISTS closing_announcement_date TEXT,
      ADD COLUMN IF NOT EXISTS closing_planned_year INTEGER,
      ADD COLUMN IF NOT EXISTS closing_status TEXT,
      ADD COLUMN IF NOT EXISTS closing_reason TEXT
    `);
    
    console.log(chalk.green('✅ Added closing fields to brands table'));
    
    // Update All-City with closing information and improved data
    console.log(chalk.blue('📝 Updating All-City with closing information...'));
    
    const updatedFlagshipModels = JSON.stringify([
      {
        name: 'Space Horse',
        year: 2011,
        image_url: 'https://allcitycycles.com/bikes/archive/space_horse_orange',
        hero_image_url: 'https://bicycle-guider.com/all-city-space-horse-review/'
      },
      {
        name: 'Nature Cross',
        year: 2018,
        image_url: 'https://allcitycycles.com/bikes/archive/nature_cross_single_speed_propane_flame',
        hero_image_url: 'https://allcitycycles.com/blog/nature_cross_single_speed_new_color_coming_at_ya_fast'
      },
      {
        name: 'Thunderdome',
        year: 2014,
        image_url: 'https://allcitycycles.com/bikes/thunderdome',
        hero_image_url: 'https://bikeindex.org/bikes/34700'
      }
    ]);
    
    await pool.query(`
      UPDATE brands 
      SET 
        flagship_models = $1,
        additional_notes = $2,
        closing_announcement_date = $3,
        closing_planned_year = $4,
        closing_status = $5,
        closing_reason = $6
      WHERE brand_id = 'allcity'
    `, [
      updatedFlagshipModels,
      'Quality Bicycle Products announced in August 2023 that All-City Cycles would be discontinued after the 2024 season.',
      '2023-08',
      2024,
      'discontinued',
      'Low sales and overlapping product lines with sister brands led QBP to phase out All-City to streamline its portfolio.'
    ]);
    
    console.log(chalk.green('✅ Updated All-City with closing information'));
    
    // Verify the update
    const result = await pool.query(`
      SELECT brand_id, brand_name, closing_status, closing_planned_year, flagship_models
      FROM brands 
      WHERE brand_id = 'allcity'
    `);
    
    if (result.rows.length > 0) {
      const brand = result.rows[0];
      console.log(chalk.blue('\n📋 Verification:'));
      console.log(`  Brand: ${brand.brand_name}`);
      console.log(`  Status: ${brand.closing_status}`);
      console.log(`  Planned closure: ${brand.closing_planned_year}`);
      console.log(`  Flagship models updated: ${JSON.parse(brand.flagship_models).length} models`);
    }
    
    console.log(chalk.green('\n🎉 All-City update complete with closing information!'));
    console.log(chalk.yellow('💡 Note: Other brands will have null values in closing fields'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error updating All-City:'), error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addClosingFieldAndUpdateAllCity().catch(console.error);