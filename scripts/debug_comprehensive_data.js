#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs/promises';

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  database: 'bikenode',
  user: 'postgres',
  password: 'postgres'
});

async function debugComprehensiveData() {
  try {
    await client.connect();
    const result = await client.query('SELECT comprehensive_data FROM bikes_data WHERE keyid = 1');
    const data = result.rows[0].comprehensive_data;

    console.log('📊 Comprehensive data keys:', Object.keys(data).join(', '));
    console.log('📊 Searching for embedded JSON...');

    // Search for embedded JSON in all string fields
    function searchForJson(obj, path = '') {
      if (typeof obj === 'string' && obj.includes('{"props"')) {
        console.log('🎯 Found embedded JSON in:', path);
        console.log('Length:', obj.length);
        const jsonStart = obj.indexOf('{"props"');
        console.log('Preview:', obj.substring(jsonStart, jsonStart + 150) + '...');
        return obj.substring(jsonStart);
      }
      
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const result = searchForJson(value, path ? `${path}.${key}` : key);
          if (result) return result;
        }
      }
      
      return null;
    }

    const embeddedJson = searchForJson(data);
    if (embeddedJson) {
      console.log('\n🔍 Attempting to parse embedded JSON...');
      console.log('JSON starts with:', embeddedJson.substring(0, 100));
      
      try {
        // First try to find a valid JSON ending
        let jsonContent = embeddedJson;
        let parsed = null;
        
        // Try to parse the JSON - it might be incomplete
        for (let i = embeddedJson.length; i > 1000; i -= 100) {
          try {
            parsed = JSON.parse(embeddedJson.substring(0, i));
            console.log('✅ Found valid JSON at length:', i);
            break;
          } catch (e) {
            // Continue trying shorter lengths
          }
        }
        
        if (parsed) {
          console.log('✅ JSON parsed, checking structure...');
          console.log('Props keys:', Object.keys(parsed.props || {}));
          console.log('PageProps keys:', Object.keys(parsed.props?.pageprops || {}));
          
          // Try different case variations
          const bike = parsed.props?.pageProps?.bike || parsed.props?.pageprops?.bike;
          if (bike) {
            console.log('✅ Successfully found bike data!');
            console.log('🏍️ Bike ID:', bike.id);
            console.log('🏭 Manufacturer:', bike.manufacturer);
            console.log('🔧 MakerId:', bike.makerid);
            console.log('📅 Year:', bike.year);
            console.log('🚲 Model:', bike.model);
            console.log('⚡ IsEbike:', bike.isebike);
            
            // Save the clean bike data
            await fs.writeFile('debug_clean_bike_data.json', JSON.stringify(bike, null, 2));
            console.log('💾 Clean bike data saved to: debug_clean_bike_data.json');
          } else {
            console.log('❌ No bike data found in parsed JSON');
          }
        } else {
          console.log('❌ Failed to parse any valid JSON');
        }
      } catch (e) {
        console.error('❌ Failed to parse embedded JSON:', e.message);
        console.log('First 500 chars:', embeddedJson.substring(0, 500));
      }
    } else {
      console.log('❌ No embedded JSON found in comprehensive_data');
      console.log('\n🔍 Showing sample data structure:');
      console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

debugComprehensiveData();