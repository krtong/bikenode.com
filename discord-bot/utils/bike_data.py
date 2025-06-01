import pandas as pd
import os
from pathlib import Path
import re

# Constants
DATA_DIR = Path(os.path.dirname(os.path.abspath(__file__))) / '../data/bikedata'
MOTORCYCLES_CSV = DATA_DIR / 'motorcycles.csv'

class BikeDataManager:
    """Class for managing motorcycle data operations"""
    
    def __init__(self):
        self.data = None
        self.load_data()
        
    def load_data(self):
        """Load motorcycle data from CSV file"""
        try:
            self.data = pd.read_csv(MOTORCYCLES_CSV)
            # Clean up data
            self.data.fillna('', inplace=True)
            return True
        except Exception as e:
            print(f"Error loading motorcycle data: {e}")
            self.data = pd.DataFrame()
            return False
            
    def search_bikes(self, query=None, year=None, make=None, model=None, category=None, limit=50):
        """Search for motorcycles matching the given criteria"""
        if self.data is None or self.data.empty:
            return pd.DataFrame()
            
        filtered_df = self.data.copy()
        
        if year is not None:
            filtered_df = filtered_df[filtered_df['Year'] == year]
            
        if make is not None:
            filtered_df = filtered_df[filtered_df['Make'].str.lower().str.contains(make.lower())]
            
        if model is not None:
            filtered_df = filtered_df[filtered_df['Model'].str.lower().str.contains(model.lower())]
            
        if category is not None:
            filtered_df = filtered_df[filtered_df['Category'].str.lower().str.contains(category.lower())]
            
        # If general query is provided, search across all text fields
        if query is not None:
            query = query.lower()
            mask = (filtered_df['Make'].str.lower().str.contains(query)) | \
                   (filtered_df['Model'].str.lower().str.contains(query)) | \
                   (filtered_df['Category'].str.lower().str.contains(query)) | \
                   (filtered_df['Package'].str.lower().str.contains(query))
            filtered_df = filtered_df[mask]
        
        # Apply limit
        if len(filtered_df) > limit:
            return filtered_df.head(limit), True
        
        return filtered_df, False
        
    def get_available_years(self):
        """Get a sorted list of all available years"""
        if self.data is None or self.data.empty:
            return []
        return sorted(self.data['Year'].unique().tolist())
        
    def get_available_makes(self, year=None):
        """Get a sorted list of all available manufacturers, optionally filtered by year"""
        if self.data is None or self.data.empty:
            return []
            
        if year is not None:
            filtered = self.data[self.data['Year'] == year]
            return sorted(filtered['Make'].unique().tolist())
        
        return sorted(self.data['Make'].unique().tolist())
        
    def get_available_categories(self):
        """Get a sorted list of all motorcycle categories"""
        if self.data is None or self.data.empty:
            return []
        return sorted(self.data['Category'].unique().tolist())
        
    def get_stats(self):
        """Get basic stats about the motorcycle data"""
        if self.data is None or self.data.empty:
            return {
                'total': 0,
                'years': 0,
                'makes': 0,
                'categories': 0
            }
            
        return {
            'total': len(self.data),
            'years': len(self.data['Year'].unique()),
            'makes': len(self.data['Make'].unique()),
            'categories': len(self.data['Category'].unique()),
            'year_range': f"{min(self.data['Year'])} - {max(self.data['Year'])}"
        }
