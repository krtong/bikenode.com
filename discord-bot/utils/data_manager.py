import os
import csv
import sqlite3
from pathlib import Path
import pandas as pd
import logging
import re
from typing import List, Dict, Any, Optional

logger = logging.getLogger('BikeRoleBot')

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
    """Manages motorcycle data loading and searching with error handling"""
    
    @staticmethod
    def get_csv_path():
        """Return the path to the CSV file"""
        return CSV_PATH
        
    @staticmethod
    def get_db_path():
        """Return the path to the SQLite database"""
        return DB_PATH
    
    @staticmethod
    def get_data_path() -> Path:
        """Get the path to the motorcycle data CSV file"""
        return Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / 'data/bikedata/motorcycles.csv'
    
    @classmethod
    def load_csv_data(cls) -> List[Dict[str, Any]]:
        """Load motorcycle data from CSV file, handling parsing errors"""
        data_path = cls.get_data_path()
        logger.info(f"Loading motorcycle data from {data_path}")
        
        try:
            # Try first with the standard pandas reader
            df = pd.read_csv(data_path)
            logger.info(f"Successfully loaded {len(df)} motorcycle records")
            return df.to_dict('records')
        except pd.errors.ParserError as e:
            logger.warning(f"Error parsing CSV: {e}. Trying with error handling...")
            
            # If there's a parsing error, try with error_bad_lines=False (pandas <1.3) or on_bad_lines='skip' (pandas >=1.3)
            try:
                # For newer pandas versions
                df = pd.read_csv(data_path, on_bad_lines='skip')
                logger.info(f"Loaded {len(df)} motorcycle records (skipped bad lines)")
                return df.to_dict('records')
            except TypeError:
                # For older pandas versions
                df = pd.read_csv(data_path, error_bad_lines=False, warn_bad_lines=True)
                logger.info(f"Loaded {len(df)} motorcycle records (skipped bad lines)")
                return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to load motorcycle data: {e}")
            return []
    
    @classmethod
    def search_bikes(cls, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search for motorcycles matching the query"""
        bikes = cls.load_csv_data()
        if not bikes:
            return []
        
        query = query.lower()
        results = []
        
        # Try to parse year from query
        year_match = re.search(r'\b(1[8-9]\d{2}|20\d{2})\b', query)
        year = int(year_match.group(0)) if year_match else None
        
        # Remove year from query if found
        if year:
            query = query.replace(year_match.group(0), '').strip()
        
        for bike in bikes:
            # If year specified, filter by it
            if year and bike['Year'] != year:
                continue
                
            make = str(bike['Make']).lower()
            model = str(bike['Model']).lower()
            
            if not query or query in make or query in model:
                results.append(bike)
        
        # Sort by Year (newest first), then Make, then Model
        results.sort(key=lambda x: (-x['Year'], x['Make'], x['Model']))
        
        return results[:max_results]
    
    @staticmethod
    def get_bike_by_id(bike_id):
        """Get a bike by its ID (not implemented yet)"""
        # This would use SQLite for more efficient lookups
        # For now, just return None
        return None
