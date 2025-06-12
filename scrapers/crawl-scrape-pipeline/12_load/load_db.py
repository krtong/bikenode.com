#!/usr/bin/env python3
"""
Step 12: Database Loading
Loads cleaned data into PostgreSQL database.
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor, execute_batch
from psycopg2 import sql
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / '00_env'))

from config import config
from utils import setup_logging, create_timestamp, save_json


class DatabaseLoader:
    """Loads scraped data into PostgreSQL database."""
    
    def __init__(self, domain: str):
        """Initialize database loader."""
        self.domain = domain
        self.logger = setup_logging('db_loader', config.dirs['load'] / 'load.log')
        self.stats_file = config.dirs['load'] / 'load_stats.json'
        self.conn = None
        self.scrape_history_id = None
    
    def connect(self) -> bool:
        """Connect to database."""
        try:
            self.conn = psycopg2.connect(config.database_url)
            self.logger.info("Connected to database")
            return True
        except Exception as e:
            self.logger.error(f"Failed to connect to database: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from database."""
        if self.conn:
            self.conn.close()
            self.logger.info("Disconnected from database")
    
    def create_schema(self) -> bool:
        """Create database schema if it doesn't exist."""
        schema_file = Path(__file__).parent / 'schema.sql'
        
        if not schema_file.exists():
            self.logger.error("Schema file not found")
            return False
        
        try:
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
            
            with self.conn.cursor() as cur:
                cur.execute(schema_sql)
                self.conn.commit()
            
            self.logger.info("Database schema created/verified")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create schema: {e}")
            self.conn.rollback()
            return False
    
    def start_scrape_history(self, scrape_type: str = 'full') -> Optional[int]:
        """Create scrape history record."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scraper.scrape_history 
                    (domain, scrape_type, start_time, status)
                    VALUES (%s, %s, %s, 'running')
                    RETURNING id
                """, (self.domain, scrape_type, datetime.utcnow()))
                
                self.scrape_history_id = cur.fetchone()[0]
                self.conn.commit()
                
                return self.scrape_history_id
                
        except Exception as e:
            self.logger.error(f"Failed to create scrape history: {e}")
            self.conn.rollback()
            return None
    
    def update_scrape_history(self, stats: Dict[str, Any], status: str = 'completed'):
        """Update scrape history with results."""
        if not self.scrape_history_id:
            return
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    UPDATE scraper.scrape_history
                    SET end_time = %s,
                        status = %s,
                        urls_scraped = %s,
                        items_extracted = %s,
                        items_loaded = %s,
                        metadata = %s
                    WHERE id = %s
                """, (
                    datetime.utcnow(),
                    status,
                    stats.get('urls_scraped', 0),
                    stats.get('items_extracted', 0),
                    stats.get('items_loaded', 0),
                    json.dumps(stats),
                    self.scrape_history_id
                ))
                self.conn.commit()
                
        except Exception as e:
            self.logger.error(f"Failed to update scrape history: {e}")
            self.conn.rollback()
    
    def check_existing_product(self, url: str) -> Optional[Dict[str, Any]]:
        """Check if product already exists."""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, price, updated_at
                    FROM scraper.products
                    WHERE source_url = %s
                """, (url,))
                
                return cur.fetchone()
                
        except Exception as e:
            self.logger.error(f"Error checking existing product: {e}")
            return None
    
    def insert_product(self, product_data: Dict[str, Any]) -> Optional[int]:
        """Insert new product."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scraper.products (
                        source_url, source_domain, external_id, sku,
                        title, description, price, brand, category,
                        availability, rating, reviews_count,
                        last_scraped_at, metadata
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id
                """, (
                    product_data['url'],
                    self.domain,
                    product_data.get('external_id'),
                    product_data.get('sku'),
                    product_data['title'],
                    product_data.get('description'),
                    product_data.get('price'),
                    product_data.get('brand'),
                    product_data.get('category'),
                    product_data.get('availability'),
                    product_data.get('rating'),
                    product_data.get('reviews_count'),
                    datetime.utcnow(),
                    json.dumps(product_data.get('metadata', {}))
                ))
                
                product_id = cur.fetchone()[0]
                
                # Insert images
                if product_data.get('images'):
                    self.insert_product_images(cur, product_id, product_data['images'])
                
                # Insert initial price history
                if product_data.get('price'):
                    cur.execute("""
                        INSERT INTO scraper.price_history (product_id, price)
                        VALUES (%s, %s)
                    """, (product_id, product_data['price']))
                
                self.conn.commit()
                return product_id
                
        except Exception as e:
            self.logger.error(f"Failed to insert product: {e}")
            self.conn.rollback()
            return None
    
    def update_product(self, product_id: int, product_data: Dict[str, Any], 
                      old_price: Optional[float]) -> bool:
        """Update existing product."""
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    UPDATE scraper.products SET
                        title = %s,
                        description = %s,
                        price = %s,
                        brand = %s,
                        category = %s,
                        availability = %s,
                        rating = %s,
                        reviews_count = %s,
                        last_scraped_at = %s,
                        metadata = %s
                    WHERE id = %s
                """, (
                    product_data['title'],
                    product_data.get('description'),
                    product_data.get('price'),
                    product_data.get('brand'),
                    product_data.get('category'),
                    product_data.get('availability'),
                    product_data.get('rating'),
                    product_data.get('reviews_count'),
                    datetime.utcnow(),
                    json.dumps(product_data.get('metadata', {})),
                    product_id
                ))
                
                # Update images
                if product_data.get('images'):
                    # Delete old images
                    cur.execute("DELETE FROM scraper.product_images WHERE product_id = %s", (product_id,))
                    # Insert new images
                    self.insert_product_images(cur, product_id, product_data['images'])
                
                # Track price change
                new_price = product_data.get('price')
                if new_price and old_price and new_price != old_price:
                    cur.execute("""
                        INSERT INTO scraper.price_history (product_id, price)
                        VALUES (%s, %s)
                    """, (product_id, new_price))
                
                self.conn.commit()
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to update product: {e}")
            self.conn.rollback()
            return False
    
    def insert_product_images(self, cursor, product_id: int, images: List[str]):
        """Insert product images."""
        if not images:
            return
        
        image_data = []
        for i, image_url in enumerate(images[:10]):  # Limit to 10 images
            image_data.append((
                product_id,
                image_url,
                'primary' if i == 0 else 'additional',
                i
            ))
        
        execute_batch(cursor, """
            INSERT INTO scraper.product_images 
            (product_id, image_url, image_type, position)
            VALUES (%s, %s, %s, %s)
        """, image_data)
    
    def load_batch(self, products: List[Dict[str, Any]]) -> Dict[str, int]:
        """Load a batch of products."""
        stats = {
            'processed': 0,
            'inserted': 0,
            'updated': 0,
            'failed': 0,
            'price_changes': 0,
        }
        
        for product in products:
            stats['processed'] += 1
            
            # Check if product exists
            existing = self.check_existing_product(product['url'])
            
            if existing:
                # Update existing product
                success = self.update_product(
                    existing['id'],
                    product,
                    existing['price']
                )
                
                if success:
                    stats['updated'] += 1
                    if existing['price'] != product.get('price'):
                        stats['price_changes'] += 1
                else:
                    stats['failed'] += 1
            else:
                # Insert new product
                product_id = self.insert_product(product)
                if product_id:
                    stats['inserted'] += 1
                else:
                    stats['failed'] += 1
        
        return stats
    
    def run(self, input_file: Optional[Path] = None, 
            batch_size: int = 100,
            update_existing: bool = True) -> Dict[str, Any]:
        """Run database loading process."""
        self.logger.info(f"Starting database load for domain: {self.domain}")
        
        # Connect to database
        if not self.connect():
            return {}
        
        try:
            # Create schema
            if not self.create_schema():
                return {}
            
            # Default input
            if input_file is None:
                input_file = config.dirs['load'] / 'clean.csv'
                if not input_file.exists():
                    input_file = config.dirs['clean'] / 'clean.csv'
            
            if not input_file.exists():
                self.logger.error(f"Input file not found: {input_file}")
                return {}
            
            # Load data
            self.logger.info(f"Loading data from {input_file}")
            if input_file.suffix == '.csv':
                df = pd.read_csv(input_file)
            else:
                df = pd.read_json(input_file)
            
            # Convert DataFrame to list of dicts
            products = df.to_dict('records')
            self.logger.info(f"Loaded {len(products)} products")
            
            # Start scrape history
            self.start_scrape_history('full' if not update_existing else 'update')
            
            # Process in batches
            overall_stats = {
                'start_time': create_timestamp(),
                'total_products': len(products),
                'processed': 0,
                'inserted': 0,
                'updated': 0,
                'failed': 0,
                'price_changes': 0,
                'urls_scraped': len(products),
                'items_extracted': len(products),
            }
            
            for i in range(0, len(products), batch_size):
                batch = products[i:i + batch_size]
                self.logger.info(f"Processing batch {i//batch_size + 1} ({len(batch)} items)")
                
                batch_stats = self.load_batch(batch)
                
                # Update overall stats
                for key in ['processed', 'inserted', 'updated', 'failed', 'price_changes']:
                    overall_stats[key] += batch_stats[key]
            
            overall_stats['items_loaded'] = overall_stats['inserted'] + overall_stats['updated']
            overall_stats['end_time'] = create_timestamp()
            
            # Update scrape history
            self.update_scrape_history(overall_stats)
            
            # Refresh materialized views
            self.logger.info("Refreshing materialized views...")
            with self.conn.cursor() as cur:
                cur.execute("SELECT scraper.refresh_category_stats()")
                self.conn.commit()
            
            # Save statistics
            save_json(overall_stats, self.stats_file)
            
            # Log summary
            self.logger.info("Database loading complete!")
            self.logger.info(f"Processed: {overall_stats['processed']}")
            self.logger.info(f"Inserted: {overall_stats['inserted']}")
            self.logger.info(f"Updated: {overall_stats['updated']}")
            self.logger.info(f"Failed: {overall_stats['failed']}")
            self.logger.info(f"Price changes: {overall_stats['price_changes']}")
            
            return overall_stats
            
        except Exception as e:
            self.logger.error(f"Database loading failed: {e}")
            if self.scrape_history_id:
                self.update_scrape_history({'error': str(e)}, 'failed')
            return {}
            
        finally:
            self.disconnect()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Load cleaned data into database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Load cleaned CSV data
  python load_db.py --domain example.com
  
  # Load from custom file
  python load_db.py --domain example.com --input custom_clean.csv
  
  # Skip updating existing products
  python load_db.py --domain example.com --no-update
  
  # Use larger batch size
  python load_db.py --domain example.com --batch-size 500
        """
    )
    
    parser.add_argument('--domain', required=True, help='Domain being loaded')
    parser.add_argument('--input', help='Input CSV or JSON file')
    parser.add_argument('--batch-size', type=int, default=100,
                       help='Batch size for database operations')
    parser.add_argument('--no-update', action='store_true',
                       help='Skip updating existing products')
    
    args = parser.parse_args()
    
    # Run loader
    loader = DatabaseLoader(args.domain)
    
    input_file = Path(args.input) if args.input else None
    stats = loader.run(
        input_file=input_file,
        batch_size=args.batch_size,
        update_existing=not args.no_update
    )
    
    if stats:
        print(f"\nDatabase loading complete!")
        print(f"Total products: {stats['total_products']}")
        print(f"Inserted: {stats['inserted']}")
        print(f"Updated: {stats['updated']}")
        print(f"Failed: {stats['failed']}")
        if stats['price_changes']:
            print(f"Price changes detected: {stats['price_changes']}")


if __name__ == '__main__':
    main()