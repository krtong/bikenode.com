import csv
import re
import os
from pathlib import Path

def correct_motorcycle_packages(input_file, output_file=None):
    """
    Process the motorcycle data to correctly identify packages, especially for:
    - Aprilia Tuono models where 'FACTORY' should be a package
    - Cases where package info is embedded in the model name
    
    Args:
        input_file: Path to the input CSV file
        output_file: Path to the output CSV file (if None, will use a default path)
    """
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    if output_file is None:
        output_file = base_dir / "motorcycles/Motorcycle_Corrected_Data.csv"
    
    motorcycles = []
    special_cases = 0
    package_corrections = 0
    
    # Define patterns for special model-package relationships
    special_model_patterns = {
        # Format: (make, model_pattern, model_replacement, extract_package)
        ('Aprilia', r'Tuono 1000 R FACTORY', 'Tuono 1000 R', 'FACTORY'),
        ('Harley-Davidson', r'(.*) Special$', r'\1', 'Special'),
        # Add more patterns as needed
    }
    
    # Read the data
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        
        for row in reader:
            make = row.get('Make', '').strip()
            model = row.get('Model', '').strip()
            package = row.get('Package', '').strip()
            year = row.get('Year', '').strip()
            
            original_model = model
            original_package = package
            
            # Check for special cases
            for make_pattern, model_pattern, model_replacement, expected_package in special_model_patterns:
                if make == make_pattern and re.match(model_pattern, model):
                    if not package:  # Only modify if package is empty
                        model = model_replacement
                        package = expected_package
                        special_cases += 1
                        package_corrections += 1
                        break
            
            # Special case for Aprilia Tuono 1000 R where R is both in model and package
            if make == 'Aprilia' and model == 'Tuono 1000 R' and package == 'R':
                # This is fine as-is, but we note it for reporting
                special_cases += 1
            
            # Save the processed row
            corrected_row = row.copy()
            corrected_row['Model'] = model
            corrected_row['Package'] = package
            
            # Debug message for modified entries
            if original_model != model or original_package != package:
                print(f"Corrected: {year} {make} {original_model} [{original_package}] → "
                      f"{model} [{package}]")
            
            motorcycles.append(corrected_row)
    
    # Write the corrected data
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(motorcycles)
    
    print(f"\nProcessing complete:")
    print(f"- Total motorcycles processed: {len(motorcycles)}")
    print(f"- Special cases identified: {special_cases}")
    print(f"- Package corrections made: {package_corrections}")
    print(f"- Output saved to: {output_file}")
    
    return motorcycles

def analyze_aprilia_tuono():
    """
    Function specifically to analyze Aprilia Tuono models to understand the pattern
    """
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    input_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found at {input_file}")
        return
    
    tuono_models = []
    
    # Read the data
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            make = row.get('Make', '').strip()
            model = row.get('Model', '').strip()
            
            if make == 'Aprilia' and 'Tuono' in model:
                tuono_models.append(row)
    
    # Analyze the models
    print(f"\nFound {len(tuono_models)} Aprilia Tuono models:")
    for bike in tuono_models:
        print(f"  {bike['Year']} {bike['Make']} {bike['Model']} - Package: '{bike.get('Package', '')}' - Type: {bike.get('Type', '')}")
    
    # Output recommendations
    print("\nRecommended corrections for Aprilia Tuono models:")
    for bike in tuono_models:
        model = bike['Model']
        package = bike.get('Package', '')
        
        corrected_model = model
        corrected_package = package
        
        # Apply corrections
        if 'FACTORY' in model and not package:
            corrected_model = 'Tuono 1000 R'
            corrected_package = 'FACTORY'
        
        if corrected_model != model or corrected_package != package:
            print(f"  {bike['Year']} {bike['Make']} {model} [{package}] → "
                  f"{corrected_model} [{corrected_package}]")

if __name__ == "__main__":
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    input_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found at {input_file}")
    else:
        # First analyze just Aprilia Tuono models to understand the pattern
        analyze_aprilia_tuono()
        
        # Then process all motorcycles
        print("\nProcessing all motorcycles...")
        correct_motorcycle_packages(input_file)
