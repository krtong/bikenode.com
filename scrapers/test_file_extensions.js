// Test script to verify file extension fix
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test URLs with known extensions
const testUrls = [
    'https://images.unsplash.com/photo-1558618666-ffcd791c62f3?w=500&h=300', // Should be .jpg
    'https://motorcyclespecs.co.za/Custom/Ducati%20Pics/panigale-v4-2018%20(1).jpg', // .jpg
    'https://www.ducati.com/content/dam/ducati-website/model-bikes/panigale/v4/model-preview.png.webp', // .webp
];

async function downloadTestImage(url, fileName) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/*,*/*;q=0.8'
            },
            timeout: 30000,
            maxRedirects: 5
        });

        const testDir = '/Users/kevintong/Documents/Code/bikenode.com/scrapers/test_downloads';
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const filePath = path.join(testDir, fileName);
        const writer = fs.createWriteStream(filePath);
        
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                    console.log(`✅ Successfully downloaded: ${fileName} (${fs.statSync(filePath).size} bytes)`);
                    resolve(true);
                } else {
                    reject(new Error('File was not created properly'));
                }
            });
            
            writer.on('error', (error) => {
                fs.unlink(filePath, () => {});
                reject(error);
            });
            
            response.data.on('error', (error) => {
                writer.destroy();
                fs.unlink(filePath, () => {});
                reject(error);
            });
        });

    } catch (error) {
        console.log(`❌ Failed to download ${url}: ${error.message}`);
        return false;
    }
}

function getFileExtension(url) {
    try {
        const urlObj = new URL(url);
        let pathname = urlObj.pathname.toLowerCase();
        
        pathname = pathname.split('?')[0];
        
        const match = pathname.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
        if (match) {
            return match[1];
        }
        
        const searchParams = urlObj.searchParams;
        for (const [key, value] of searchParams) {
            const extMatch = value.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
            if (extMatch) {
                return extMatch[1];
            }
        }
        
        if (url.includes('images.unsplash') || url.includes('imgur')) {
            return 'jpg';
        }
        if (url.includes('.webp')) {
            return 'webp';
        }
        
        return 'jpg';
    } catch (error) {
        return 'jpg';
    }
}

async function runTest() {
    console.log('🧪 Testing file extension preservation...\n');
    
    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        const extension = getFileExtension(url);
        const fileName = `test_${i + 1}.${extension}`;
        
        console.log(`📥 Testing URL: ${url}`);
        console.log(`📝 Detected extension: ${extension}`);
        console.log(`💾 Saving as: ${fileName}`);
        
        await downloadTestImage(url, fileName);
        console.log('');
        
        // Add delay between downloads
        if (i < testUrls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log('🎉 Test completed! Check the test_downloads folder for results.');
}

runTest().catch(console.error);
