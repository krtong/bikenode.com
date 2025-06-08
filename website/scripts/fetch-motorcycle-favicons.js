const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Create favicons directory if it doesn't exist
const faviconsDir = path.join(__dirname, '../assets/images/motorcycle-favicons');
if (!fs.existsSync(faviconsDir)) {
    fs.mkdirSync(faviconsDir, { recursive: true });
}

// Motorcycle brand websites
const brandWebsites = {
    'honda': 'https://powersports.honda.com',
    'yamaha': 'https://www.yamahamotorsports.com',
    'kawasaki': 'https://www.kawasaki.com',
    'suzuki': 'https://suzukicycles.com',
    'bmw': 'https://www.bmwmotorcycles.com',
    'ducati': 'https://www.ducati.com',
    'harley-davidson': 'https://www.harley-davidson.com',
    'ktm': 'https://www.ktm.com',
    'triumph': 'https://www.triumphmotorcycles.com',
    'indian': 'https://www.indianmotorcycle.com',
    'aprilia': 'https://www.aprilia.com',
    'husqvarna': 'https://www.husqvarna-motorcycles.com',
    'mv-agusta': 'https://www.mvagusta.com',
    'moto-guzzi': 'https://www.motoguzzi.com',
    'royal-enfield': 'https://www.royalenfield.com',
    'benelli': 'https://www.benelli.com',
    'cfmoto': 'https://www.cfmoto.com',
    'zero': 'https://www.zeromotorcycles.com',
    'energica': 'https://www.energicamotor.com',
    'vespa': 'https://www.vespa.com',
    'piaggio': 'https://www.piaggio.com',
    'polaris': 'https://www.polaris.com',
    'can-am': 'https://can-am.brp.com',
    'bajaj': 'https://www.bajajauto.com',
    'hero': 'https://www.heromotocorp.com',
    'tvs': 'https://www.tvsmotor.com',
    'sym': 'https://www.sym-global.com',
    'kymco': 'https://www.kymco.com',
    'beta': 'https://betamotor.com',
    'gasgas': 'https://www.gasgas.com',
    'sherco': 'https://www.sherco.com',
    'swm': 'https://www.swm-motorcycles.com',
    'norton': 'https://www.nortonmotorcycles.com',
    'buell': 'https://www.buellmotorcycle.com',
    'victory': 'https://www.victorymotorcycles.com',
    'ural': 'https://www.imz-ural.com',
    'jawa': 'https://www.jawamotorcycles.com',
    'bimota': 'https://www.bimota.it',
    'cagiva': 'https://www.cagiva.com',
    'laverda': 'https://www.laverda.com',
    'bsa': 'https://www.bsagoldstar.com'
};

// Common favicon paths to try
const faviconPaths = [
    '/favicon.ico',
    '/favicon.png',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png'
];

function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, { 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 5000
        }, (response) => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(destination);
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(true);
                });
                file.on('error', (err) => {
                    fs.unlink(destination, () => {});
                    reject(err);
                });
            } else if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Handle redirects
                downloadFile(response.headers.location, destination)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(new Error(`Status ${response.statusCode}`));
            }
        });

        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function tryDownloadFavicon(brand, baseUrl) {
    for (const faviconPath of faviconPaths) {
        try {
            const url = new URL(faviconPath, baseUrl).href;
            const ext = path.extname(faviconPath) || '.ico';
            const destination = path.join(faviconsDir, `${brand}${ext}`);
            
            console.log(`Trying ${url}...`);
            await downloadFile(url, destination);
            console.log(`✓ Downloaded favicon for ${brand}: ${destination}`);
            return true;
        } catch (error) {
            // Continue to next path
        }
    }
    return false;
}

async function fetchAllFavicons() {
    console.log('Starting favicon download...\n');
    
    const results = {
        success: [],
        failed: []
    };

    for (const [brand, website] of Object.entries(brandWebsites)) {
        console.log(`\nProcessing ${brand}...`);
        try {
            const success = await tryDownloadFavicon(brand, website);
            if (success) {
                results.success.push(brand);
            } else {
                results.failed.push(brand);
                console.log(`✗ Could not find favicon for ${brand}`);
            }
        } catch (error) {
            results.failed.push(brand);
            console.log(`✗ Error processing ${brand}: ${error.message}`);
        }
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n\n=== SUMMARY ===');
    console.log(`Successfully downloaded: ${results.success.length}`);
    console.log(`Failed: ${results.failed.length}`);
    
    if (results.success.length > 0) {
        console.log('\nSuccessful downloads:');
        results.success.forEach(brand => console.log(`  - ${brand}`));
    }
    
    if (results.failed.length > 0) {
        console.log('\nFailed downloads:');
        results.failed.forEach(brand => console.log(`  - ${brand}`));
    }
}

// Run the script
fetchAllFavicons().catch(console.error);