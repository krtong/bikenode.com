#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bikenode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

async function getAllTableSchemas() {
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Get all table names
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tables = await pool.query(tablesQuery);
    console.log(`Found ${tables.rows.length} tables in database`);
    
    const tableSchemas = [];
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      // Get column information
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `;
      
      const columns = await pool.query(columnsQuery, [tableName]);
      
      // Get row count
      let rowCount = 0;
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
        rowCount = parseInt(countResult.rows[0].count);
      } catch (error) {
        console.error(`Error counting rows in ${tableName}:`, error.message);
      }
      
      // Get primary key information
      const pkQuery = `
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary
      `;
      
      let primaryKeys = [];
      try {
        const pkResult = await pool.query(pkQuery, [tableName]);
        primaryKeys = pkResult.rows.map(row => row.attname);
      } catch (error) {
        console.error(`Error getting primary keys for ${tableName}:`, error.message);
      }
      
      // Get foreign key information
      const fkQuery = `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = $1
      `;
      
      let foreignKeys = [];
      try {
        const fkResult = await pool.query(fkQuery, [tableName]);
        foreignKeys = fkResult.rows;
      } catch (error) {
        console.error(`Error getting foreign keys for ${tableName}:`, error.message);
      }
      
      tableSchemas.push({
        tableName,
        rowCount,
        primaryKeys,
        foreignKeys,
        columns: columns.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          udtName: col.udt_name,
          maxLength: col.character_maximum_length,
          precision: col.numeric_precision,
          scale: col.numeric_scale,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        }))
      });
    }
    
    // Create markdown output
    let markdown = '# PostgreSQL Database Schema\n\n';
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;
    markdown += `Total tables: ${tableSchemas.length}\n\n`;
    
    // Group tables by category
    const categories = {
      'User & Authentication': ['users', 'user_preferences', 'user_roles', 'user_server_visibility'],
      'Vehicles': ['motorcycles', 'motorcycle_specs', 'bikes', 'bike_specs', 'bike_photos', 'bike_components', 'bike_raw_data', 'manufacturers', 'bike_families'],
      'Electrified/E-bikes': ['electrified_data', 'electrified_brands'],
      'Bicycle Data': ['bikes_data_2', 'bicycle_data_make_model_year_specs'],
      'Ownership & Timeline': ['ownerships', 'timeline_events', 'event_server_shares'],
      'Discord Integration': ['servers', 'server_configs'],
      'Other': []
    };
    
    // Categorize tables
    const categorizedTables = {};
    for (const schema of tableSchemas) {
      let categorized = false;
      for (const [category, patterns] of Object.entries(categories)) {
        if (patterns.some(pattern => schema.tableName.includes(pattern))) {
          if (!categorizedTables[category]) {
            categorizedTables[category] = [];
          }
          categorizedTables[category].push(schema);
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        if (!categorizedTables['Other']) {
          categorizedTables['Other'] = [];
        }
        categorizedTables['Other'].push(schema);
      }
    }
    
    // Generate markdown for each category
    for (const [category, tables] of Object.entries(categorizedTables)) {
      if (tables && tables.length > 0) {
        markdown += `## ${category}\n\n`;
        
        for (const table of tables) {
          markdown += `### ${table.tableName}\n`;
          markdown += `- **Row count**: ${table.rowCount.toLocaleString()}\n`;
          if (table.primaryKeys.length > 0) {
            markdown += `- **Primary keys**: ${table.primaryKeys.join(', ')}\n`;
          }
          
          markdown += '\n| Column | Type | Nullable | Default | Description |\n';
          markdown += '|--------|------|----------|---------|-------------|\n';
          
          for (const col of table.columns) {
            let type = col.type;
            if (col.udtName === 'uuid') type = 'UUID';
            else if (col.udtName === 'timestamptz') type = 'TIMESTAMP WITH TIME ZONE';
            else if (col.udtName === 'jsonb') type = 'JSONB';
            else if (col.udtName === '_text') type = 'TEXT[]';
            else if (col.maxLength) type += `(${col.maxLength})`;
            else if (col.precision) {
              type += `(${col.precision}`;
              if (col.scale) type += `,${col.scale}`;
              type += ')';
            }
            
            const nullable = col.nullable ? 'YES' : 'NO';
            const defaultVal = col.default ? col.default.replace(/'/g, '') : '-';
            
            // Check if this column is a foreign key
            const fk = table.foreignKeys.find(fk => fk.column_name === col.name);
            let description = '';
            if (table.primaryKeys.includes(col.name)) {
              description = 'Primary Key';
            }
            if (fk) {
              description += (description ? ', ' : '') + `Foreign Key -> ${fk.foreign_table_name}(${fk.foreign_column_name})`;
            }
            
            markdown += `| ${col.name} | ${type} | ${nullable} | ${defaultVal} | ${description} |\n`;
          }
          
          markdown += '\n';
        }
      }
    }
    
    // Save to file
    const outputPath = path.join(process.cwd(), 'database', 'reports', 'current_database_schema.md');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown);
    
    console.log(`\nSchema documentation saved to: ${outputPath}`);
    
    // Also create a JSON output for programmatic use
    const jsonPath = path.join(process.cwd(), 'database', 'reports', 'current_database_schema.json');
    fs.writeFileSync(jsonPath, JSON.stringify(tableSchemas, null, 2));
    console.log(`JSON schema saved to: ${jsonPath}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
getAllTableSchemas();