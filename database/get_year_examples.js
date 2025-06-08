import pkg from 'pg';
const { Client } = pkg;

const config = {
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'kevintong',
  password: ''
};

async function getYearExamples() {
  const client = new Client(config);
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        manufacturer, 
        model, 
        specifications->>'Year' as year_value
      FROM motorcycle_specs
      WHERE specifications->>'Year' IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 20
    `);
    
    result.rows.forEach(row => {
      console.log(row.year_value);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

getYearExamples();