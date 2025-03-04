import sqlite3
import logging
from pathlib import Path

logger = logging.getLogger('BikeRoleBot')

class BikeDatabase:
    """Class to interact with the motorcycle database"""
    
    def __init__(self):
        self.db_path = Path(__file__).parent.parent / 'data' / 'bikes.db'
        self.connection = None
        
    def connect(self):
        """Connect to the SQLite database"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            # Enable dictionary access to rows
            self.connection.row_factory = sqlite3.Row
            return True
        except sqlite3.Error as e:
            logger.error(f"Database connection error: {e}")
            return False
            
    def close(self):
        """Close the database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def lookup_bike(self, year, make, model=None, package=None):
        """Look up a motorcycle in the database"""
        if not self.connection and not self.connect():
            return None
            
        try:
            cursor = self.connection.cursor()
            
            # Build the query based on provided parameters
            query = "SELECT * FROM motorcycles WHERE year = ? AND make = ?"
            params = [year, make]
            
            if model:
                query += " AND model = ?"
                params.append(model)
                
            if package:
                query += " AND package = ?"
                params.append(package)
                
            cursor.execute(query, params)
            result = cursor.fetchone()
            
            if result:
                # Convert SQLite Row to dictionary
                return dict(result)
            return None
            
        except sqlite3.Error as e:
            logger.error(f"Database lookup error: {e}")
            return None
    
    def search_bikes(self, **kwargs):
        """Search for motorcycles with filters"""
        if not self.connection and not self.connect():
            return []
            
        try:
            cursor = self.connection.cursor()
            
            # Build the query based on provided filters
            query = "SELECT * FROM motorcycles WHERE 1=1"
            params = []
            
            if 'year' in kwargs:
                query += " AND year = ?"
                params.append(kwargs['year'])
                
            if 'make' in kwargs:
                query += " AND make = ?"
                params.append(kwargs['make'])
                
            if 'model' in kwargs:
                query += " AND model LIKE ?"
                params.append(f"%{kwargs['model']}%")
                
            if 'category' in kwargs:
                query += " AND category = ?"
                params.append(kwargs['category'])
                
            if 'engine' in kwargs:
                query += " AND engine LIKE ?"
                params.append(f"%{kwargs['engine']}%")
                
            # Add limit
            limit = kwargs.get('limit', 10)
            query += " LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            # Convert SQLite Rows to dictionaries
            return [dict(row) for row in results]
            
        except sqlite3.Error as e:
            logger.error(f"Database search error: {e}")
            return []
    
    def get_categories(self):
        """Get all distinct motorcycle categories"""
        if not self.connection and not self.connect():
            return []
            
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT DISTINCT category FROM motorcycles WHERE category IS NOT NULL ORDER BY category")
            results = cursor.fetchall()
            return [row['category'] for row in results]
        except sqlite3.Error as e:
            logger.error(f"Database error getting categories: {e}")
            return []
    
    def get_makes_by_year(self, year):
        """Get all makes available for a specific year"""
        if not self.connection and not self.connect():
            return []
            
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT DISTINCT make FROM motorcycles WHERE year = ? ORDER BY make", (year,))
            results = cursor.fetchall()
            return [row['make'] for row in results]
        except sqlite3.Error as e:
            logger.error(f"Database error getting makes: {e}")
            return []
