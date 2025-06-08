import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample motorcycle gear data for the website
const SAMPLE_GEAR_DATA = [
    {
        category: 'helmets',
        products: [
            {
                id: 'helmet-1',
                name: 'Arai Regent-X Helmet',
                brand: 'Arai',
                price: 629.95,
                salePrice: null,
                description: 'Premium touring helmet with excellent ventilation and comfort. Features a PB-SNC2 shell construction and multi-density EPS liner.',
                features: [
                    'Intermediate oval head shape',
                    'Removable/washable interior',
                    'Pinlock-ready face shield',
                    'Emergency release system'
                ],
                specifications: {
                    'Shell Material': 'PB-SNC2 Fiberglass',
                    'Weight': '3.7 lbs',
                    'Safety Rating': 'DOT/Snell M2020',
                    'Ventilation': '5 intake, 5 exhaust vents'
                },
                rating: 4.7,
                reviewCount: 234,
                images: ['/assets/images/gear/arai-regent-x.jpg'],
                sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                inStock: true
            },
            {
                id: 'helmet-2',
                name: 'Shoei RF-1400 Helmet',
                brand: 'Shoei',
                price: 579.99,
                salePrice: 499.99,
                description: 'Race-proven helmet with superior aerodynamics and noise reduction. Features the new CWR-F2 shield system.',
                features: [
                    'AIM+ shell construction',
                    'Multi-ply matrix shell',
                    'Emergency quick release',
                    'Pinlock EVO included'
                ],
                specifications: {
                    'Shell Material': 'AIM+ Composite',
                    'Weight': '3.5 lbs',
                    'Safety Rating': 'DOT/Snell M2020',
                    'Ventilation': '6 intake, 6 exhaust vents'
                },
                rating: 4.8,
                reviewCount: 456,
                images: ['/assets/images/gear/shoei-rf1400.jpg'],
                sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                inStock: true
            },
            {
                id: 'helmet-3',
                name: 'Bell Qualifier DLX MIPS',
                brand: 'Bell',
                price: 199.95,
                salePrice: 169.95,
                description: 'Affordable sport-touring helmet with MIPS brain protection system and excellent features.',
                features: [
                    'MIPS technology',
                    'Transitions face shield',
                    'Click-release shield',
                    'Removable liner'
                ],
                specifications: {
                    'Shell Material': 'Polycarbonate',
                    'Weight': '3.9 lbs',
                    'Safety Rating': 'DOT',
                    'Ventilation': '4 intake, 2 exhaust vents'
                },
                rating: 4.3,
                reviewCount: 789,
                images: ['/assets/images/gear/bell-qualifier-dlx.jpg'],
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                inStock: true
            }
        ]
    },
    {
        category: 'jackets',
        products: [
            {
                id: 'jacket-1',
                name: 'Dainese Racing 4 Leather Jacket',
                brand: 'Dainese',
                price: 699.95,
                salePrice: null,
                description: 'Professional racing jacket with premium cowhide construction and CE Level 2 armor.',
                features: [
                    'Premium cowhide leather',
                    'CE Level 2 armor',
                    'Perforated panels',
                    'Aerodynamic hump'
                ],
                specifications: {
                    'Material': 'Cowhide leather',
                    'Armor': 'CE Level 2 shoulders/elbows',
                    'Liner': 'Removable thermal liner',
                    'Pockets': '2 external, 2 internal'
                },
                rating: 4.9,
                reviewCount: 123,
                images: ['/assets/images/gear/dainese-racing-4.jpg'],
                sizes: ['46', '48', '50', '52', '54', '56'],
                inStock: true
            },
            {
                id: 'jacket-2',
                name: 'REV\'IT! Sand 3 Jacket',
                brand: 'REV\'IT!',
                price: 479.99,
                salePrice: 399.99,
                description: 'Adventure touring jacket with removable thermal and waterproof liners.',
                features: [
                    '3-layer system',
                    'SEEFLEX CE Level 2 armor',
                    'Ventilation panels',
                    'Hydratex waterproof liner'
                ],
                specifications: {
                    'Material': '600D Polyester',
                    'Armor': 'SEEFLEX Level 2',
                    'Waterproof': 'Hydratex|G-liner',
                    'Pockets': 'Multiple storage options'
                },
                rating: 4.6,
                reviewCount: 234,
                images: ['/assets/images/gear/revit-sand-3.jpg'],
                sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
                inStock: true
            }
        ]
    },
    {
        category: 'gloves',
        products: [
            {
                id: 'gloves-1',
                name: 'Alpinestars SP-8 v3 Gloves',
                brand: 'Alpinestars',
                price: 159.95,
                salePrice: null,
                description: 'Sport riding gloves with premium leather construction and carbon knuckle protection.',
                features: [
                    'Full grain leather',
                    'Carbon knuckle protection',
                    'Touch screen compatible',
                    'Pre-curved construction'
                ],
                specifications: {
                    'Material': 'Full grain leather',
                    'Protection': 'Carbon fiber knuckles',
                    'Palm': 'Reinforced with suede',
                    'Closure': 'Wrist and cuff closure'
                },
                rating: 4.5,
                reviewCount: 345,
                images: ['/assets/images/gear/alpinestars-sp8-v3.jpg'],
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                inStock: true
            },
            {
                id: 'gloves-2',
                name: 'REV\'IT! Dirt 3 Gloves',
                brand: 'REV\'IT!',
                price: 89.99,
                salePrice: 74.99,
                description: 'Adventure gloves with excellent protection and all-weather versatility.',
                features: [
                    'Goatskin leather palm',
                    'TPR knuckle protection',
                    'Touch screen tips',
                    'Ventilated design'
                ],
                specifications: {
                    'Material': 'Leather/textile mix',
                    'Protection': 'TPR hard shell knuckles',
                    'Features': 'Connect finger tip',
                    'Closure': 'Velcro wrist closure'
                },
                rating: 4.4,
                reviewCount: 567,
                images: ['/assets/images/gear/revit-dirt-3.jpg'],
                sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                inStock: true
            }
        ]
    },
    {
        category: 'boots',
        products: [
            {
                id: 'boots-1',
                name: 'Alpinestars SMX-6 v2 Boots',
                brand: 'Alpinestars',
                price: 269.95,
                salePrice: null,
                description: 'Sport riding boots with excellent protection and comfort for street and track use.',
                features: [
                    'Microfiber upper construction',
                    'TPU ankle protection',
                    'Oil-resistant sole',
                    'CE certified'
                ],
                specifications: {
                    'Material': 'Microfiber/synthetic',
                    'Protection': 'TPU ankle/heel/toe',
                    'Sole': 'Oil-resistant rubber',
                    'Closure': 'Ratchet + velcro'
                },
                rating: 4.6,
                reviewCount: 234,
                images: ['/assets/images/gear/alpinestars-smx6-v2.jpg'],
                sizes: ['7', '8', '9', '10', '11', '12', '13'],
                inStock: true
            }
        ]
    },
    {
        category: 'pants',
        products: [
            {
                id: 'pants-1',
                name: 'Klim Badlands Pro Pants',
                brand: 'Klim',
                price: 549.99,
                salePrice: null,
                description: 'Premium adventure pants with Gore-Tex Pro construction and D3O armor.',
                features: [
                    'Gore-Tex Pro Shell',
                    'D3O Level 2 armor',
                    'Ventilation zippers',
                    'Removable thermal liner'
                ],
                specifications: {
                    'Material': 'Gore-Tex Pro 3-layer',
                    'Armor': 'D3O Level 2 knees/hips',
                    'Waterproof': 'Gore-Tex Pro',
                    'Features': 'Adjustable waist/knees'
                },
                rating: 4.8,
                reviewCount: 156,
                images: ['/assets/images/gear/klim-badlands-pro.jpg'],
                sizes: ['30', '32', '34', '36', '38', '40'],
                inStock: true
            }
        ]
    }
];

class RevZillaDataGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, 'revzilla_data');
        this.imagesDir = path.join(this.outputDir, 'images');
    }

    async init() {
        await fs.mkdir(this.outputDir, { recursive: true });
        await fs.mkdir(this.imagesDir, { recursive: true });
    }

    async generateData() {
        console.log('Generating sample motorcycle gear data...');
        
        for (const category of SAMPLE_GEAR_DATA) {
            const filename = `motorcycle-${category.category}_products_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.outputDir, filename);
            
            // Transform data to match scraper format
            const products = category.products.map(product => ({
                url: `https://www.revzilla.com/motorcycle/${product.id}`,
                name: product.name,
                brand: product.brand,
                price: `$${product.price}`,
                salePrice: product.salePrice ? `$${product.salePrice}` : null,
                sku: product.id,
                rating: product.rating.toString(),
                reviewCount: product.reviewCount.toString(),
                description: product.description,
                features: product.features,
                specifications: product.specifications,
                images: product.images,
                sizes: product.sizes.map(size => ({
                    value: size,
                    text: size,
                    available: true
                })),
                category: `motorcycle-${category.category}`,
                localImagePath: product.images[0]
            }));
            
            await fs.writeFile(filepath, JSON.stringify(products, null, 2));
            console.log(`✓ Generated ${products.length} products for ${category.category}`);
        }
        
        console.log('\nSample data generation complete!');
        console.log(`Data saved to: ${this.outputDir}`);
        
        // Create placeholder images
        await this.createPlaceholderImages();
    }

    async createPlaceholderImages() {
        console.log('\nCreating placeholder SVG images...');
        
        const gearTypes = {
            'helmet': { color: '#1e40af', icon: '🪖' },
            'jacket': { color: '#dc2626', icon: '🧥' },
            'gloves': { color: '#059669', icon: '🧤' },
            'boots': { color: '#7c3aed', icon: '🥾' },
            'pants': { color: '#ea580c', icon: '👖' }
        };
        
        for (const [type, config] of Object.entries(gearTypes)) {
            const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="400" fill="${config.color}" opacity="0.1"/>
                <rect x="50" y="50" width="300" height="300" rx="20" fill="${config.color}" opacity="0.2"/>
                <text x="200" y="200" font-family="Arial, sans-serif" font-size="120" text-anchor="middle" dominant-baseline="middle">${config.icon}</text>
                <text x="200" y="300" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="${config.color}">${type.toUpperCase()}</text>
            </svg>`;
            
            const filename = `${type}-placeholder.svg`;
            await fs.writeFile(path.join(this.imagesDir, filename), svg);
        }
        
        console.log('✓ Placeholder images created');
    }
}

// Run the generator
async function main() {
    const generator = new RevZillaDataGenerator();
    
    try {
        await generator.init();
        await generator.generateData();
        
        console.log('\n✅ Sample data ready for import!');
        console.log('Run "node revzilla_db_integration.js" to import the data');
        
    } catch (error) {
        console.error('Error generating data:', error);
    }
}

main();