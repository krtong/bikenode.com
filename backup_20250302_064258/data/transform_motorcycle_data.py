import csv
import os
import re
from pathlib import Path

def extract_displacement(engine_str):
    """
    Extract displacement value from engine string.
    Examples:
    - "1200cc V-Twin" -> "1200cc"
    - "883 cc V-twin" -> "883cc" 
    - "750 cc" -> "750cc"
    """
    if not engine_str:
        return ""
        
    # Look for patterns like "750 cc", "750cc", "750 cubic centimeters"
    displacement_pattern = r'(\d+)\s*(?:cc|cubic centimeters?)'
    match = re.search(displacement_pattern, engine_str.lower())
    if match:
        return f"{match.group(1)}cc"
    
    # If no displacement with units found, check if the string starts with a number
    # (common for older listings)
    number_pattern = r'^(\d+)'
    match = re.search(number_pattern, engine_str.strip())
    if match:
        return f"{match.group(1)}cc"
        
    return ""

def extract_package(model_name, category):
    """
    Attempt to extract package information from model name or category.
    This is a heuristic approach since packages aren't explicitly listed in older data.
    """
    # Common package identifiers
    package_identifiers = [
        "Special", "Limited", "Custom", "Deluxe", "Standard", "Sport",
        "Touring", "Classic", "Elite", "Premium", "Base", "R", "S", "RS",
        "GT", "LX", "GLX", "DLX", "XL", "XT", "XLT"
    ]
    
    # Check if any package identifier is at the end of the model name
    for identifier in package_identifiers:
        if model_name.endswith(f" {identifier}"):
            return identifier
    
    # Some models have package in parentheses
    match = re.search(r'\(([^)]+)\)$', model_name)
    if match:
        return match.group(1)
    
    return ""

def transform_motorcycle_data():
    """
    Transform motorcycle data into a new CSV format with columns:
    year | make | model | package | type | engine displacement
    """
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    # Input files
    old_bikes_csv = base_dir / "motorcycles/Motorcycle_Makes_models_1894-1949.csv"
    new_bikes_csv = base_dir / "motorcycles/Motorcycle_Makes_models_1950-2025.csv"
    
    # Output file
    output_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    
    # Check if input files exist
    input_files = [old_bikes_csv, new_bikes_csv]
    missing_files = [f for f in input_files if not f.exists()]
    
    if missing_files:
        print("Error: Missing input files:")
        for f in missing_files:
            print(f"  - {f}")
        return False
    
    # Data collection
    transformed_data = []
    header_written = False
    
    # Process both files
    for file_path in input_files:
        print(f"Processing {file_path.name}...")
        
        with open(file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            # Get original field names to handle differences between files
            original_fields = csv_reader.fieldnames
            
            for row in csv_reader:
                year = row.get('Year', '')
                make = row.get('Make', '')
                model = row.get('Model', '')
                category = row.get('Category', '')
                engine = row.get('Engine', '')
                
                # Skip rows with missing essential data
                if not (year and make and model):
                    continue
                
                # Extract or generate package information (this is a heuristic)
                package = row.get('Package', '') or extract_package(model, category)
                
                # Extract displacement from engine info
                displacement = extract_displacement(engine)
                
                # Add to transformed data
                transformed_data.append({
                    'year': year,
                    'make': make,
                    'model': model,
                    'package': package,
                    'type': category,  # Use Category as type
                    'engine_displacement': displacement
                })
    
    # Write transformed data to new CSV
    print(f"Writing {len(transformed_data)} records to {output_file}...")
    
    with open(output_file, 'w', newline='', encoding='utf-8') as file:
        fieldnames = ['year', 'make', 'model', 'package', 'type', 'engine_displacement']
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(transformed_data)
    
    print(f"Transformation complete! New file created at: {output_file}")
    return True

if __name__ == "__main__":
    transform_motorcycle_data()
