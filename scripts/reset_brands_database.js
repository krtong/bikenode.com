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

async function resetBrandsDatabase() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    console.log(chalk.blue('🧹 Starting brand database cleanup...'));
    
    // Drop all existing brand tables
    console.log(chalk.yellow('Dropping existing brand tables...'));
    await pool.query('DROP TABLE IF EXISTS bicycle_brands CASCADE');
    await pool.query('DROP TABLE IF EXISTS bicycle_brands_comprehensive CASCADE');
    await pool.query('DROP TABLE IF EXISTS brands CASCADE');
    console.log(chalk.green('✅ Removed existing brand tables'));
    
    // Create new brands table with Addmotor-compatible schema
    console.log(chalk.yellow('Creating new brands table...'));
    await pool.query(`
      CREATE TABLE brands (
        -- Primary identifiers
        id SERIAL PRIMARY KEY,
        brand_id TEXT UNIQUE NOT NULL,
        brand_name TEXT NOT NULL,
        
        -- Basic information
        wikipedia_url TEXT,
        description TEXT,
        
        -- Logo information (nested object)
        logo_url TEXT,
        icon_url TEXT,
        
        -- Founders (JSON array)
        founders JSONB DEFAULT '[]'::jsonb,
        
        -- Founding information (nested object)
        founding_year INTEGER,
        founding_full_date DATE,
        founding_city TEXT,
        founding_state_province TEXT,
        founding_country TEXT,
        
        -- Company history
        history TEXT,
        
        -- Corporate structure
        parent_company TEXT,
        subsidiaries JSONB DEFAULT '[]'::jsonb,
        
        -- Headquarters (nested object)
        headquarters_address TEXT,
        headquarters_city TEXT,
        headquarters_state_province TEXT,
        headquarters_country TEXT,
        headquarters_image_url TEXT,
        
        -- Business information
        company_type TEXT,
        stock_exchange TEXT,
        stock_symbol TEXT,
        
        -- Employee information (nested object)
        employee_headcount INTEGER,
        employee_headcount_as_of DATE,
        
        -- Financial information (nested object)
        annual_revenue_amount BIGINT,
        annual_revenue_currency TEXT DEFAULT 'USD',
        annual_revenue_as_of DATE,
        
        -- Industry classification
        industry TEXT,
        industry_refined TEXT,
        industry_subcategory TEXT,
        
        -- Product information
        famous_models JSONB DEFAULT '[]'::jsonb,
        brand_hero_image_url TEXT,
        flagship_models JSONB DEFAULT '[]'::jsonb,
        
        -- Online presence (nested object)
        website TEXT,
        facebook_url TEXT,
        twitter_url TEXT,
        instagram_url TEXT,
        linkedin_url TEXT,
        youtube_url TEXT,
        pinterest_url TEXT,
        
        -- Additional information
        additional_notes TEXT,
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_brands_brand_id ON brands(brand_id);
      CREATE INDEX IF NOT EXISTS idx_brands_brand_name ON brands(brand_name);
      CREATE INDEX IF NOT EXISTS idx_brands_founding_year ON brands(founding_year);
      CREATE INDEX IF NOT EXISTS idx_brands_country ON brands(founding_country);
      CREATE INDEX IF NOT EXISTS idx_brands_hq_country ON brands(headquarters_country);
      CREATE INDEX IF NOT EXISTS idx_brands_company_type ON brands(company_type);
    `);
    
    // Create trigger for updated_at
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
      CREATE TRIGGER update_brands_updated_at 
      BEFORE UPDATE ON brands 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log(chalk.green('✅ Created new brands table'));
    console.log(chalk.green('✅ Created indexes'));
    console.log(chalk.green('✅ Created auto-update trigger'));
    
    // Insert Addmotor brand data
    console.log(chalk.yellow('Inserting Addmotor brand data...'));
    
    const addmotorData = {
      brand_id: 'addmotor',
      brand_name: 'Addmotor Electric Bikes',
      wikipedia_url: null,
      description: 'Addmotor Electric Bikes is an American company founded in 2011 in El Monte, California, specializing in designing and manufacturing top-quality electric bicycles and tricycles for a diverse community of riders.',
      logo_url: null,
      icon_url: 'https://www.addmotor.com/favicon.ico',
      founders: JSON.stringify([]),
      founding_year: 2011,
      founding_full_date: null,
      founding_city: 'El Monte',
      founding_state_province: 'California',
      founding_country: 'USA',
      history: 'Founded in 2011 in El Monte, California, Addmotor began with a mission to make top-quality electric bikes accessible to everyone. In 2017, they launched the Arisetan II M-360 semi-recumbent e-trike (the world\'s first of its kind). By 2023, they introduced the CITYTRI E-310 folding e-trike with a 750W rear motor and 20Ah Samsung battery, expanding their lineup to serve a variety of commuting and recreational needs.',
      parent_company: null,
      subsidiaries: JSON.stringify([]),
      headquarters_address: '4467 Rowland Ave, El Monte, CA 91731, USA',
      headquarters_city: 'El Monte',
      headquarters_state_province: 'California',
      headquarters_country: 'USA',
      headquarters_image_url: 'https://www.addmotor.com/u_file/2212/photo/d-2_1670223072.png',
      company_type: 'private',
      stock_exchange: null,
      stock_symbol: null,
      employee_headcount: 125,
      employee_headcount_as_of: '2025-06-02',
      annual_revenue_amount: null,
      annual_revenue_currency: null,
      annual_revenue_as_of: null,
      industry: 'Electric Bicycle Manufacturing',
      industry_refined: 'Sporting Goods Manufacturing',
      industry_subcategory: 'Electric Bikes',
      famous_models: JSON.stringify(['Arisetan II M-360', 'CITYTRI E-310', 'M-66 R7']),
      brand_hero_image_url: 'https://www.addmotor.com/u_file/2406/photo/365-rear-image2_1719472602.jpg',
      flagship_models: JSON.stringify([
        {
          name: 'Arisetan II M-360',
          year: 2017,
          image_url: 'https://www.addmotor.com/u_file/2212/photo/d-2_1670223072.png',
          hero_image_url: 'https://shop.tampabayebikes.com/products/addmotor-m-360-semi-recumbent-trike-red.png'
        },
        {
          name: 'CITYTRI E-310',
          year: 2023,
          image_url: 'https://www.addmotor.com/u_file/2305/photo/citytri-e310-full.png',
          hero_image_url: 'https://www.addmotor.com/u_file/2305/photo/citytri-e310-hero.png'
        }
      ]),
      website: 'https://www.addmotor.com',
      facebook_url: 'https://www.facebook.com/AddmotorElectricBike/',
      twitter_url: 'https://twitter.com/addmotorinc',
      instagram_url: 'https://www.instagram.com/addmotorinc',
      linkedin_url: 'https://www.linkedin.com/company/addmotorebike',
      youtube_url: 'https://www.youtube.com/AddmotorElectricBike',
      pinterest_url: null,
      additional_notes: 'Started as an electric motorcycle parts supplier in 2006, pivoted to e-bikes in 2011; UL-verified battery designs; maintains R&D and manufacturing in El Monte; ships to USA and Canada.'
    };
    
    await pool.query(`
      INSERT INTO brands (
        brand_id, brand_name, wikipedia_url, description, logo_url, icon_url,
        founders, founding_year, founding_full_date, founding_city, founding_state_province, founding_country,
        history, parent_company, subsidiaries, headquarters_address, headquarters_city, headquarters_state_province,
        headquarters_country, headquarters_image_url, company_type, stock_exchange, stock_symbol,
        employee_headcount, employee_headcount_as_of, annual_revenue_amount, annual_revenue_currency, annual_revenue_as_of,
        industry, industry_refined, industry_subcategory, famous_models, brand_hero_image_url, flagship_models,
        website, facebook_url, twitter_url, instagram_url, linkedin_url, youtube_url, pinterest_url, additional_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
      )
    `, [
      addmotorData.brand_id, addmotorData.brand_name, addmotorData.wikipedia_url, addmotorData.description,
      addmotorData.logo_url, addmotorData.icon_url, addmotorData.founders, addmotorData.founding_year,
      addmotorData.founding_full_date, addmotorData.founding_city, addmotorData.founding_state_province,
      addmotorData.founding_country, addmotorData.history, addmotorData.parent_company, addmotorData.subsidiaries,
      addmotorData.headquarters_address, addmotorData.headquarters_city, addmotorData.headquarters_state_province,
      addmotorData.headquarters_country, addmotorData.headquarters_image_url, addmotorData.company_type,
      addmotorData.stock_exchange, addmotorData.stock_symbol, addmotorData.employee_headcount,
      addmotorData.employee_headcount_as_of, addmotorData.annual_revenue_amount, addmotorData.annual_revenue_currency,
      addmotorData.annual_revenue_as_of, addmotorData.industry, addmotorData.industry_refined,
      addmotorData.industry_subcategory, addmotorData.famous_models, addmotorData.brand_hero_image_url,
      addmotorData.flagship_models, addmotorData.website, addmotorData.facebook_url, addmotorData.twitter_url,
      addmotorData.instagram_url, addmotorData.linkedin_url, addmotorData.youtube_url, addmotorData.pinterest_url,
      addmotorData.additional_notes
    ]);
    
    console.log(chalk.green('✅ Inserted Addmotor brand data'));
    
    // Verify the insertion
    const result = await pool.query('SELECT brand_id, brand_name, founding_year, headquarters_city FROM brands WHERE brand_id = $1', ['addmotor']);
    if (result.rows.length > 0) {
      const brand = result.rows[0];
      console.log(chalk.blue('\n📋 Verification:'));
      console.log(`  Brand ID: ${brand.brand_id}`);
      console.log(`  Brand Name: ${brand.brand_name}`);
      console.log(`  Founded: ${brand.founding_year}`);
      console.log(`  Headquarters: ${brand.headquarters_city}`);
    }
    
    console.log(chalk.green('\n🎉 Brand database reset complete!'));
    console.log(chalk.blue('New brands table ready for additional entries.'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error resetting brand database:'), error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

resetBrandsDatabase().catch(console.error);