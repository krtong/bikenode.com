import csv
import sqlite3
import os
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('BikeDataMigration')

# Define paths
BASE_DIR = Path(__file__).parent.parent
CSV_PATH = BASE_DIR / 'data' / 'bikedata' / 'motorcycles.csv'
DB_PATH = BASE_DIR / 'data' / 'bikes.db'

def ensure_directory_exists(path):
    """Ensure the directory for the given path exists"""
    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)

def create_database():
    """Create the SQLite database and motorcycles table"""
    ensure_directory_exists(DB_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create the motorcycles table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS motorcycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER,
        make TEXT,
        model TEXT,
        package TEXT,
        category TEXT,
        engine TEXT
    )
    ''')
    
    # Create indexes for common queries
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_year_make_model ON motorcycles (year, make, model)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_category ON motorcycles (category)')
    
    conn.commit()
    return conn

def import_csv_to_db(conn):
    """Import data from CSV to the SQLite database"""
    if not os.path.exists(CSV_PATH):
        logger.error(f"CSV file not found: {CSV_PATH}")
        return False
    
    cursor = conn.cursor()
    
    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM motorcycles")
    if cursor.fetchone()[0] > 0:
        logger.warning("Database already contains data. Truncating table before import.")
        cursor.execute("DELETE FROM motorcycles")
        conn.commit()
    
    # Read CSV and insert data
    try:
        with open(CSV_PATH, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            # Verify expected columns
            expected_columns = {'Year', 'Make', 'Model', 'Package', 'Category', 'Engine'}
            if not expected_columns.issubset(set(reader.fieldnames)):
                missing = expected_columns - set(reader.fieldnames)
                logger.error(f"Missing expected columns in CSV: {missing}")
                return False
            
            # Insert each row
            rows_inserted = 0
            for row in reader:
                try:
                    # Handle possible missing values
                    year = int(row['Year']) if row['Year'] else None
                    make = row['Make'] if row['Make'] else None
                    model = row['Model'] if row['Model'] else None
                    package = row['Package'] if row['Package'] else None
                    category = row['Category'] if row['Category'] else None
                    engine = row['Engine'] if row['Engine'] else None
                    
                    cursor.execute('''
                    INSERT INTO motorcycles (year, make, model, package, category, engine)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ''', (year, make, model, package, category, engine))
                    
                    rows_inserted += 1
                    
                    # Log progress periodically
                    if rows_inserted % 1000 == 0:
                        logger.info(f"Inserted {rows_inserted} rows...")
                        conn.commit()
                
                except Exception as e:
                    logger.error(f"Error inserting row {row}: {e}")
            
            # Final commit
            conn.commit()
            logger.info(f"Successfully imported {rows_inserted} motorcycle records")
            
            return True
            
    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        return False

def main():
    """Main function to run the migration"""
    logger.info("Starting motorcycle data migration")
    
    try:
        # Create the database and table
        conn = create_database()
        logger.info("Database and table created successfully")
        
        # Import the data
        success = import_csv_to_db(conn)
        if success:
            logger.info("Migration completed successfully")
        else:
            logger.error("Migration failed")
        
        # Close the connection
        conn.close()
        
    except Exception as e:
        logger.error(f"Unexpected error during migration: {e}")

if __name__ == "__main__":
    main()
