import os
import csv
import sqlite3
from pathlib import Path

# Define base directories
BASE_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = BASE_DIR / 'data' / 'bikedata'
DB_DIR = BASE_DIR / 'data' / 'db'

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_DIR.mkdir(parents=True, exist_ok=True)

# Define file paths
CSV_PATH = DATA_DIR / 'motorcycles.csv'
DB_PATH = DB_DIR / 'motorcycles.db'

class BikeDataManager:
    """Centralized manager for motorcycle data access"""
    
    @staticmethod
    def get_csv_path():
        """Return the path to the CSV file"""
        return CSV_PATH
        
    @staticmethod
    def get_db_path():
        """Return the path to the SQLite database"""
        return DB_PATH
    
    @staticmethod
    def load_csv_data():
        """Load motorcycle data from CSV file"""
        bikes = []
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                bikes.append(row)
        return bikes
    
    @staticmethod
    def search_bikes(query, limit=5):
        """
        Search for bikes matching the query in make, model or year
        Returns list of matching bikes limited to specified number
        """
        matches = []
        query = query.lower()
        
        try:
            with open(CSV_PATH, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if (query in row['Make'].lower() or 
                        query in row['Model'].lower() or
                        query in str(row['Year']).lower()):
                        matches.append(row)
                        if len(matches) >= limit:
                            break
        except Exception as e:
            print(f"Error searching bikes: {e}")
            
        return matches
    
    @staticmethod
    def get_bike_by_id(bike_id):
        """Get a bike by its ID (not implemented yet)"""
        # This would use SQLite for more efficient lookups
        # For now, just return None
        return None
