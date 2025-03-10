# This file contains helper functions used across the bot.
# Add new utility functions here as needed.
# Do not create new utility files; update this one.

import re
import discord
import json
from pathlib import Path
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger('BikeRoleBot')

def example_helper():
    """Example helper function"""
    pass

def is_admin(member: discord.Member) -> bool:
    """Check if a member has administrator privileges
    
    Args:
        member: Discord member to check
        
    Returns:
        bool: True if member is an administrator
    """
    return member.guild_permissions.administrator or member.guild_permissions.manage_guild

def create_embed(title: str, description: str = "", color: int = 0x3498db) -> discord.Embed:
    """Create a standardized Discord embed
    
    Args:
        title: Embed title
        description: Embed description
        color: RGB color code (default: blue)
        
    Returns:
        discord.Embed: Formatted embed object
    """
    embed = discord.Embed(
        title=title,
        description=description,
        color=discord.Color(color)
    )
    
    return embed

def parse_bike_string(bike_string: str) -> Optional[Dict[str, Any]]:
    """Parse a user-provided motorcycle description string into components
    
    Args:
        bike_string: String like "2020 Honda CBR1000RR-R Fireblade SP"
        
    Returns:
        dict: Dictionary with year, make, model, and package components
              or None if parsing failed
    """
    # Match patterns like:
    # 2020 Honda CBR1000RR
    # 2019 Kawasaki Ninja 650 (ABS)
    # 2021 Ducati Panigale V4 S
    
    # Try to extract year as first digits in the string
    year_match = re.search(r'^(\d{4})', bike_string)
    if not year_match:
        return None
    
    year = year_match.group(1)
    remaining = bike_string[len(year):].strip()
    
    # Try to find package in parentheses
    package = None
    package_match = re.search(r'\(([^)]+)\)', remaining)
    if package_match:
        package = package_match.group(1)
        # Remove package from remaining string
        remaining = re.sub(r'\([^)]+\)', '', remaining).strip()
    
    # Split remaining string into words
    parts = remaining.split()
    if len(parts) < 2:
        return None
    
    # First word is make, remaining is model
    make = parts[0]
    model = ' '.join(parts[1:])
    
    return {
        "year": year,
        "make": make,
        "model": model,
        "package": package
    }

def format_bike_name(bike: Dict[str, Any]) -> str:
    """Format a motorcycle dictionary into a readable string
    
    Args:
        bike: Dictionary with motorcycle details
        
    Returns:
        str: Formatted string (e.g., "2020 Honda CBR1000RR (SP)")
    """
    name = f"{bike.get('year')} {bike.get('make')} {bike.get('model')}"
    
    if bike.get('package'):
        name += f" ({bike.get('package')})"
        
    return name

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

def paginate_content(content: str, max_length: int = 2000) -> List[str]:
    """Split content into multiple messages if it exceeds Discord's limit
    
    Args:
        content: Content to split
        max_length: Maximum length per chunk (default: 2000)
        
    Returns:
        list: List of content chunks
    """
    if len(content) <= max_length:
        return [content]
        
    # Split by newlines to avoid breaking in the middle of lines
    lines = content.split('\n')
    chunks = []
    current_chunk = ""
    
    for line in lines:
        # If adding this line would exceed limit, start a new chunk
        if len(current_chunk) + len(line) + 1 > max_length:
            chunks.append(current_chunk)
            current_chunk = line + '\n'
        else:
            current_chunk += line + '\n'
    
    # Add final chunk if not empty
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks
