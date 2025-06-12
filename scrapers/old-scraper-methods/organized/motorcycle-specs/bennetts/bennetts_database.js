const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class BennettsDatabase {
    constructor(dbPath = './scraped_data/database/bennetts_reviews.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async init() {
        console.log('🗄️ Initializing database...');
        
        // Ensure database directory exists
        const dbDir = path.dirname(this.dbPath);
        await fs.mkdir(dbDir, { recursive: true });
        
        this.db = new sqlite3.Database(this.dbPath);
        
        // Create tables
        await this.createTables();
        
        console.log('✅ Database initialized successfully');
    }

    async createTables() {
        const createTablesSQL = `
            -- Manufacturers table
            CREATE TABLE IF NOT EXISTS manufacturers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Models table
            CREATE TABLE IF NOT EXISTS models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                manufacturer_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
                UNIQUE(name, manufacturer_id)
            );

            -- Authors table
            CREATE TABLE IF NOT EXISTS authors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Reviews table
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                manufacturer_id INTEGER,
                model_id INTEGER,
                author_id INTEGER,
                year INTEGER,
                publish_date TEXT,
                rating REAL,
                price TEXT,
                content TEXT,
                verdict TEXT,
                scraped_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
                FOREIGN KEY (model_id) REFERENCES models(id),
                FOREIGN KEY (author_id) REFERENCES authors(id)
            );

            -- Specifications table
            CREATE TABLE IF NOT EXISTS specifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER,
                spec_key TEXT NOT NULL,
                spec_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (review_id) REFERENCES reviews(id),
                UNIQUE(review_id, spec_key)
            );

            -- Pros and Cons table
            CREATE TABLE IF NOT EXISTS pros_cons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER,
                type TEXT CHECK(type IN ('pro', 'con')),
                description TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (review_id) REFERENCES reviews(id)
            );

            -- Images table
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER,
                url TEXT NOT NULL,
                local_path TEXT,
                alt_text TEXT,
                title TEXT,
                image_order INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (review_id) REFERENCES reviews(id)
            );

            -- Rivals table
            CREATE TABLE IF NOT EXISTS rivals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER,
                name TEXT NOT NULL,
                price TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (review_id) REFERENCES reviews(id)
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_reviews_manufacturer ON reviews(manufacturer_id);
            CREATE INDEX IF NOT EXISTS idx_reviews_model ON reviews(model_id);
            CREATE INDEX IF NOT EXISTS idx_reviews_year ON reviews(year);
            CREATE INDEX IF NOT EXISTS idx_reviews_author ON reviews(author_id);
            CREATE INDEX IF NOT EXISTS idx_specifications_review ON specifications(review_id);
            CREATE INDEX IF NOT EXISTS idx_pros_cons_review ON pros_cons(review_id);
            CREATE INDEX IF NOT EXISTS idx_images_review ON images(review_id);
            CREATE INDEX IF NOT EXISTS idx_rivals_review ON rivals(review_id);
        `;

        const statements = createTablesSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            await this.run(statement.trim());
        }
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async insertOrGetManufacturer(name) {
        if (!name) return null;
        
        let manufacturer = await this.get(
            'SELECT id FROM manufacturers WHERE name = ?',
            [name]
        );
        
        if (!manufacturer) {
            const result = await this.run(
                'INSERT INTO manufacturers (name) VALUES (?)',
                [name]
            );
            return result.lastID;
        }
        
        return manufacturer.id;
    }

    async insertOrGetModel(name, manufacturerId) {
        if (!name || !manufacturerId) return null;
        
        let model = await this.get(
            'SELECT id FROM models WHERE name = ? AND manufacturer_id = ?',
            [name, manufacturerId]
        );
        
        if (!model) {
            const result = await this.run(
                'INSERT INTO models (name, manufacturer_id) VALUES (?, ?)',
                [name, manufacturerId]
            );
            return result.lastID;
        }
        
        return model.id;
    }

    async insertOrGetAuthor(name) {
        if (!name) return null;
        
        let author = await this.get(
            'SELECT id FROM authors WHERE name = ?',
            [name]
        );
        
        if (!author) {
            const result = await this.run(
                'INSERT INTO authors (name) VALUES (?)',
                [name]
            );
            return result.lastID;
        }
        
        return author.id;
    }

    async insertReview(reviewData) {
        console.log(`💾 Inserting review: ${reviewData.title}`);
        
        try {
            // Get or create foreign key IDs
            const manufacturerId = await this.insertOrGetManufacturer(reviewData.manufacturer);
            const modelId = await this.insertOrGetModel(reviewData.model, manufacturerId);
            const authorId = await this.insertOrGetAuthor(reviewData.author);
            
            // Insert main review
            const reviewResult = await this.run(`
                INSERT OR REPLACE INTO reviews (
                    url, title, manufacturer_id, model_id, author_id, year,
                    publish_date, rating, price, content, verdict, scraped_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                reviewData.url,
                reviewData.title,
                manufacturerId,
                modelId,
                authorId,
                reviewData.year ? parseInt(reviewData.year) : null,
                reviewData.publishDate,
                reviewData.rating,
                reviewData.price,
                reviewData.content,
                reviewData.verdict,
                reviewData.scrapedAt
            ]);
            
            const reviewId = reviewResult.lastID;
            
            // Insert specifications
            if (reviewData.specifications) {
                for (const [key, value] of Object.entries(reviewData.specifications)) {
                    await this.run(`
                        INSERT OR REPLACE INTO specifications (review_id, spec_key, spec_value)
                        VALUES (?, ?, ?)
                    `, [reviewId, key, value]);
                }
            }
            
            // Insert pros and cons
            if (reviewData.prosAndCons) {
                // Delete existing pros/cons for this review
                await this.run('DELETE FROM pros_cons WHERE review_id = ?', [reviewId]);
                
                for (const pro of reviewData.prosAndCons.pros || []) {
                    await this.run(`
                        INSERT INTO pros_cons (review_id, type, description)
                        VALUES (?, 'pro', ?)
                    `, [reviewId, pro]);
                }
                
                for (const con of reviewData.prosAndCons.cons || []) {
                    await this.run(`
                        INSERT INTO pros_cons (review_id, type, description)
                        VALUES (?, 'con', ?)
                    `, [reviewId, con]);
                }
            }
            
            // Insert images
            if (reviewData.images) {
                // Delete existing images for this review
                await this.run('DELETE FROM images WHERE review_id = ?', [reviewId]);
                
                for (let i = 0; i < reviewData.images.length; i++) {
                    const image = reviewData.images[i];
                    await this.run(`
                        INSERT INTO images (review_id, url, local_path, alt_text, title, image_order)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [reviewId, image.src, image.localPath || null, image.alt, image.title, i + 1]);
                }
            }
            
            // Insert rivals
            if (reviewData.rivals) {
                // Delete existing rivals for this review
                await this.run('DELETE FROM rivals WHERE review_id = ?', [reviewId]);
                
                for (const rival of reviewData.rivals) {
                    await this.run(`
                        INSERT INTO rivals (review_id, name, price)
                        VALUES (?, ?, ?)
                    `, [reviewId, rival.name, rival.price]);
                }
            }
            
            console.log(`✅ Successfully inserted review: ${reviewData.title}`);
            return reviewId;
            
        } catch (error) {
            console.error(`❌ Error inserting review ${reviewData.title}:`, error.message);
            throw error;
        }
    }

    async importFromJsonFile(jsonFilePath) {
        console.log(`📥 Importing data from ${jsonFilePath}...`);
        
        try {
            const jsonData = await fs.readFile(jsonFilePath, 'utf8');
            const reviews = JSON.parse(jsonData);
            
            console.log(`📊 Found ${reviews.length} reviews to import`);
            
            for (let i = 0; i < reviews.length; i++) {
                const review = reviews[i];
                console.log(`📝 Importing ${i + 1}/${reviews.length}: ${review.title}`);
                
                await this.insertReview(review);
            }
            
            console.log('✅ Import completed successfully');
            
        } catch (error) {
            console.error('❌ Error during import:', error.message);
            throw error;
        }
    }

    async getStats() {
        const stats = {
            totalReviews: 0,
            totalManufacturers: 0,
            totalModels: 0,
            totalAuthors: 0,
            totalImages: 0,
            reviewsByYear: {},
            reviewsByManufacturer: {}
        };
        
        // Get counts
        const counts = await this.all(`
            SELECT 
                (SELECT COUNT(*) FROM reviews) as total_reviews,
                (SELECT COUNT(*) FROM manufacturers) as total_manufacturers,
                (SELECT COUNT(*) FROM models) as total_models,
                (SELECT COUNT(*) FROM authors) as total_authors,
                (SELECT COUNT(*) FROM images) as total_images
        `);
        
        if (counts.length > 0) {
            stats.totalReviews = counts[0].total_reviews;
            stats.totalManufacturers = counts[0].total_manufacturers;
            stats.totalModels = counts[0].total_models;
            stats.totalAuthors = counts[0].total_authors;
            stats.totalImages = counts[0].total_images;
        }
        
        // Get reviews by year
        const yearStats = await this.all(`
            SELECT year, COUNT(*) as count
            FROM reviews
            WHERE year IS NOT NULL
            GROUP BY year
            ORDER BY year DESC
        `);
        
        yearStats.forEach(row => {
            stats.reviewsByYear[row.year] = row.count;
        });
        
        // Get reviews by manufacturer
        const manufacturerStats = await this.all(`
            SELECT m.name, COUNT(r.id) as count
            FROM manufacturers m
            LEFT JOIN reviews r ON m.id = r.manufacturer_id
            GROUP BY m.id, m.name
            ORDER BY count DESC
        `);
        
        manufacturerStats.forEach(row => {
            stats.reviewsByManufacturer[row.name] = row.count;
        });
        
        return stats;
    }

    async getReviewById(reviewId) {
        const review = await this.get(`
            SELECT 
                r.*,
                m.name as manufacturer_name,
                mo.name as model_name,
                a.name as author_name
            FROM reviews r
            LEFT JOIN manufacturers m ON r.manufacturer_id = m.id
            LEFT JOIN models mo ON r.model_id = mo.id
            LEFT JOIN authors a ON r.author_id = a.id
            WHERE r.id = ?
        `, [reviewId]);
        
        if (!review) {
            return null;
        }
        
        // Get specifications
        const specs = await this.all(
            'SELECT spec_key, spec_value FROM specifications WHERE review_id = ?',
            [reviewId]
        );
        review.specifications = {};
        specs.forEach(spec => {
            review.specifications[spec.spec_key] = spec.spec_value;
        });
        
        // Get pros and cons
        const prosAndCons = await this.all(
            'SELECT type, description FROM pros_cons WHERE review_id = ?',
            [reviewId]
        );
        review.prosAndCons = { pros: [], cons: [] };
        prosAndCons.forEach(item => {
            if (item.type === 'pro') {
                review.prosAndCons.pros.push(item.description);
            } else {
                review.prosAndCons.cons.push(item.description);
            }
        });
        
        // Get images
        const images = await this.all(
            'SELECT url, local_path, alt_text, title FROM images WHERE review_id = ? ORDER BY image_order',
            [reviewId]
        );
        review.images = images;
        
        // Get rivals
        const rivals = await this.all(
            'SELECT name, price FROM rivals WHERE review_id = ?',
            [reviewId]
        );
        review.rivals = rivals;
        
        return review;
    }

    async close() {
        if (this.db) {
            await new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }
}

module.exports = BennettsDatabase;

// Example usage
if (require.main === module) {
    async function main() {
        const db = new BennettsDatabase();
        
        try {
            await db.init();
            
            // Import JSON data if it exists
            const jsonPath = './scraped_data/reviews/all_reviews.json';
            try {
                await fs.access(jsonPath);
                await db.importFromJsonFile(jsonPath);
            } catch (error) {
                console.log('No existing JSON file found to import');
            }
            
            // Print stats
            const stats = await db.getStats();
            console.log('📊 Database Statistics:');
            console.log(`   Reviews: ${stats.totalReviews}`);
            console.log(`   Manufacturers: ${stats.totalManufacturers}`);
            console.log(`   Models: ${stats.totalModels}`);
            console.log(`   Authors: ${stats.totalAuthors}`);
            console.log(`   Images: ${stats.totalImages}`);
            
        } catch (error) {
            console.error('Error:', error);
        } finally {
            await db.close();
        }
    }
    
    main();
}
