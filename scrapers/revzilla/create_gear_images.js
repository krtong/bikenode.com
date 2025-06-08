import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createGearImages() {
    const gearImagesDir = path.join(__dirname, '../assets/images/gear');
    await fs.mkdir(gearImagesDir, { recursive: true });
    
    const gearProducts = [
        { name: 'arai-regent-x', type: 'helmet', color: '#1e40af', brand: 'ARAI' },
        { name: 'shoei-rf1400', type: 'helmet', color: '#dc2626', brand: 'SHOEI' },
        { name: 'bell-qualifier-dlx', type: 'helmet', color: '#059669', brand: 'BELL' },
        { name: 'dainese-racing-4', type: 'jacket', color: '#7c3aed', brand: 'DAINESE' },
        { name: 'revit-sand-3', type: 'jacket', color: '#ea580c', brand: "REV'IT!" },
        { name: 'alpinestars-sp8-v3', type: 'gloves', color: '#0891b2', brand: 'A*STARS' },
        { name: 'revit-dirt-3', type: 'gloves', color: '#be123c', brand: "REV'IT!" },
        { name: 'alpinestars-smx6-v2', type: 'boots', color: '#4338ca', brand: 'A*STARS' },
        { name: 'klim-badlands-pro', type: 'pants', color: '#0f766e', brand: 'KLIM' }
    ];
    
    const icons = {
        helmet: '🪖',
        jacket: '🧥',
        gloves: '🧤',
        boots: '🥾',
        pants: '👖'
    };
    
    for (const product of gearProducts) {
        const svg = `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad-${product.name}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${product.color};stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:${product.color};stop-opacity:0.3" />
                </linearGradient>
                <filter id="shadow-${product.name}">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                    <feOffset dx="2" dy="2" result="offsetblur"/>
                    <feFlood flood-color="#000000" flood-opacity="0.2"/>
                    <feComposite in2="offsetblur" operator="in"/>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            
            <!-- Background -->
            <rect width="600" height="600" fill="#f8fafc"/>
            
            <!-- Product card -->
            <rect x="50" y="50" width="500" height="500" rx="25" fill="white" filter="url(#shadow-${product.name})"/>
            
            <!-- Color accent -->
            <rect x="50" y="50" width="500" height="150" rx="25" fill="url(#grad-${product.name})"/>
            <rect x="50" y="175" width="500" height="25" fill="url(#grad-${product.name})"/>
            
            <!-- Icon -->
            <text x="300" y="300" font-family="Arial, sans-serif" font-size="150" text-anchor="middle" dominant-baseline="middle">${icons[product.type]}</text>
            
            <!-- Brand -->
            <text x="300" y="120" font-family="Arial Black, sans-serif" font-size="32" text-anchor="middle" fill="white" font-weight="bold">${product.brand}</text>
            
            <!-- Product type -->
            <text x="300" y="450" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="${product.color}" font-weight="600">${product.type.toUpperCase()}</text>
            
            <!-- Price indicator -->
            <circle cx="500" cy="100" r="40" fill="white" opacity="0.9"/>
            <text x="500" y="108" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="${product.color}" font-weight="bold">NEW</text>
        </svg>`;
        
        const filename = `${product.name}.jpg`;
        await fs.writeFile(path.join(gearImagesDir, filename), svg);
        console.log(`Created: ${filename}`);
    }
    
    console.log('\n✅ All gear images created successfully!');
}

createGearImages();