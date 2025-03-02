import csv
import re
import os
import difflib
from pathlib import Path
from collections import defaultdict

def find_common_parts(model1, model2):
    """
    Find common and different parts between two model names using 
    a more sophisticated approach than simple substring matching.
    Returns (common_base, package_part, match_quality)
    """
    # Use SequenceMatcher to find matching blocks
    matcher = difflib.SequenceMatcher(None, model1, model2)
    matches = matcher.get_matching_blocks()
    
    # If models are very different, they're likely unrelated
    if matcher.ratio() < 0.6:
        return model1, "", 0  # Low match quality
    
    # For exact match models, no package
    if model1 == model2:
        return model1, "", 1.0
    
    # Special handling for common pattern: Base model + package suffix
    # Example: "Monster 1100" and "Monster 1100 S" → Base="Monster 1100", Package="S"
    if model2.startswith(model1 + " "):
        package = model2[len(model1)+1:]
        return model1, package, 0.9
    elif model1.startswith(model2 + " "):
        package = model1[len(model2)+1:]
        return model2, package, 0.9
    
    # Look for a suffix pattern (common in motorcycle packages)
    # Example: "GSX-R1000" and "GSX-R1000 ABS" → Base="GSX-R1000", Package="ABS"
    common_pattern = r'^(.*?)(?:\s+([A-Za-z0-9]+(?:\s+[A-Za-z]+)?))?$'
    m1 = re.match(common_pattern, model1)
    m2 = re.match(common_pattern, model2)
    
    if m1 and m2 and m1.group(1) == m2.group(1):
        base = m1.group(1)
        package1 = m1.group(2) or ""
        package2 = m2.group(2) or ""
        
        # If only one has a suffix, that's our package
        if package1 and not package2:
            return base, package1, 0.85
        elif package2 and not package1:
            return base, package2, 0.85
    
    # Standard approach: Find the longest continuous match and treat the rest as package
    if matches and len(matches) > 0:
        # Sort by match size to get the longest matching block
        sorted_matches = sorted(matches[:-1], key=lambda x: x.size, reverse=True)
        if sorted_matches:
            match = sorted_matches[0]
            # If the match is significant enough
            if match.size > min(len(model1), len(model2)) * 0.6:
                common_part = model1[match.a:match.a + match.size].strip()
                
                # Determine which model has the extra part (package)
                if len(model1) > len(model2):
                    diff_part = model1.replace(common_part, "").strip()
                    if common_part in model1:
                        return common_part, diff_part, 0.7
                else:
                    diff_part = model2.replace(common_part, "").strip()
                    if common_part in model2:
                        return common_part, diff_part, 0.7
    
    # If we reach here, the models are similar but we can't confidently extract a package
    return model1, "", 0.3

def evaluate_package_candidate(base_model, package, model1, model2):
    """
    Evaluate if the extracted package is valid or likely a model variation.
    """
    # Skip packages that are just numbers (likely displacement differences)
    if re.match(r'^\d+$', package):
        return False
    
    # Skip very short packages unless they're known package designations
    known_short_packages = {'S', 'R', 'SE', 'GT', 'T', 'SP'}
    if len(package) == 1 and package not in known_short_packages:
        return False
    
    # Skip packages with large numeric differences (likely different models)
    num_pattern = r'.*?(\d+).*?'
    m1 = re.match(num_pattern, model1)
    m2 = re.match(num_pattern, model2)
    if m1 and m2:
        num1 = int(m1.group(1))
        num2 = int(m2.group(1))
        if abs(num1 - num2) > 50:  # Significant displacement difference
            return False
    
    # Common valid package types
    valid_package_patterns = [
        r'^[A-Z]{1,4}$',  # ABS, SE, etc.
        r'^[A-Za-z]+$',   # Sport, Touring, etc.
        r'^[A-Za-z]+\s[A-Za-z]+$',  # Special Edition, etc.
        r'^FACTORY$',
        r'^Limited$',
        r'^Special$'
    ]
    
    for pattern in valid_package_patterns:
        if re.match(pattern, package):
            return True
    
    # If nothing matched but the package is more than 3 chars, might be valid
    return len(package) >= 3

def group_similar_models(motorcycles):
    """
    Group motorcycles by year and make, then find similar models 
    that likely have package variations.
    """
    # Group by year and make
    make_year_groups = defaultdict(list)
    for bike in motorcycles:
        year = bike.get('Year', '').strip()
        make = bike.get('Make', '').strip()
        key = (year, make)
        make_year_groups[key].append(bike)
    
    # For each group, find similar models
    similar_pairs = []
    for (year, make), bikes in make_year_groups.items():
        # Skip small groups
        if len(bikes) < 2:
            continue
        
        # Compare each pair of bikes in the group
        models = sorted({bike.get('Model', '').strip() for bike in bikes})
        for i in range(len(models)):
            for j in range(i+1, len(models)):
                model1 = models[i]
                model2 = models[j]
                
                # Find common parts and package
                base_model, package, quality = find_common_parts(model1, model2)
                
                # Validate the package
                if quality >= 0.7 and package and evaluate_package_candidate(base_model, package, model1, model2):
                    # Determine which model is the package variant
                    if model2.replace(base_model, '').strip() == package:
                        variant_model = model2
                    else:
                        variant_model = model1
                    
                    similar_pairs.append({
                        'year': year,
                        'make': make,
                        'base_model': base_model,
                        'variant_model': variant_model,
                        'package': package,
                        'match_quality': quality
                    })
    
    return sorted(similar_pairs, key=lambda x: (x['year'], x['make'], x['base_model']))

def apply_package_corrections(motorcycles, similar_pairs):
    """Apply corrections to the motorcycle data based on identified similar models."""
    # Create a lookup dictionary for corrections
    corrections = {}
    for pair in similar_pairs:
        key = (pair['year'], pair['make'], pair['variant_model'])
        corrections[key] = (pair['base_model'], pair['package'])
    
    corrected_bikes = []
    corrections_made = 0
    
    for bike in motorcycles:
        year = bike.get('Year', '').strip()
        make = bike.get('Make', '').strip()
        model = bike.get('Model', '').strip()
        existing_package = bike.get('Package', '').strip()
        
        # Copy the original bike data
        corrected_bike = bike.copy()
        
        # Apply correction only if there's no existing package
        key = (year, make, model)
        if key in corrections and not existing_package:
            corrected_bike['Model'] = corrections[key][0]
            corrected_bike['Package'] = corrections[key][1]
            corrections_made += 1
        
        corrected_bikes.append(corrected_bike)
    
    return corrected_bikes, corrections_made

def main():
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    input_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    output_file = base_dir / "motorcycles/Motorcycle_Package_Corrected.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found at {input_file}")
        return
    
    # Load motorcycle data
    print("Loading motorcycle data...")
    motorcycles = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            motorcycles.append(row)
    print(f"Loaded {len(motorcycles)} motorcycles")
    
    # Identify similar models and extract packages
    print("\nIdentifying similar models and packages...")
    similar_pairs = group_similar_models(motorcycles)
    print(f"Found {len(similar_pairs)} potential package variations")
    
    # Display examples of identified packages
    print("\nExamples of detected packages:")
    for i, pair in enumerate(similar_pairs[:10]):
        print(f"{i+1}. {pair['year']} {pair['make']} {pair['variant_model']}")
        print(f"   Base Model: {pair['base_model']}")
        print(f"   Package: {pair['package']}")
        print(f"   Match Quality: {pair['match_quality']:.2f}")
    
    # Apply corrections
    print("\nApplying package corrections...")
    corrected_bikes, corrections_made = apply_package_corrections(motorcycles, similar_pairs)
    print(f"Made {corrections_made} package corrections")
    
    # Write corrected data
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=motorcycles[0].keys())
        writer.writeheader()
        writer.writerows(corrected_bikes)
    
    print(f"\nCorrected data written to {output_file}")
    print("Done!")

if __name__ == "__main__":
    main()
