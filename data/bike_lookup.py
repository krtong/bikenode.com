import os
import csv
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Union

class BikeDatabase:
    def __init__(self, data_dir: str = None):
        """Initialize the bike database."""
        if data_dir is None:
            # Use the directory where this script is located
            data_dir = os.path.dirname(os.path.abspath(__file__))
        
        self.data_dir = data_dir
        self.bikes_by_make = defaultdict(list)  # Make -> List of bike records
        self.bikes_by_model = defaultdict(list)  # Model -> List of bike records
        self.bikes_by_year = defaultdict(list)   # Year -> List of bike records
        self.makes = set()  # Set of all makes
        self.models = set()  # Set of all models
        self.years = set()   # Set of all years
        self.categories = set()  # Set of all categories
        
        # Used for fuzzy search
        self.normalized_makes = {}  # Normalized name -> actual name
        self.normalized_models = {}  # Normalized name -> actual name
        
        # Load data from CSV files
        self.load_data()
        
    def normalize_text(self, text: str) -> str:
        """Normalize text for fuzzy matching by removing special characters and lowercasing."""
        if not text:
            return ""
        # Replace special characters with spaces and lowercase
        normalized = re.sub(r'[^\w\s]', ' ', text.lower())
        # Replace multiple spaces with a single space
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized
        
    def load_data(self):
        """Load motorcycle data from CSV files."""
        # Path to the CSV files
        old_bikes_csv = os.path.join(self.data_dir, "motorcycles/Motorcycle_Makes_models_1894-1949.csv")
        new_bikes_csv = os.path.join(self.data_dir, "motorcycles/Motorcycle_Makes_models_1950-2025.csv")
        
        files_to_process = [old_bikes_csv, new_bikes_csv]
        
        for file_path in files_to_process:
            if not os.path.exists(file_path):
                print(f"Warning: {file_path} not found.")
                continue
                
            with open(file_path, 'r', encoding='utf-8') as file:
                csv_reader = csv.DictReader(file)
                
                # Process each row in the CSV
                for row in csv_reader:
                    year = row.get('Year', '')
                    make = row.get('Make', '')
                    model = row.get('Model', '')
                    category = row.get('Category', '')
                    engine = row.get('Engine', '')
                    
                    # Skip rows with missing essential data
                    if not (year and make and model):
                        continue
                    
                    # Create a bike record
                    bike_record = {
                        'year': year,
                        'make': make,
                        'model': model,
                        'category': category,
                        'engine': engine
                    }
                    
                    # Add to our lookup collections
                    self.bikes_by_make[make].append(bike_record)
                    self.bikes_by_model[model].append(bike_record)
                    self.bikes_by_year[year].append(bike_record)
                    
                    # Update our sets of unique values
                    self.makes.add(make)
                    self.models.add(model)
                    self.years.add(year)
                    if category:
                        self.categories.add(category)
                    
                    # Update normalized maps for fuzzy search
                    normalized_make = self.normalize_text(make)
                    if normalized_make:
                        self.normalized_makes[normalized_make] = make
                        
                    normalized_model = self.normalize_text(model)
                    if normalized_model:
                        self.normalized_models[normalized_model] = model
        
        # Save processed data to JSON for faster loading in the future
        self.save_processed_data()
        
    def save_processed_data(self):
        """Save processed data to JSON files for faster loading."""
        processed_data_dir = os.path.join(self.data_dir, "processed")
        os.makedirs(processed_data_dir, exist_ok=True)
        
        # Save bikes by make
        with open(os.path.join(processed_data_dir, "bikes_by_make.json"), 'w', encoding='utf-8') as f:
            json.dump(self.bikes_by_make, f)
            
        # Save bikes by model
        with open(os.path.join(processed_data_dir, "bikes_by_model.json"), 'w', encoding='utf-8') as f:
            json.dump(self.bikes_by_model, f)
            
        # Save bikes by year
        with open(os.path.join(processed_data_dir, "bikes_by_year.json"), 'w', encoding='utf-8') as f:
            json.dump(self.bikes_by_year, f)
            
        # Save sets as lists
        with open(os.path.join(processed_data_dir, "metadata.json"), 'w', encoding='utf-8') as f:
            json.dump({
                'makes': list(self.makes),
                'models': list(self.models),
                'years': list(self.years),
                'categories': list(self.categories)
            }, f)
            
        # Save normalized mappings
        with open(os.path.join(processed_data_dir, "normalized_mappings.json"), 'w', encoding='utf-8') as f:
            json.dump({
                'makes': self.normalized_makes,
                'models': self.normalized_models
            }, f)
    
    def find_by_make(self, make: str) -> List[Dict]:
        """Find bikes by exact make."""
        return self.bikes_by_make.get(make, [])
    
    def find_by_model(self, model: str) -> List[Dict]:
        """Find bikes by exact model."""
        return self.bikes_by_model.get(model, [])
    
    def find_by_year(self, year: str) -> List[Dict]:
        """Find bikes by year."""
        return self.bikes_by_year.get(year, [])
    
    def find_by_make_and_model(self, make: str, model: str) -> List[Dict]:
        """Find bikes by exact make and model."""
        make_results = self.find_by_make(make)
        return [bike for bike in make_results if bike['model'] == model]
    
    def find_by_make_model_year(self, make: str, model: str, year: str) -> List[Dict]:
        """Find bikes by exact make, model, and year."""
        make_model_results = self.find_by_make_and_model(make, model)
        return [bike for bike in make_model_results if bike['year'] == year]
    
    def fuzzy_search_make(self, search_term: str) -> List[str]:
        """Search for a make using fuzzy matching."""
        search_term = self.normalize_text(search_term)
        if not search_term:
            return []
        
        # Look for direct match first
        if search_term in self.normalized_makes:
            return [self.normalized_makes[search_term]]
        
        # Look for partial matches
        matches = []
        for norm_make, actual_make in self.normalized_makes.items():
            if search_term in norm_make or norm_make in search_term:
                matches.append(actual_make)
        
        return matches
    
    def fuzzy_search_model(self, search_term: str) -> List[str]:
        """Search for a model using fuzzy matching."""
        search_term = self.normalize_text(search_term)
        if not search_term:
            return []
        
        # Look for direct match first
        if search_term in self.normalized_models:
            return [self.normalized_models[search_term]]
        
        # Look for partial matches
        matches = []
        for norm_model, actual_model in self.normalized_models.items():
            if search_term in norm_model or norm_model in search_term:
                matches.append(actual_model)
        
        return matches
    
    def search(self, query: str) -> List[Dict]:
        """General search function for bikes."""
        query = self.normalize_text(query)
        if not query:
            return []
            
        # Try to parse the query to extract potential year, make, model
        query_parts = query.split()
        results = []
        
        # Check if any part looks like a year (4 digits)
        year_candidates = [part for part in query_parts if part.isdigit() and len(part) == 4]
        
        if year_candidates:
            for year in year_candidates:
                # Search for bikes from this year
                for bike in self.bikes_by_year.get(year, []):
                    if bike not in results:  # Avoid duplicates
                        results.append(bike)
        
        # Search by make
        make_matches = self.fuzzy_search_make(query)
        for make in make_matches:
            for bike in self.bikes_by_make.get(make, []):
                if bike not in results:  # Avoid duplicates
                    results.append(bike)
        
        # Search by model
        model_matches = self.fuzzy_search_model(query)
        for model in model_matches:
            for bike in self.bikes_by_model.get(model, []):
                if bike not in results:  # Avoid duplicates
                    results.append(bike)
        
        return results[:25]  # Limit results to avoid overwhelming response
    
    def get_role_name(self, bike: Dict) -> str:
        """Generate a Discord role name for a bike."""
        return f"{bike['year']} {bike['make']} {bike['model']}"
    
    def get_all_makes(self) -> List[str]:
        """Get a list of all motorcycle makes."""
        return sorted(list(self.makes))
    
    def get_models_for_make(self, make: str) -> List[str]:
        """Get all models for a given make."""
        bikes = self.find_by_make(make)
        return sorted(list(set(bike['model'] for bike in bikes)))
    
    def get_years_for_make_model(self, make: str, model: str) -> List[str]:
        """Get all years for a given make and model."""
        bikes = self.find_by_make_and_model(make, model)
        return sorted(list(set(bike['year'] for bike in bikes)))
    
    def get_categories(self) -> List[str]:
        """Get a list of all categories."""
        return sorted(list(self.categories))
    
    def get_bikes_by_category(self, category: str) -> List[Dict]:
        """Get all bikes in a given category."""
        results = []
        for make in self.makes:
            for bike in self.bikes_by_make[make]:
                if bike['category'] == category and bike not in results:
                    results.append(bike)
        return results


def create_discord_bot_role_helper():
    """Create a helper function for the Discord bot."""
    db = BikeDatabase()
    
    async def fetch_bike_role(ctx, make, model, year=None):
        """Fetch the role for a specific bike."""
        if year:
            bikes = db.find_by_make_model_year(make, model, year)
        else:
            bikes = db.find_by_make_and_model(make, model)
        
        if not bikes:
            return None
        
        # If no year specified, get the most recent one
        if not year and bikes:
            bikes = sorted(bikes, key=lambda x: x['year'], reverse=True)
            
        return db.get_role_name(bikes[0])
    
    async def search_bikes(ctx, query):
        """Search for bikes with the given query."""
        results = db.search(query)
        return results
    
    async def get_bike_makes(ctx):
        """Get a list of all bike makes."""
        return db.get_all_makes()
    
    async def get_bike_models(ctx, make):
        """Get all models for a given make."""
        return db.get_models_for_make(make)
    
    async def get_bike_years(ctx, make, model):
        """Get all years for a given make and model."""
        return db.get_years_for_make_model(make, model)
    
    return {
        'fetch_bike_role': fetch_bike_role,
        'search_bikes': search_bikes,
        'get_bike_makes': get_bike_makes,
        'get_bike_models': get_bike_models,
        'get_bike_years': get_bike_years,
    }


if __name__ == "__main__":
    # Example usage
    db = BikeDatabase()
    
    # Print some statistics
    print(f"Loaded {len(db.makes)} makes, {len(db.models)} models across {len(db.years)} years")
    
    # Example search
    harley_bikes = db.find_by_make("Harley-Davidson")
    print(f"Found {len(harley_bikes)} Harley-Davidson motorcycles")
    
    # Example fuzzy search
    honda_results = db.fuzzy_search_make("hond")
    print(f"Fuzzy search for 'hond' returned: {honda_results}")
    
    # Test get_role_name
    if harley_bikes:
        role_name = db.get_role_name(harley_bikes[0])
        print(f"Example role name: {role_name}")
