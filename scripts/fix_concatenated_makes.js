import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

// Known patterns to fix
const fixPatterns = [
  { pattern: /^SpecializedS-Works/, replacement: 'Specialized', modelPrefix: 'S-Works ' },
  { pattern: /^TrekMadone/, replacement: 'Trek', modelPrefix: 'Madone ' },
  { pattern: /^TrekDomane/, replacement: 'Trek', modelPrefix: 'Domane ' },
  { pattern: /^SpecializedStumpjumper/, replacement: 'Specialized', modelPrefix: 'Stumpjumper ' },
  { pattern: /^TrekFuel/, replacement: 'Trek', modelPrefix: 'Fuel ' },
  { pattern: /^SpecializedMen's/, replacement: 'Specialized', modelPrefix: "Men's " },
  { pattern: /^SpecializedTurbo/, replacement: 'Specialized', modelPrefix: 'Turbo ' },
  { pattern: /^SpecializedTarmac/, replacement: 'Specialized', modelPrefix: 'Tarmac ' },
  { pattern: /^SpecializedWomen's/, replacement: 'Specialized', modelPrefix: "Women's " },
  { pattern: /^SpecializedRoubaix/, replacement: 'Specialized', modelPrefix: 'Roubaix ' },
  { pattern: /^TrekÉmonda/, replacement: 'Trek', modelPrefix: 'Émonda ' },
  { pattern: /^TrekCheckpoint/, replacement: 'Trek', modelPrefix: 'Checkpoint ' },
  { pattern: /^TrekPowerfly/, replacement: 'Trek', modelPrefix: 'Powerfly ' },
  { pattern: /^SpecializedAllez/, replacement: 'Specialized', modelPrefix: 'Allez ' },
  { pattern: /^SpecializedDiverge/, replacement: 'Specialized', modelPrefix: 'Diverge ' },
  { pattern: /^SpecializedEpic/, replacement: 'Specialized', modelPrefix: 'Epic ' },
  { pattern: /^SpecializedEnduro/, replacement: 'Specialized', modelPrefix: 'Enduro ' },
  { pattern: /^SpecializedCrux/, replacement: 'Specialized', modelPrefix: 'Crux ' },
  { pattern: /^SpecializedVenge/, replacement: 'Specialized', modelPrefix: 'Venge ' },
  { pattern: /^GiantTCR/, replacement: 'Giant', modelPrefix: 'TCR ' },
  { pattern: /^GiantDefy/, replacement: 'Giant', modelPrefix: 'Defy ' },
  { pattern: /^GiantPropel/, replacement: 'Giant', modelPrefix: 'Propel ' },
  { pattern: /^GiantTrance/, replacement: 'Giant', modelPrefix: 'Trance ' },
  { pattern: /^GiantReign/, replacement: 'Giant', modelPrefix: 'Reign ' },
  { pattern: /^CannondaleSuperSix/, replacement: 'Cannondale', modelPrefix: 'SuperSix ' },
  { pattern: /^CannondaleSystemSix/, replacement: 'Cannondale', modelPrefix: 'SystemSix ' },
  { pattern: /^CannondaleSynapse/, replacement: 'Cannondale', modelPrefix: 'Synapse ' },
  { pattern: /^CannondaleScalpel/, replacement: 'Cannondale', modelPrefix: 'Scalpel ' },
  { pattern: /^CannondaleJekyll/, replacement: 'Cannondale', modelPrefix: 'Jekyll ' },
];

async function fixConcatenatedMakes() {
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    let totalFixed = 0;
    
    for (const fix of fixPatterns) {
      // First check how many we'll fix
      const countResult = await client.query(`
        SELECT COUNT(*) as count
        FROM bikes_catalog
        WHERE make ~ $1
      `, [fix.pattern.source]);
      
      const count = parseInt(countResult.rows[0].count);
      
      if (count > 0) {
        console.log(`Fixing ${count} entries matching ${fix.pattern.source}...`);
        
        // Update in batches to avoid duplicates
        const result = await client.query(`
          UPDATE bikes_catalog
          SET 
            make = $1,
            model = CASE 
              WHEN model IS NULL OR model = '' THEN $2 || variant
              WHEN model LIKE $3 THEN model
              ELSE $2 || model
            END
          WHERE make ~ $4
            AND NOT EXISTS (
              SELECT 1 FROM bikes_catalog bc2
              WHERE bc2.make = $1
                AND bc2.model = CASE 
                  WHEN bikes_catalog.model IS NULL OR bikes_catalog.model = '' THEN $2 || bikes_catalog.variant
                  WHEN bikes_catalog.model LIKE $3 THEN bikes_catalog.model
                  ELSE $2 || bikes_catalog.model
                END
                AND bc2.year = bikes_catalog.year
                AND bc2.variant = bikes_catalog.variant
                AND bc2.keyid != bikes_catalog.keyid
            )
        `, [fix.replacement, fix.modelPrefix, fix.modelPrefix + '%', fix.pattern.source]);
        
        console.log(`  Fixed ${result.rowCount} entries`);
        totalFixed += result.rowCount;
      }
    }
    
    console.log(`\nTotal fixed: ${totalFixed} entries`);
    
    // Show remaining issues
    console.log('\n\nRemaining Concatenated Issues:');
    console.log('==============================');
    
    const issuesResult = await client.query(`
      SELECT make, COUNT(*) as count
      FROM bikes_catalog
      WHERE make ~ '^[A-Z][a-z]+[A-Z]'
        AND make NOT IN ('BMC', 'GT', 'KHS', 'KTM', 'NS', 'OPEN', 'REEB', 'RSD', 'SCOR', 'TIME', 'VAAST', 'YT', 'FTH', 'FLX')
      GROUP BY make
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (issuesResult.rows.length === 0) {
      console.log('No major concatenation issues found!');
    } else {
      for (const row of issuesResult.rows) {
        console.log(`${row.make} - ${row.count} entries`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixConcatenatedMakes();