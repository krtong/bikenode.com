import csv
import os
from typing import List, Dict, Any, Optional, Tuple

def load_motorcycle_data(file_path: str) -> List[Dict[str, Any]]:
    """
    Load motorcycle data from a CSV file
    
    Args:
        file_path: Path to the CSV file containing motorcycle data
    
    Returns:
        List of dictionaries containing motorcycle data
    """
    motorcycles = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Clean up data
                clean_row = {k.strip(): v.strip() if v else None for k, v in row.items()}
                motorcycles.append(clean_row)
                
        return motorcycles
    except Exception as e:
        print(f"Error loading motorcycle data: {e}")
        return []

def search_motorcycles(motorcycles: List[Dict[str, Any]], query: str, 
                       filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Search for motorcycles based on a query string and optional filters
    
    Args:
        motorcycles: List of motorcycle dictionaries
        query: Search query string
        filters: Optional dictionary of field:value filters
    
    Returns:
        Filtered list of motorcycles
    """
    query = query.lower()
    results = []
    
    for bike in motorcycles:
        # Search in make, model and package fields
        if query in bike.get('Make', '').lower() or \
           query in bike.get('Model', '').lower() or \
           query in bike.get('Package', '').lower():
            
            # Apply additional filters if provided
            if filters:
                match = True
                for key, value in filters.items():
                    if key in bike and bike[key] != value:
                        match = False
                        break
                
                if match:
                    results.append(bike)
            else:
                results.append(bike)
                
    return results

def get_motorcycle_stats(motorcycles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate statistics from the motorcycle data
    
    Args:
        motorcycles: List of motorcycle dictionaries
    
    Returns:
        Dictionary of statistical data
    """
    stats = {
        "total": len(motorcycles),
        "makes": set(),
        "categories": {},
        "years": {}
    }
    
    for bike in motorcycles:
        # Count unique makes
        if bike.get('Make'):
            stats["makes"].add(bike['Make'])
            
        # Count categories
        category = bike.get('Category')
        if category:
            stats["categories"][category] = stats["categories"].get(category, 0) + 1
            
        # Count years
        year = bike.get('Year')
        if year:
            stats["years"][year] = stats["years"].get(year, 0) + 1
            
    # Convert sets to sorted lists for JSON serialization
    stats["makes"] = sorted(list(stats["makes"]))
    
    return stats

def format_motorcycle_info(motorcycle: Dict[str, Any]) -> str:
    """
    Format motorcycle data into a readable string
    
    Args:
        motorcycle: Dictionary containing motorcycle data
    
    Returns:
        Formatted string with motorcycle information
    """
    lines = []
    
    # Basic info
    year = motorcycle.get('Year', 'Unknown')
    make = motorcycle.get('Make', 'Unknown')
    model = motorcycle.get('Model', 'Unknown')
    package = motorcycle.get('Package', '')
    
    title = f"**{year} {make} {model}**"
    if package:
        title += f" {package}"
    lines.append(title)
    
    # Category and engine
    category = motorcycle.get('Category', 'Unknown')
    engine = motorcycle.get('Engine', 'Unknown')
    
    lines.append(f"**Category:** {category}")
    lines.append(f"**Engine:** {engine}")
    
    return "\n".join(lines)
