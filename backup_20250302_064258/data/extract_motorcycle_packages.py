import csv
import re
import os
from pathlib import Path

def parse_motorcycle_data(input_file):
    """
    Parse the motorcycle data from the CSV file, correctly extracting packages.
    
    In the input data, format is:
    year,make,model,package,type,engine_displacement
    
    We need to ensure packages are correctly identified as separate entities
    even when they appear as part of the model name.
    """
    motorcycles = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Standardize the keys to handle header inconsistencies
            row_dict = {k.strip().lower(): v for k, v in row.items()}
            
            year = row_dict.get('year', '')
            make = row_dict.get('make', '')
            model = row_dict.get('model', '')
            package = row_dict.get('package', '')
            vehicle_type = row_dict.get('type', '')
            engine = row_dict.get('engine_displacement', '')
            
            # Some cleaning and validation
            if not year or not make or not model:
                continue
                
            # Normalize the data
            year = year.strip()
            make = make.strip()
            model = model.strip()
            package = package.strip() if package else ""
            
            motorcycles.append({
                'year': year,
                'make': make,
                'model': model,
                'package': package,
                'type': vehicle_type,
                'engine': engine
            })
    
    return motorcycles

def analyze_packages():
    """
    Analyze the motorcycle data to understand how packages are represented.
    """
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    input_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found at {input_file}")
        return
    
    motorcycles = parse_motorcycle_data(input_file)
    
    # Count packages
    package_counts = {}
    models_with_packages = []
    
    for bike in motorcycles:
        if bike['package']:
            package = bike['package']
            package_counts[package] = package_counts.get(package, 0) + 1
            models_with_packages.append(f"{bike['year']} {bike['make']} {bike['model']} [{bike['package']}]")
    
    # Output examples and statistics
    print(f"Total motorcycles: {len(motorcycles)}")
    print(f"Motorcycles with packages: {len(models_with_packages)}")
    print(f"Unique packages: {len(package_counts)}")
    
    # Print the most common packages
    print("\nMost common packages:")
    sorted_packages = sorted(package_counts.items(), key=lambda x: x[1], reverse=True)
    for package, count in sorted_packages[:20]:
        print(f"  {package}: {count}")
    
    # Print some examples of motorcycles with packages
    print("\nExamples of motorcycles with packages:")
    for example in models_with_packages[:10]:
        print(f"  {example}")
    
    # Special analysis for Aprilia Tuono models
    aprilia_tuono = [bike for bike in motorcycles if bike['make'] == 'Aprilia' and 'Tuono' in bike['model']]
    if aprilia_tuono:
        print("\nAprilia Tuono models:")
        for bike in aprilia_tuono:
            print(f"  {bike['year']} {bike['make']} {bike['model']} - Package: '{bike['package']}' - Type: {bike['type']}")

def extract_standard_packages():
    """
    Create a standardized list of common motorcycle packages to help with data cleaning.
    """
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    input_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found at {input_file}")
        return
    
    motorcycles = parse_motorcycle_data(input_file)
    
    # Get all unique packages
    packages = set()
    for bike in motorcycles:
        if bike['package']:
            packages.add(bike['package'])
    
    # Output to a file
    output_file = base_dir / "motorcycles/standard_packages.txt"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Standard motorcycle packages\n")
        f.write("# Use this list for reference when cleaning data\n\n")
        for package in sorted(packages):
            f.write(f"{package}\n")
    
    print(f"Wrote {len(packages)} packages to {output_file}")

if __name__ == "__main__":
    analyze_packages()
    extract_standard_packages()
