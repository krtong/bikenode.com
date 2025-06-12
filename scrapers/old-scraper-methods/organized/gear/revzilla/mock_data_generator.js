import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockDataGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, 'mock_data');
        this.categories = {
            helmets: {
                brands: ['Shoei', 'Arai', 'Bell', 'AGV', 'HJC', 'Scorpion', 'Icon'],
                styles: ['Full Face', 'Modular', 'Half Helmet', 'Adventure', 'Dual Sport'],
                priceRange: [100, 800]
            },
            jackets: {
                brands: ['Alpinestars', 'Dainese', 'Rev\'It!', 'Icon', 'Joe Rocket', 'Klim'],
                styles: ['Sport', 'Touring', 'Cruiser', 'Adventure', 'Mesh', 'Leather'],
                priceRange: [150, 1200]
            },
            gloves: {
                brands: ['Alpinestars', 'Dainese', 'Rev\'It!', 'Icon', 'Held', 'Racer'],
                styles: ['Racing', 'Touring', 'Summer', 'Winter', 'Adventure'],
                priceRange: [30, 300]
            },
            boots: {
                brands: ['Alpinestars', 'Dainese', 'Sidi', 'TCX', 'Forma', 'Icon'],
                styles: ['Racing', 'Touring', 'Adventure', 'Cruiser', 'Urban'],
                priceRange: [100, 600]
            },
            pants: {
                brands: ['Alpinestars', 'Dainese', 'Rev\'It!', 'Klim', 'Icon', 'Joe Rocket'],
                styles: ['Sport', 'Touring', 'Adventure', 'Overpants', 'Leather'],
                priceRange: [100, 800]
            },
            accessories: {
                brands: ['GoPro', 'Cardo', 'Sena', 'RAM Mounts', 'Oxford', 'Nelson-Rigg'],
                styles: ['Communication', 'Cameras', 'Luggage', 'Security', 'Tools'],
                priceRange: [20, 500]
            }
        };
    }

    async init() {
        await fs.mkdir(this.outputDir, { recursive: true });
        await fs.mkdir(path.join(this.outputDir, 'images'), { recursive: true });
        
        // Create category subdirectories
        for (const category of Object.keys(this.categories)) {
            await fs.mkdir(path.join(this.outputDir, 'images', category), { recursive: true });
        }
    }

    generateProductId() {
        return crypto.randomBytes(6).toString('hex');
    }

    generateProductName(category, brand, style) {
        const adjectives = ['Pro', 'Elite', 'Sport', 'Street', 'Race', 'Tour', 'Adventure'];
        const versions = ['', ' 2.0', ' 3', ' X', ' Plus', ' GT'];
        
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const version = versions[Math.floor(Math.random() * versions.length)];
        
        return `${brand} ${adjective} ${style}${version}`;
    }

    generateProduct(category) {
        const categoryData = this.categories[category];
        const brand = categoryData.brands[Math.floor(Math.random() * categoryData.brands.length)];
        const style = categoryData.styles[Math.floor(Math.random() * categoryData.styles.length)];
        const [minPrice, maxPrice] = categoryData.priceRange;
        
        const regularPrice = Math.floor(Math.random() * (maxPrice - minPrice) + minPrice);
        const isOnSale = Math.random() < 0.3; // 30% chance of sale
        const salePrice = isOnSale ? Math.floor(regularPrice * (0.7 + Math.random() * 0.2)) : null;
        
        const productId = this.generateProductId();
        const productName = this.generateProductName(category, brand, style);
        
        return {
            id: productId,
            url: `https://www.revzilla.com/motorcycle-${category}/${productId}`,
            scraped_at: new Date().toISOString(),
            name: productName,
            brand: brand,
            sku: `${brand.toUpperCase()}-${productId}`,
            mpn: `MPN-${productId}`,
            category: `motorcycle-${category}`,
            subcategory: style.toLowerCase(),
            price: {
                regular: regularPrice,
                sale: salePrice,
                currency: 'USD',
                in_stock: Math.random() > 0.1 // 90% in stock
            },
            rating: {
                average: (3.5 + Math.random() * 1.5).toFixed(1),
                count: Math.floor(Math.random() * 500),
                distribution: {
                    '5': Math.floor(Math.random() * 200),
                    '4': Math.floor(Math.random() * 150),
                    '3': Math.floor(Math.random() * 100),
                    '2': Math.floor(Math.random() * 50),
                    '1': Math.floor(Math.random() * 20)
                }
            },
            description: `The ${productName} is a high-quality ${style.toLowerCase()} ${category.slice(0, -1)} designed for motorcycle enthusiasts. Features premium materials and construction.`,
            features: [
                `${brand} quality construction`,
                `Designed for ${style.toLowerCase()} riding`,
                'CE certified protection',
                'Premium materials',
                'Comfortable fit',
                'Weather resistant'
            ],
            specifications: {
                'Brand': brand,
                'Model': productName,
                'Type': style,
                'Material': category === 'jackets' || category === 'pants' ? 'Leather/Textile' : 'Mixed',
                'Color': 'Black',
                'Warranty': '1 Year'
            },
            sizes: this.generateSizes(category),
            colors: [
                { value: 'black', text: 'Black', available: true },
                { value: 'white', text: 'White', available: true },
                { value: 'red', text: 'Red', available: Math.random() > 0.3 }
            ],
            variants: [],
            images: {
                main: `https://www.revzilla.com/mock/${productId}_main.jpg`,
                gallery: [
                    `https://www.revzilla.com/mock/${productId}_1.jpg`,
                    `https://www.revzilla.com/mock/${productId}_2.jpg`,
                    `https://www.revzilla.com/mock/${productId}_3.jpg`
                ],
                local_paths: []
            },
            meta: {
                title: `${productName} - RevZilla`,
                description: `Shop ${productName} at RevZilla. Free shipping on orders over $40.`,
                keywords: [brand, style, category]
            },
            json_ld: null,
            shipping: {
                free_shipping: regularPrice > 40,
                estimated_days: '3-5'
            },
            warranty: '1 Year Manufacturer Warranty',
            fitment: [],
            related_products: [],
            scrape_status: 'completed',
            error_count: 0,
            last_error: null
        };
    }

    generateSizes(category) {
        const sizeMap = {
            helmets: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
            jackets: ['38', '40', '42', '44', '46', '48', '50', '52'],
            gloves: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
            boots: ['7', '8', '9', '10', '11', '12', '13'],
            pants: ['28', '30', '32', '34', '36', '38', '40'],
            accessories: ['One Size']
        };
        
        const sizes = sizeMap[category] || ['S', 'M', 'L', 'XL'];
        return sizes.map(size => ({
            value: size.toLowerCase().replace(' ', '-'),
            text: size,
            available: Math.random() > 0.2 // 80% availability
        }));
    }

    async generateMockData(options = {}) {
        const {
            productsPerCategory = 20,
            categories = Object.keys(this.categories)
        } = options;
        
        const timestamp = new Date().toISOString().split('T')[0];
        const summaryData = {
            generated_at: new Date().toISOString(),
            categories: {},
            total_products: 0
        };
        
        for (const category of categories) {
            if (!this.categories[category]) continue;
            
            const products = [];
            for (let i = 0; i < productsPerCategory; i++) {
                products.push(this.generateProduct(category));
            }
            
            // Save category data
            const filename = `mock_${category}_${timestamp}.json`;
            const filepath = path.join(this.outputDir, filename);
            await fs.writeFile(filepath, JSON.stringify(products, null, 2));
            
            // Create placeholder images
            await this.createPlaceholderImages(category);
            
            summaryData.categories[category] = {
                count: products.length,
                file: filename
            };
            summaryData.total_products += products.length;
            
            console.log(`Generated ${products.length} mock ${category}`);
        }
        
        // Save summary
        await fs.writeFile(
            path.join(this.outputDir, 'mock_data_summary.json'),
            JSON.stringify(summaryData, null, 2)
        );
        
        return summaryData;
    }

    async createPlaceholderImages(category) {
        // Create simple SVG placeholder images
        const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="400" fill="#f0f0f0"/>
            <text x="200" y="200" text-anchor="middle" font-family="Arial" font-size="24" fill="#666">
                ${category.charAt(0).toUpperCase() + category.slice(1)} Image
            </text>
        </svg>`;
        
        const imagePath = path.join(this.outputDir, 'images', category, `${category}_placeholder.svg`);
        await fs.writeFile(imagePath, svg);
    }
}

export default MockDataGenerator;