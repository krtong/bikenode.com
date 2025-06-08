import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RevZillaDBIntegration {
    constructor() {
        this.pool = new pg.Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'bikenode',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres'
        });
    }

    async init() {
        // Create gear products table if it doesn't exist
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS gear_products (
                id SERIAL PRIMARY KEY,
                external_id VARCHAR(255) UNIQUE,
                name VARCHAR(500) NOT NULL,
                brand VARCHAR(255),
                category VARCHAR(255),
                subcategory VARCHAR(255),
                price DECIMAL(10, 2),
                sale_price DECIMAL(10, 2),
                currency VARCHAR(10) DEFAULT 'USD',
                description TEXT,
                features TEXT[],
                specifications JSONB,
                rating DECIMAL(2, 1),
                review_count INTEGER,
                images TEXT[],
                local_image_path VARCHAR(500),
                sizes JSONB,
                url VARCHAR(1000),
                in_stock BOOLEAN DEFAULT true,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_gear_products_brand ON gear_products(brand);
            CREATE INDEX IF NOT EXISTS idx_gear_products_category ON gear_products(category);
            CREATE INDEX IF NOT EXISTS idx_gear_products_price ON gear_products(price);
            CREATE INDEX IF NOT EXISTS idx_gear_products_rating ON gear_products(rating);
        `;

        try {
            await this.pool.query(createTableQuery);
            console.log('Database tables initialized');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    async insertProduct(product) {
        const query = `
            INSERT INTO gear_products (
                external_id, name, brand, category, subcategory,
                price, sale_price, description, features, specifications,
                rating, review_count, images, local_image_path, sizes,
                url, in_stock
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17
            )
            ON CONFLICT (external_id) DO UPDATE SET
                name = EXCLUDED.name,
                price = EXCLUDED.price,
                sale_price = EXCLUDED.sale_price,
                description = EXCLUDED.description,
                features = EXCLUDED.features,
                specifications = EXCLUDED.specifications,
                rating = EXCLUDED.rating,
                review_count = EXCLUDED.review_count,
                images = EXCLUDED.images,
                local_image_path = EXCLUDED.local_image_path,
                sizes = EXCLUDED.sizes,
                in_stock = EXCLUDED.in_stock,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id;
        `;

        const values = [
            product.sku || product.url.split('/').pop(),
            product.name,
            product.brand,
            product.category,
            product.subcategory || null,
            this.parsePrice(product.price),
            product.salePrice ? this.parsePrice(product.salePrice) : null,
            product.description,
            product.features || [],
            JSON.stringify(product.specifications || {}),
            product.rating ? parseFloat(product.rating) : null,
            product.reviewCount ? parseInt(product.reviewCount) : null,
            product.images || [],
            product.localImagePath || null,
            JSON.stringify(product.sizes || []),
            product.url,
            product.sizes && product.sizes.length > 0
        ];

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('Error inserting product:', error);
            throw error;
        }
    }

    parsePrice(priceString) {
        if (!priceString) return null;
        const cleaned = priceString.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || null;
    }

    async importFromJSON(jsonFilePath) {
        try {
            const data = await fs.readFile(jsonFilePath, 'utf8');
            const parsedData = JSON.parse(data);
            
            // Skip non-product files (like analysis files)
            if (!Array.isArray(parsedData)) {
                console.log(`Skipping non-product file: ${jsonFilePath}`);
                return { imported: 0, failed: 0 };
            }
            
            const products = parsedData;
            console.log(`Importing ${products.length} products from ${jsonFilePath}`);
            
            let imported = 0;
            let failed = 0;
            
            for (const product of products) {
                try {
                    await this.insertProduct(product);
                    imported++;
                } catch (error) {
                    console.error(`Failed to import product: ${product.name}`, error.message);
                    failed++;
                }
            }
            
            console.log(`Import complete: ${imported} successful, ${failed} failed`);
            return { imported, failed };
            
        } catch (error) {
            console.error('Error reading JSON file:', error);
            throw error;
        }
    }

    async getProductsByCategory(category, limit = 50) {
        const query = `
            SELECT * FROM gear_products
            WHERE category = $1
            ORDER BY rating DESC NULLS LAST, review_count DESC NULLS LAST
            LIMIT $2;
        `;
        
        const result = await this.pool.query(query, [category, limit]);
        return result.rows;
    }

    async searchProducts(searchTerm, filters = {}) {
        let query = `
            SELECT * FROM gear_products
            WHERE (
                name ILIKE $1 OR
                brand ILIKE $1 OR
                description ILIKE $1
            )
        `;
        
        const values = [`%${searchTerm}%`];
        let paramIndex = 2;
        
        if (filters.category) {
            query += ` AND category = $${paramIndex}`;
            values.push(filters.category);
            paramIndex++;
        }
        
        if (filters.brand) {
            query += ` AND brand = $${paramIndex}`;
            values.push(filters.brand);
            paramIndex++;
        }
        
        if (filters.minPrice !== undefined) {
            query += ` AND price >= $${paramIndex}`;
            values.push(filters.minPrice);
            paramIndex++;
        }
        
        if (filters.maxPrice !== undefined) {
            query += ` AND price <= $${paramIndex}`;
            values.push(filters.maxPrice);
            paramIndex++;
        }
        
        if (filters.minRating !== undefined) {
            query += ` AND rating >= $${paramIndex}`;
            values.push(filters.minRating);
            paramIndex++;
        }
        
        query += ` ORDER BY rating DESC NULLS LAST, review_count DESC NULLS LAST LIMIT 100;`;
        
        const result = await this.pool.query(query, values);
        return result.rows;
    }

    async getTopRatedProducts(limit = 20) {
        const query = `
            SELECT * FROM gear_products
            WHERE rating IS NOT NULL AND review_count > 10
            ORDER BY rating DESC, review_count DESC
            LIMIT $1;
        `;
        
        const result = await this.pool.query(query, [limit]);
        return result.rows;
    }

    async close() {
        await this.pool.end();
    }
}

// Example usage
async function main() {
    const db = new RevZillaDBIntegration();
    
    try {
        await db.init();
        
        // Import data from scraped JSON files
        const dataDir = path.join(__dirname, 'revzilla_data');
        const files = await fs.readdir(dataDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of jsonFiles) {
            const filepath = path.join(dataDir, file);
            await db.importFromJSON(filepath);
        }
        
        // Example queries
        console.log('\nTop rated products:');
        const topRated = await db.getTopRatedProducts(5);
        topRated.forEach(p => {
            console.log(`- ${p.brand} ${p.name}: ${p.rating}/5 (${p.review_count} reviews)`);
        });
        
        console.log('\nMotorcycle helmets:');
        const helmets = await db.getProductsByCategory('motorcycle-helmets', 5);
        helmets.forEach(p => {
            console.log(`- ${p.brand} ${p.name}: $${p.price}`);
        });
        
    } catch (error) {
        console.error('Database error:', error);
    } finally {
        await db.close();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default RevZillaDBIntegration;