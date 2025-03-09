import csv
import sqlite3
import os
import logging
from pathlib import Path
import sys

# Add the parent directory to the path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.data_manager import BikeDataManager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('BikeDataMigration')

def convert_csv_to_sqlite():
    """Convert the CSV data to SQLite database"""
    csv_path = BikeDataManager.get_csv_path()
    db_path = BikeDataManager.get_db_path()
    
    logger.info(f"Converting CSV at {csv_path} to SQLite database at {db_path}")
    
    # Create SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create table
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
    
    # Read CSV and insert into database
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cursor.execute(
                "INSERT INTO motorcycles (year, make, model, package, category, engine) VALUES (?, ?, ?, ?, ?, ?)",
                (row['Year'], row['Make'], row['Model'], row['Package'], row['Category'], row['Engine'])
            )
    
    # Commit changes and close connection
    conn.commit()
    conn.close()
    
    logger.info(f"Conversion complete. Database created at {db_path}")

if __name__ == "__main__":
    convert_csv_to_sqlite()
