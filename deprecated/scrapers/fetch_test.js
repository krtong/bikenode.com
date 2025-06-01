const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Simple script to test fetching from 99spokes.com
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    };
    
    https.get(url, options, (res) => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
      
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log("Fetching 99spokes.com...");
    const html = await fetchUrl('https://99spokes.com/en-US/bikes');
    
    // Save the HTML
    const outputDir = path.join(__dirname, 'html');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'fetch_test.html');
    fs.writeFileSync(outputPath, html);
    
    console.log(`HTML saved to: ${outputPath}`);
    console.log(`HTML length: ${html.length} characters`);
    
    // Print the first 500 characters
    console.log("\nFirst 500 characters of HTML:");
    console.log(html.substring(0, 500));
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();