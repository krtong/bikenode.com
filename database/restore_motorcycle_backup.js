const { Client } = require('pg');
const readline = require('readline');

// Database configuration
const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function listBackups(client) {
  const backups = await client.query(`
    SELECT 
      tablename,
      tablename LIKE 'motorcycles_backup_%' as is_motorcycles,
      tablename LIKE 'motorcycle_specs_backup_%' as is_specs,
      SUBSTRING(tablename FROM 'backup_(.*)$') as timestamp
    FROM pg_tables
    WHERE schemaname = 'public' 
    AND (tablename LIKE 'motorcycles_backup_%' OR tablename LIKE 'motorcycle_specs_backup_%')
    ORDER BY tablename DESC
  `);
  
  // Group by timestamp
  const backupSets = {};
  backups.rows.forEach(row => {
    if (!backupSets[row.timestamp]) {
      backupSets[row.timestamp] = { motorcycles: null, specs: null };
    }
    if (row.is_motorcycles) {
      backupSets[row.timestamp].motorcycles = row.tablename;
    } else if (row.is_specs) {
      backupSets[row.timestamp].specs = row.tablename;
    }
  });
  
  return backupSets;
}

async function restoreFromBackup(client, timestamp) {
  const motorcyclesBackup = `motorcycles_backup_${timestamp}`;
  const specsBackup = `motorcycle_specs_backup_${timestamp}`;
  
  console.log(`\nRestoring from backup: ${timestamp}`);
  
  await client.query('BEGIN');
  
  try {
    // Drop existing tables
    console.log('Dropping current tables...');
    await client.query('DROP TABLE IF EXISTS motorcycles CASCADE');
    await client.query('DROP TABLE IF EXISTS motorcycle_specs CASCADE');
    
    // Restore from backup
    console.log('Restoring motorcycles table...');
    await client.query(`
      CREATE TABLE motorcycles AS 
      SELECT * FROM ${motorcyclesBackup}
    `);
    
    console.log('Restoring motorcycle_specs table...');
    await client.query(`
      CREATE TABLE motorcycle_specs AS 
      SELECT * FROM ${specsBackup}
    `);
    
    // Recreate constraints and indexes
    console.log('Recreating constraints and indexes...');
    
    // Primary keys
    await client.query('ALTER TABLE motorcycle_specs ADD PRIMARY KEY (id)');
    await client.query('ALTER TABLE motorcycles ADD PRIMARY KEY (id)');
    
    // Foreign key
    await client.query(`
      ALTER TABLE motorcycles 
      ADD CONSTRAINT motorcycles_spec_id_fkey 
      FOREIGN KEY (spec_id) REFERENCES motorcycle_specs(id)
    `);
    
    // Indexes
    await client.query('CREATE INDEX idx_motorcycles_year ON motorcycles(year)');
    await client.query('CREATE INDEX idx_motorcycles_make_model ON motorcycles(make, model)');
    await client.query('CREATE INDEX idx_motorcycles_spec_id ON motorcycles(spec_id)');
    await client.query('CREATE INDEX idx_motorcycle_specs_manufacturer_model_year ON motorcycle_specs(manufacturer, model, year)');
    
    await client.query('COMMIT');
    console.log('✓ Restore completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Error during restore:', error.message);
    throw error;
  }
}

async function main() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // List available backups
    console.log('Available backups:');
    const backupSets = await listBackups(client);
    
    const timestamps = Object.keys(backupSets).filter(ts => 
      backupSets[ts].motorcycles && backupSets[ts].specs
    );
    
    if (timestamps.length === 0) {
      console.log('No complete backup sets found.');
      return;
    }
    
    timestamps.forEach((ts, index) => {
      console.log(`${index + 1}. ${ts}`);
      console.log(`   - ${backupSets[ts].motorcycles}`);
      console.log(`   - ${backupSets[ts].specs}`);
    });
    
    const choice = await askQuestion('\nEnter the number of the backup to restore (or "q" to quit): ');
    
    if (choice.toLowerCase() === 'q') {
      console.log('Operation cancelled');
      return;
    }
    
    const index = parseInt(choice) - 1;
    if (index < 0 || index >= timestamps.length) {
      console.log('Invalid selection');
      return;
    }
    
    const selectedTimestamp = timestamps[index];
    
    console.log(`\nWARNING: This will replace the current tables with the backup from ${selectedTimestamp}`);
    const confirm = await askQuestion('Are you sure you want to proceed? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Operation cancelled');
      return;
    }
    
    await restoreFromBackup(client, selectedTimestamp);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    await client.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };