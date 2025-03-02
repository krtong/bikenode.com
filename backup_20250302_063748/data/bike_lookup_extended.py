import os
import csv
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Union

class ExtendedBikeDatabase:
    def __init__(self, data_dir: str = None):
        """Initialize the extended bike database that handles both motorcycles and bicycles."""
        if data_dir is None:
            # Use the directory where this script is located
            data_dir = os.path.dirname(os.path.abspath(__file__))
        
        self.data_dir = data_dir
        self.vehicles = {
            'motorcycle': {},
            'bicycle': {}
        }
        
        # Initialize vehicle-specific lookups
        for vehicle_type in self.vehicles:
            self.vehicles[vehicle_type] = {
                'by_make': defaultdict(list),
                'by_model': defaultdict(list),
                'by_package': defaultdict(list),
                'by_year': defaultdict(list),
                'makes': set(),
                'models': set(),
                'packages': set(),
                'years': set(),
                'categories': set(),
                'normalized_makes': {},
                'normalized_models': {},
                'normalized_packages': {}
            }
        
        # Load data from CSV files
        self.load_motorcycles()
        self.load_bicycles()
    
    def normalize_text(self, text: str) -> str:
        """Normalize text for fuzzy matching by removing special characters and lowercasing."""
        if not text:
            return ""
        # Replace special characters with spaces and lowercase
        normalized = re.sub(r'[^\w\s]', ' ', text.lower())
        # Replace multiple spaces with a single space
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized
    
    def load_motorcycles(self):
        """Load motorcycle data from CSV files."""
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
                    # Try to extract package information if available, otherwise empty
                    package = row.get('Package', '')
                    
                    # Skip rows with missing essential data
                    if not (year and make and model):
                        continue
                    
                    # Create a bike record
                    bike_record = {
                        'year': year,
                        'make': make,
                        'model': model,
                        'category': category,
                        'engine': engine,
                        'package': package,
                        'type': 'motorcycle'
                    }
                    
                    # Add to our lookup collections
                    m_data = self.vehicles['motorcycle']
                    m_data['by_make'][make].append(bike_record)
                    m_data['by_model'][model].append(bike_record)
                    m_data['by_year'][year].append(bike_record)
                    if package:
                        m_data['by_package'][package].append(bike_record)
                    
                    # Update our sets of unique values
                    m_data['makes'].add(make)
                    m_data['models'].add(model)
                    m_data['years'].add(year)
                    if package:
                        m_data['packages'].add(package)
                    if category:
                        m_data['categories'].add(category)
                    
                    # Update normalized maps for fuzzy search
                    normalized_make = self.normalize_text(make)
                    if normalized_make:
                        m_data['normalized_makes'][normalized_make] = make
                        
                    normalized_model = self.normalize_text(model)
                    if normalized_model:
                        m_data['normalized_models'][normalized_model] = model
                        
                    normalized_package = self.normalize_text(package)
                    if normalized_package:
                        m_data['normalized_packages'][normalized_package] = package
    
    def load_bicycles(self):
        """Load bicycle data from CSV files."""
        bicycles_csv = os.path.join(self.data_dir, "bicycles/Bicycle_Makes_models.csv")
        
        # Check if file exists before attempting to load
        if not os.path.exists(bicycles_csv):
            print(f"Warning: {bicycles_csv} not found. Bicycle data not loaded.")
            return
            
        with open(bicycles_csv, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            # Process each row in the CSV
            for row in csv_reader:
                year = row.get('Year', '')
                make = row.get('Make', '')
                model = row.get('Model', '')
                category = row.get('Category', '')  # MTB, Road, Gravel, etc.
                package = row.get('Package', '')    # Base, Pro, Elite, etc.
                frame = row.get('Frame', '')        # Carbon, Aluminum, etc.
                
                # Skip rows with missing essential data
                if not (year and make and model):
                    continue
                
                # Create a bicycle record
                bike_record = {
                    'year': year,
                    'make': make,
                    'model': model,
                    'category': category,
                    'package': package,
                    'frame': frame,
                    'type': 'bicycle'
                }
                
                # Add to our lookup collections
                b_data = self.vehicles['bicycle']
                b_data['by_make'][make].append(bike_record)
                b_data['by_model'][model].append(bike_record)
                b_data['by_year'][year].append(bike_record)
                if package:
                    b_data['by_package'][package].append(bike_record)
                
                # Update our sets of unique values
                b_data['makes'].add(make)
                b_data['models'].add(model)
                b_data['years'].add(year)
                if package:
                    b_data['packages'].add(package)
                if category:
                    b_data['categories'].add(category)
                
                # Update normalized maps for fuzzy search
                normalized_make = self.normalize_text(make)
                if normalized_make:
                    b_data['normalized_makes'][normalized_make] = make
                    
                normalized_model = self.normalize_text(model)
                if normalized_model:
                    b_data['normalized_models'][normalized_model] = model
                    
                normalized_package = self.normalize_text(package)
                if normalized_package:
                    b_data['normalized_packages'][normalized_package] = package

    def find_by_make(self, make: str, vehicle_type: str = 'motorcycle') -> List[Dict]:
        """Find vehicles by exact make."""
        return self.vehicles[vehicle_type]['by_make'].get(make, [])
    
    def find_by_model(self, model: str, vehicle_type: str = 'motorcycle') -> List[Dict]:
        """Find vehicles by exact model."""
        return self.vehicles[vehicle_type]['by_model'].get(model, [])
    
    def find_by_package(self, package: str, vehicle_type: str = 'motorcycle') -> List[Dict]:
        """Find vehicles by exact package."""
        return self.vehicles[vehicle_type]['by_package'].get(package, [])
    
    def find_by_year(self, year: str, vehicle_type: str = 'motorcycle') -> List[Dict]:
        """Find vehicles by year."""
        return self.vehicles[vehicle_type]['by_year'].get(year, [])
    
    def find_by_make_and_model(self, make: str, model: str, vehicle_type: str = 'motorcycle') -> List[Dict]:
        """Find vehicles by exact make and model."""
        make_results = self.find_by_make(make, vehicle_type)
        return [vehicle for vehicle in make_results if vehicle['model'] == model]
    
    def find_by_make_model_package(self, make: str, model: str, package: str, vehicle_type: str = 'motorcycle') -> List[Dict]:
        """Find vehicles by exact make, model, and package."""
        make_model_results = self.find_by_make_and_model(make, model, vehicle_type)
        return [vehicle for vehicle in make_model_results if vehicle['package'] == package]
    
    def find_by_make_model_year_package(self, make: str, model: str, year: str, package: str = None, 
                                         vehicle_type: str = 'motorcycle') -> List[Dict]:
        """Find vehicles by exact make, model, year and optionally package."""
        make_model_results = self.find_by_make_and_model(make, model, vehicle_type)
        year_filtered = [vehicle for vehicle in make_model_results if vehicle['year'] == year]
        
        if package:
            return [vehicle for vehicle in year_filtered if vehicle['package'] == package]
        return year_filtered
    
    def fuzzy_search_make(self, search_term: str, vehicle_type: str = 'motorcycle') -> List[str]:
        """Search for a make using fuzzy matching."""
        search_term = self.normalize_text(search_term)
        if not search_term:
            return []
        
        normalized_makes = self.vehicles[vehicle_type]['normalized_makes']
        
        # Look for direct match first
        if search_term in normalized_makes:
            return [normalized_makes[search_term]]
        
        # Look for partial matches
        matches = []
        for norm_make, actual_make in normalized_makes.items():
            if search_term in norm_make or norm_make in search_term:
                matches.append(actual_make)
        
        return matches
    
    def fuzzy_search_model(self, search_term: str, vehicle_type: str = 'motorcycle') -> List[str]:
        """Search for a model using fuzzy matching."""
        search_term = self.normalize_text(search_term)
        if not search_term:
            return []
        
        normalized_models = self.vehicles[vehicle_type]['normalized_models']
        
        # Look for direct match first
        if search_term in normalized_models:
            return [normalized_models[search_term]]
        
        # Look for partial matches
        matches = []
        for norm_model, actual_model in normalized_models.items():
            if search_term in norm_model or norm_model in search_term:
                matches.append(actual_model)
        
        return matches
    
    def fuzzy_search_package(self, search_term: str, vehicle_type: str = 'motorcycle') -> List[str]:
        """Search for a package using fuzzy matching."""
        search_term = self.normalize_text(search_term)
        if not search_term:
            return []
        
        normalized_packages = self.vehicles[vehicle_type]['normalized_packages']
        
        # Look for direct match first
        if search_term in normalized_packages:
            return [normalized_packages[search_term]]
        
        # Look for partial matches
        matches = []
        for norm_package, actual_package in normalized_packages.items():
            if search_term in norm_package or norm_package in search_term:
                matches.append(actual_package)
        
        return matches
    
    def search(self, query: str, vehicle_type: str = 'motorcycle') -> List[Dict]:
        """General search function for bikes."""
        query = self.normalize_text(query)
        if not query:
            return []
            
        # Try to parse the query to extract potential year, make, model, package
        query_parts = query.split()
        results = []
        
        # Check if any part looks like a year (4 digits)
        year_candidates = [part for part in query_parts if part.isdigit() and len(part) == 4]
        
        vehicle_data = self.vehicles[vehicle_type]
        
        if year_candidates:
            for year in year_candidates:
                # Search for vehicles from this year
                for vehicle in vehicle_data['by_year'].get(year, []):
                    if vehicle not in results:  # Avoid duplicates
                        results.append(vehicle)
        
        # Search by make
        make_matches = self.fuzzy_search_make(query, vehicle_type)
        for make in make_matches:
            for vehicle in vehicle_data['by_make'].get(make, []):
                if vehicle not in results:  # Avoid duplicates
                    results.append(vehicle)
        
        # Search by model
        model_matches = self.fuzzy_search_model(query, vehicle_type)
        for model in model_matches:
            for vehicle in vehicle_data['by_model'].get(model, []):
                if vehicle not in results:  # Avoid duplicates
                    results.append(vehicle)
        
        # Search by package
        package_matches = self.fuzzy_search_package(query, vehicle_type)
        for package in package_matches:
            for vehicle in vehicle_data['by_package'].get(package, []):
                if vehicle not in results:  # Avoid duplicates
                    results.append(vehicle)
        
        return results[:25]  # Limit results to avoid overwhelming response
    
    def get_role_name(self, vehicle: Dict) -> str:
        """Generate a Discord role name for a vehicle."""
        if vehicle['package']:
            return f"{vehicle['year']} {vehicle['make']} {vehicle['model']} {vehicle['package']}"
        return f"{vehicle['year']} {vehicle['make']} {vehicle['model']}"
    
    def get_all_makes(self, vehicle_type: str = 'motorcycle') -> List[str]:
        """Get a list of all vehicle makes."""
        return sorted(list(self.vehicles[vehicle_type]['makes']))
    
    def get_models_for_make(self, make: str, vehicle_type: str = 'motorcycle') -> List[str]:
        """Get all models for a given make."""
        vehicles = self.find_by_make(make, vehicle_type)
        return sorted(list(set(vehicle['model'] for vehicle in vehicles)))
    
    def get_packages_for_model(self, make: str, model: str, vehicle_type: str = 'motorcycle') -> List[str]:
        """Get all packages for a given make and model."""
        vehicles = self.find_by_make_and_model(make, model, vehicle_type)
        packages = [vehicle['package'] for vehicle in vehicles if vehicle['package']]
        return sorted(list(set(packages)))
    
    def get_years_for_model(self, make: str, model: str, vehicle_type: str = 'motorcycle') -> List[str]:
        """Get all years for a given make and model."""
        vehicles = self.find_by_make_and_model(make, model, vehicle_type)
        return sorted(list(set(vehicle['year'] for vehicle in vehicles)))
    
    def get_categories(self, vehicle_type: str = 'motorcycle') -> List[str]:
        """Get a list of all categories."""
        return sorted(list(self.vehicles[vehicle_type]['categories']))


def create_discord_bot_role_helper():
    """Create a helper function for the Discord bot using the extended database."""
    db = ExtendedBikeDatabase()
    
    async def fetch_vehicle_role(ctx, make, model, year=None, package=None, vehicle_type='motorcycle'):
        """Fetch the role for a specific vehicle."""
        if year and package:
            vehicles = db.find_by_make_model_year_package(make, model, year, package, vehicle_type)
        elif year:
            vehicles = db.find_by_make_model_year_package(make, model, year, None, vehicle_type)
        else:
            vehicles = db.find_by_make_and_model(make, model, vehicle_type)
        
        if not vehicles:
            return None
        
        # If no year specified, get the most recent one
        if not year and vehicles:
            vehicles = sorted(vehicles, key=lambda x: x['year'], reverse=True)
            
        return db.get_role_name(vehicles[0])
    
    async def search_vehicles(ctx, query, vehicle_type='motorcycle'):
        """Search for vehicles with the given query."""
        results = db.search(query, vehicle_type)
        return results
    
    async def get_vehicle_makes(ctx, vehicle_type='motorcycle'):
        """Get a list of all vehicle makes."""
        return db.get_all_makes(vehicle_type)
    
    async def get_vehicle_models(ctx, make, vehicle_type='motorcycle'):
        """Get all models for a given make."""
        return db.get_models_for_make(make, vehicle_type)
    
    async def get_vehicle_packages(ctx, make, model, vehicle_type='motorcycle'):
        """Get all packages for a given make and model."""
        return db.get_packages_for_model(make, model, vehicle_type)
    
    async def get_vehicle_years(ctx, make, model, vehicle_type='motorcycle'):
        """Get all years for a given make and model."""
        return db.get_years_for_model(make, model, vehicle_type)
    
    return {
        'fetch_vehicle_role': fetch_vehicle_role,
        'search_vehicles': search_vehicles,
        'get_vehicle_makes': get_vehicle_makes,
        'get_vehicle_models': get_vehicle_models,
        'get_vehicle_packages': get_vehicle_packages,
        'get_vehicle_years': get_vehicle_years,
    }


if __name__ == "__main__":
    # Example usage
    db = ExtendedBikeDatabase()
    
    # Print some statistics for motorcycles
    print(f"Loaded {len(db.vehicles['motorcycle']['makes'])} motorcycle makes, " 
          f"{len(db.vehicles['motorcycle']['models'])} models across "
          f"{len(db.vehicles['motorcycle']['years'])} years")
    
    # If bicycle data is loaded, print stats
    if db.vehicles['bicycle']['makes']:
        print(f"Loaded {len(db.vehicles['bicycle']['makes'])} bicycle makes, "
              f"{len(db.vehicles['bicycle']['models'])} models")
    
    # Example search for a motorcycle with package
    harley_bikes = db.find_by_make("Harley-Davidson")
    print(f"Found {len(harley_bikes)} Harley-Davidson motorcycles")
    
    # Example fuzzy search
    honda_results = db.fuzzy_search_make("hond")
    print(f"Fuzzy search for 'hond' returned: {honda_results}")
