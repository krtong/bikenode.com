# This file contains helper functions used across the bot.
# Add new utility functions here as needed.
# Do not create new utility files; update this one.

import re
import discord
import json
from pathlib import Path
import logging

logger = logging.getLogger('BikeRoleBot')

def example_helper():
    """Example helper function"""
    pass

def parse_bike_string(bike_string):
    """Parse a bike string into components (year, make, model, package)"""
    try:
        # Match patterns like "2020 Honda CBR1000RR" or "2022 Ducati Panigale V4 (S)"
        pattern = r"(\d{4})\s+(\w+)\s+(.+?)(?:\s+\((.+)\))?$"
        match = re.match(pattern, bike_string)
        
        if not match:
            return None
            
        return {
            "year": match.group(1),
            "make": match.group(2),
            "model": match.group(3),
            "package": match.group(4)
        }
    except Exception as e:
        logger.error(f"Error parsing bike string '{bike_string}': {e}")
        return None

def format_bike_name(bike_data):
    """Format bike data into a readable string"""
    if not bike_data:
        return "Unknown Motorcycle"
        
    bike_str = f"{bike_data.get('year', '')} {bike_data.get('make', '')} {bike_data.get('model', '')}"
    if bike_data.get('package'):
        bike_str += f" ({bike_data['package']})"
    return bike_str.strip()

def load_json_data(file_path):
    """Load data from a JSON file"""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading JSON data from {file_path}: {e}")
        return {}

def save_json_data(file_path, data):
    """Save data to a JSON file"""
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f)
        return True
    except Exception as e:
        logger.error(f"Error saving JSON data to {file_path}: {e}")
        return False

def load_server_settings(server_id):
    """Load settings for a specific server"""
    data_dir = Path(__file__).parent.parent / 'data'
    data_dir.mkdir(exist_ok=True)
    settings_file = data_dir / 'settings.json'
    
    settings = load_json_data(settings_file)
    
    return settings.get(str(server_id), {})

def save_server_settings(server_id, server_settings):
    """Save settings for a specific server"""
    data_dir = Path(__file__).parent.parent / 'data'
    data_dir.mkdir(exist_ok=True)
    settings_file = data_dir / 'settings.json'
    
    settings = load_json_data(settings_file)
    
    settings[str(server_id)] = server_settings
    
    save_json_data(settings_file, settings)

def create_bike_role_name(bike_data, role_mode):
    """Create a role name based on bike data and role mode"""
    if role_mode == 'brand':
        return f"Bike-{bike_data['make']}"
    elif role_mode == 'type':
        return f"Bike-{bike_data['category']}"
    elif role_mode == 'model':
        name = f"Bike-{bike_data['year']}-{bike_data['make']}-{bike_data['model']}"
        if bike_data.get('package'):
            name += f"-{bike_data['package']}"
        return name.replace(' ', '-')
    return None
