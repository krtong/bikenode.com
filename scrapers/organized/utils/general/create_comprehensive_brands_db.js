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

async function createComprehensiveBrandsDB() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🚀 Creating comprehensive bicycle brands database...'));
    
    // Drop existing table if it exists
    await pool.query('DROP TABLE IF EXISTS bicycle_brands_comprehensive CASCADE');
    
    // Create the comprehensive brands table
    await pool.query(`
      CREATE TABLE bicycle_brands_comprehensive (
        -- Primary identifiers
        id SERIAL PRIMARY KEY,
        brand_id TEXT UNIQUE NOT NULL,           -- e.g., "3t", "trek"
        brand_name TEXT NOT NULL,                -- e.g., "3T Cycling", "Trek"
        
        -- Basic information
        wikipedia_url TEXT,
        description TEXT,
        
        -- Logos and visual assets
        logo_url TEXT,
        icon_url TEXT,
        headquarters_image_url TEXT,
        brand_hero_image_url TEXT,
        
        -- Founders (stored as JSONB array)
        founders JSONB DEFAULT '[]'::jsonb,      -- ["Mario Dedioniggi"]
        
        -- Founding information
        founding_year INTEGER,
        founding_full_date DATE,
        founding_city TEXT,
        founding_state_province TEXT,
        founding_country TEXT,
        
        -- Company history
        history TEXT,
        
        -- Corporate structure
        parent_company TEXT,
        subsidiaries JSONB DEFAULT '[]'::jsonb,  -- Array of subsidiary names
        
        -- Headquarters
        headquarters_address TEXT,
        headquarters_city TEXT,
        headquarters_state_province TEXT,
        headquarters_country TEXT,
        
        -- Business information
        company_type TEXT,                       -- "private", "public"
        stock_exchange TEXT,
        stock_symbol TEXT,
        
        -- Employee information
        employee_count INTEGER,
        employee_count_as_of DATE,
        
        -- Financial information
        annual_revenue_amount BIGINT,            -- Store in cents to avoid decimal issues
        annual_revenue_currency TEXT DEFAULT 'USD',
        annual_revenue_as_of DATE,
        
        -- Industry classification
        industry TEXT DEFAULT 'Bicycle Manufacturing',
        industry_subcategory TEXT,               -- "Gravel Bikes", "Mountain Bikes", etc.
        
        -- Products
        famous_models JSONB DEFAULT '[]'::jsonb, -- ["Exploro", "Strada"]
        flagship_models JSONB DEFAULT '[]'::jsonb, -- [{"name": "Exploro", "year": 2016, ...}]
        
        -- Online presence
        website TEXT,
        facebook_url TEXT,
        twitter_url TEXT,
        instagram_url TEXT,
        linkedin_url TEXT,
        youtube_url TEXT,
        
        -- Additional information
        additional_notes TEXT,
        
        -- Metadata
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_quality_score DECIMAL(3,2),        -- 0.00 to 1.00
        
        -- Raw scraped data for reference
        raw_scrape_data JSONB
      );
    `);
    
    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_brands_comp_brand_id ON bicycle_brands_comprehensive(brand_id);
      CREATE INDEX IF NOT EXISTS idx_brands_comp_brand_name ON bicycle_brands_comprehensive(brand_name);
      CREATE INDEX IF NOT EXISTS idx_brands_comp_founding_year ON bicycle_brands_comprehensive(founding_year);
      CREATE INDEX IF NOT EXISTS idx_brands_comp_country ON bicycle_brands_comprehensive(founding_country);
      CREATE INDEX IF NOT EXISTS idx_brands_comp_hq_country ON bicycle_brands_comprehensive(headquarters_country);
      CREATE INDEX IF NOT EXISTS idx_brands_comp_quality ON bicycle_brands_comprehensive(data_quality_score);
      CREATE INDEX IF NOT EXISTS idx_brands_comp_company_type ON bicycle_brands_comprehensive(company_type);
      CREATE INDEX IF NOT EXISTS idx_brands_comp_industry_sub ON bicycle_brands_comprehensive(industry_subcategory);
    `);
    
    // Create a function to automatically update the updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await pool.query(`
      CREATE TRIGGER update_brands_comp_updated_at 
      BEFORE UPDATE ON bicycle_brands_comprehensive 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log(chalk.green('✅ Created bicycle_brands_comprehensive table'));
    console.log(chalk.green('✅ Created indexes for optimal performance'));
    console.log(chalk.green('✅ Created auto-update trigger for updated_at'));
    
    // Show the table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bicycle_brands_comprehensive' 
      ORDER BY ordinal_position
    `);
    
    console.log(chalk.blue('\n📋 Table Structure:'));
    for (const col of columns.rows) {
      const nullable = col.is_nullable === 'YES' ? 'nullable' : 'required';
      const defaultVal = col.column_default ? `(default: ${col.column_default})` : '';
      console.log(`  ${col.column_name}: ${col.data_type} (${nullable}) ${defaultVal}`);
    }
    
    console.log(chalk.green('\n🎯 Ready to scrape comprehensive brand data!'));
    console.log(chalk.blue('Next steps:'));
    console.log('  1. Run the enhanced brand scraper');
    console.log('  2. Collect detailed company information');
    console.log('  3. Export as structured JSON matching your format');
    
  } catch (error) {
    console.error(chalk.red('❌ Error creating database:'), error.message);
  } finally {
    await pool.end();
  }
}

createComprehensiveBrandsDB();