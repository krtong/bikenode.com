const BennettsDatabase = require('./scrapers/bennetts_database.js');

async function testDatabase() {
    console.log('🚀 Starting Bennetts Database Test...\n');
    
    const db = new BennettsDatabase();
    
    try {
        // Initialize database
        console.log('📊 Initializing database...');
        await db.init();
        console.log('✅ Database initialized\n');
        
        // Create test review data
        const testReviewData = {
            url: 'https://test.com/review1',
            title: 'Test Honda CB125F 2025 Review',
            manufacturer: 'Honda',
            model: 'CB125F',
            year: '2025',
            author: {
                name: 'Test Author'
            },
            publishDate: '2025-06-03',
            rating: 4.5,
            price: '£3,500',
            specifications: {
                'Engine': '124cc single-cylinder',
                'Power': '11.4bhp',
                'Weight': '126kg'
            },
            prosAndCons: {
                pros: ['Fuel efficient', 'Easy to ride', 'Affordable'],
                cons: ['Limited power', 'Basic features']
            },
            content: 'This is a test review content for the Honda CB125F 2025. The bike offers excellent fuel efficiency and is perfect for new riders.',
            images: [
                {
                    src: 'https://test.com/image1.jpg',
                    alt: 'Honda CB125F side view',
                    title: 'Side view'
                },
                {
                    src: 'https://test.com/image2.jpg',
                    alt: 'Honda CB125F front view',
                    title: 'Front view'
                }
            ],
            rivals: [
                {
                    name: 'Yamaha YBR125',
                    price: '£3,400'
                },
                {
                    name: 'Suzuki GS125',
                    price: '£3,600'
                }
            ],
            verdict: 'A solid choice for beginners',
            scrapedAt: new Date().toISOString()
        };
        
        console.log('💾 Testing database storage...');
        const reviewId = await db.insertReview(testReviewData);
        console.log(`✅ Review saved to database with ID: ${reviewId}`);
        
        // Test retrieving from database
        console.log('\n📖 Testing database retrieval...');
        const savedReview = await db.getReviewById(reviewId);
        console.log(`✅ Retrieved review: ${savedReview.title}`);
        console.log(`   Manufacturer: ${savedReview.manufacturer_name}`);
        console.log(`   Model: ${savedReview.model_name}`);
        console.log(`   Author: ${savedReview.author_name}`);
        console.log(`   Specifications: ${Object.keys(savedReview.specifications).length} items`);
        console.log(`   Pros: ${savedReview.prosAndCons.pros.length}, Cons: ${savedReview.prosAndCons.cons.length}`);
        console.log(`   Images: ${savedReview.images.length}`);
        console.log(`   Rivals: ${savedReview.rivals.length}`);
        
        // Show database stats
        console.log('\n📈 Database Statistics:');
        const stats = await db.getStats();
        console.log(`   Reviews: ${stats.totalReviews}`);
        console.log(`   Manufacturers: ${stats.totalManufacturers}`);
        console.log(`   Models: ${stats.totalModels}`);
        console.log(`   Authors: ${stats.totalAuthors}`);
        console.log(`   Images: ${stats.totalImages}`);
        
        console.log('\n🎉 Database test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await db.close();
    }
}

// Run the test
if (require.main === module) {
    testDatabase()
        .then(() => {
            console.log('\n✅ All database tests passed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Database test failed:', error);
            process.exit(1);
        });
}

module.exports = testDatabase;
