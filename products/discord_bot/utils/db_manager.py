import sqlite3
import os
import logging
from pathlib import Path
import json

logger = logging.getLogger('BikeRoleBot')

class BikeDatabase:
    """Database manager for motorcycle data"""
    
    def __init__(self, db_path=None):
        """Initialize database connection
        
        Args:
            db_path: Path to SQLite database file (optional)
        """
        if db_path is None:
            self.db_path = Path(__file__).parent.parent / 'data' / 'bikes.db'
        else:
            self.db_path = Path(db_path)
        
        self.connection = None
    
    def connect(self):
        """Connect to the database
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.row_factory = sqlite3.Row
            
            # Check if tables exist, create if not
            self._ensure_tables_exist()
            
            return True
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False
    
    def close(self):
        """Close the database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def _ensure_tables_exist(self):
        """Create database tables if they don't exist"""
        cursor = self.connection.cursor()
        
        # Create motorcycles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS motorcycles (
                id INTEGER PRIMARY KEY,
                year INTEGER,
                make TEXT,
                model TEXT,
                package TEXT,
                category TEXT,
                engine TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indices for faster lookups
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_year_make_model ON motorcycles(year, make, model)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_category ON motorcycles(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_make ON motorcycles(make)')
        
        self.connection.commit()
    
    def get_makes_by_year(self, year):
        """Get all makes for a specific year
        
        Args:
            year: The motorcycle model year
            
        Returns:
            list: Sorted list of motorcycle makes
        """
        try:
            if not self.connection:
                self.connect()
                
            cursor = self.connection.cursor()
            cursor.execute(
                "SELECT DISTINCT make FROM motorcycles WHERE year = ? ORDER BY make",
                (year,)
            )
            results = cursor.fetchall()
            return [row['make'] for row in results]
        except Exception as e:
            logger.error(f"Database error in get_makes_by_year: {e}")
            return []
    
    def insert_motorcycle(self, year, make, model, package=None, category=None, engine=None):
        """Insert a new motorcycle into the database
        
        Args:
            year: Model year
            make: Manufacturer name
            model: Model name
            package: Package or trim level (optional)
            category: Motorcycle category (optional)
            engine: Engine details (optional)
            
        Returns:
            int: ID of the inserted motorcycle, or None on failure
        """
        try:
            if not self.connection:
                self.connect()
                
            cursor = self.connection.cursor()
            cursor.execute(
                """
                INSERT INTO motorcycles (year, make, model, package, category, engine)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (year, make, model, package, category, engine)
            )
            self.connection.commit()
            return cursor.lastrowid
        except Exception as e:
            logger.error(f"Database error inserting motorcycle: {e}")
            return None
    
    def import_from_json(self, json_path):
        """Import motorcycle data from JSON file
        
        Args:
            json_path: Path to JSON file with motorcycle data
            
        Returns:
            tuple: (success_count, error_count)
        """
        try:
            if not self.connection:
                self.connect()
                
            with open(json_path, 'r') as f:
                motorcycles = json.load(f)
                
            success = 0
            errors = 0
            
            for bike in motorcycles:
                try:
                    self.insert_motorcycle(
                        bike.get('year'),
                        bike.get('make'),
                        bike.get('model'),
                        bike.get('package'),
                        bike.get('category'),
                        bike.get('engine')
                    )
                    success += 1
                except Exception:
                    errors += 1
            
            return (success, errors)
        except Exception as e:
            logger.error(f"Error importing JSON data: {e}")
            return (0, 0)
