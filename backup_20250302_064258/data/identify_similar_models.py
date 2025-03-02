import csv
import re
import os
import difflib
from pathlib import Path
from collections import defaultdict

def load_motorcycle_data(input_file):
    """Load motorcycle data from CSV file."""
    motorcycles = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            motorcycles.append(row)
    return motorcycles

def group_similar_bikes(motorcycles):
    """Group bikes by year, make, type, and displacement for similarity comparison."""
    # Create groups based on common attributes
    groups = defaultdict(list)
    for bike in motorcycles:
        # Create a key based on attributes that should be the same for model variants
        key = (
            bike.get('Year', '').strip(),
            bike.get('Make', '').strip(),
            bike.get('Type', '').strip(),
            # Clean and normalize engine displacement for better matching
            re.sub(r'[^0-9]', '', bike.get('Engine displacement', '').strip())
        )
        groups[key].append(bike)
    
    # Return only groups with multiple bikes (potential model variants)
    return {k: v for k, v in groups.items() if len(v) > 1}

def find_common_substring(strings):
    """Find the longest common substring among a list of strings."""
    if not strings:
        return ""
    
    # Start with the first string as reference
    reference = strings[0]
    common = reference
    
    # Iteratively find common part with each string
    for s in strings[1:]:
        # Find matching blocks between strings
        matcher = difflib.SequenceMatcher(None, common, s)
        blocks = matcher.get_matching_blocks()
        
        if blocks:
            # Sort blocks by size (descending)
            blocks = sorted(blocks, key=lambda x: x.size, reverse=True)
            longest_block = blocks[0]
            common = common[longest_block.a:longest_block.a + longest_block.size]
        else:
            common = ""
            break
    
    return common.strip()

def extract_package_candidates(grouped_bikes):
    """
    Extract package information from groups of similar bikes.
    For each group, identify the common model name and the variable part (package).
    """
    results = []
    
    for attrs, bikes in grouped_bikes.items():
        year, make, bike_type, engine = attrs
        
        # Skip groups with less than 2 bikes
        if len(bikes) < 2:
            continue
            
        # Extract model names
        model_names = [bike.get('Model', '').strip() for bike in bikes]
        
        # Find common base model name
        base_model = find_common_substring(model_names)
        
        # Only proceed if we found a meaningful common base (at least 5 chars)
        if len(base_model) < 5:
            continue
            
        # For each bike, determine the package
        for bike in bikes:
            model = bike.get('Model', '').strip()
            existing_package = bike.get('Package', '').strip()
            
            # Extract package from model name
            if model == base_model:
                # This is the base model, no package in name
                package_in_name = ""
            else:
                # Extract the part that differs from base model
                package_in_name = model.replace(base_model, '').strip()
            
            # Only add to results if we found a package in the name and there's no existing package
            if package_in_name and not existing_package:
                results.append({
                    'Year': year,
                    'Make': make,
                    'Model': model,
                    'Base_Model': base_model,
                    'Type': bike_type,
                    'Engine': engine,
                    'Extracted_Package': package_in_name,
                    'Existing_Package': existing_package
                })
    
    return results

def clean_package_name(package):
    """Clean up extracted package names by removing prefixes/suffixes."""
    # Remove common separators at start
    package = re.sub(r'^[\s\-_]+', '', package)
    
    # Common cleanup patterns
    common_prefixes = [' -', ' ']
    for prefix in common_prefixes:
        if package.startswith(prefix):
            package = package[len(prefix):].strip()
    
    return package

def apply_corrections(motorcycles, corrections):
    """Apply corrections to the motorcycle data."""
    # Create a lookup dictionary for corrections
    correction_lookup = {}
    for corr in corrections:
        key = (corr['Year'], corr['Make'], corr['Model'])
        correction_lookup[key] = (corr['Base_Model'], corr['Extracted_Package'])
    
    # Apply corrections
    corrected_bikes = []
    for bike in motorcycles:
        year = bike.get('Year', '').strip()
        make = bike.get('Make', '').strip()
        model = bike.get('Model', '').strip()
        package = bike.get('Package', '').strip()
        
        key = (year, make, model)
        if key in correction_lookup and not package:
            corrected_model, extracted_package = correction_lookup[key]
            
            # Clean up the package name
            clean_package = clean_package_name(extracted_package)
            
            # Only apply if the extracted package is non-empty after cleaning
            if clean_package:
                bike_copy = bike.copy()
                bike_copy['Model'] = corrected_model
                bike_copy['Package'] = clean_package
                corrected_bikes.append(bike_copy)
                print(f"Corrected: {year} {make} {model} → Model: {corrected_model}, Package: {clean_package}")
            else:
                corrected_bikes.append(bike)
        else:
            corrected_bikes.append(bike)
    
    return corrected_bikes

def validate_package_extraction(bikes):
    """Validate that package extraction makes sense."""
    # Check for common erroneous extractions
    error_patterns = [
        r'^[0-9]+$',  # Just numbers (likely part of model)
        r'^[A-Z]$',   # Single letter (often just part of model name)
    ]
    
    rejected = []
    accepted = []
    
    for bike in bikes:
        package = bike.get('Extracted_Package', '')
        
        # Skip if no extracted package
        if not package:
            continue
            
        reject = False
        for pattern in error_patterns:
            if re.match(pattern, package):
                reject = True
                break
                
        if reject:
            rejected.append(bike)
        else:
            accepted.append(bike)
    
    print(f"Accepted {len(accepted)} package extractions, rejected {len(rejected)}")
    return accepted, rejected

def main():
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    input_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    output_file = base_dir / "motorcycles/Motorcycle_Package_Corrected.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found at {input_file}")
        return
    
    # Load data
    print("Loading motorcycle data...")
    motorcycles = load_motorcycle_data(input_file)
    print(f"Loaded {len(motorcycles)} motorcycles")
    
    # Group similar bikes
    print("\nGrouping similar bikes...")
    grouped_bikes = group_similar_bikes(motorcycles)
    print(f"Found {len(grouped_bikes)} groups of similar bikes")
    
    # Extract package candidates
    print("\nExtracting package candidates...")
    package_candidates = extract_package_candidates(grouped_bikes)
    print(f"Found {len(package_candidates)} potential package extractions")
    
    # Validate extractions
    accepted_packages, rejected_packages = validate_package_extraction(package_candidates)
    
    # Show some examples of accepted extractions
    print("\nExamples of detected packages:")
    for i, bike in enumerate(accepted_packages[:10]):
        print(f"{i+1}. {bike['Year']} {bike['Make']} {bike['Model']}")
        print(f"   Base Model: {bike['Base_Model']}")
        print(f"   Extracted Package: {bike['Extracted_Package']}")
    
    # Apply corrections to the dataset
    print("\nApplying corrections to the dataset...")
    corrected_bikes = apply_corrections(motorcycles, accepted_packages)
    
    # Write the corrected data
    print(f"\nWriting corrected data to {output_file}")
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=motorcycles[0].keys())
        writer.writeheader()
        writer.writerows(corrected_bikes)
    
    print("Done!")

if __name__ == "__main__":
    main()
