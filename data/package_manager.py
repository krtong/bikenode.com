import csv
import os
import argparse
from pathlib import Path
from improved_model_similarity import group_similar_models, apply_package_corrections

"""
Package Manager - A tool for managing motorcycle model and package information.

This script provides functions for:
1. Identifying similar motorcycle models that may have package variations
2. Automatically extracting packages from model names
3. Managing manual package corrections
4. Applying corrections to the motorcycle database
"""

def load_motorcycle_data(input_file):
    """Load motorcycle data from CSV file."""
    motorcycles = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            motorcycles.append(row)
    return motorcycles

def save_motorcycle_data(motorcycles, output_file):
    """Save motorcycle data to CSV file."""
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=motorcycles[0].keys())
        writer.writeheader()
        writer.writerows(motorcycles)

def generate_package_report(motorcycles, output_file):
    """Generate a report of packages used in the motorcycle data."""
    packages = {}
    
    # Count package occurrences
    for bike in motorcycles:
        package = bike.get('Package', '').strip()
        if package:
            if package not in packages:
                packages[package] = {
                    'count': 1,
                    'examples': [(bike.get('Year', ''), bike.get('Make', ''), bike.get('Model', ''))]
                }
            else:
                packages[package]['count'] += 1
                if len(packages[package]['examples']) < 3:
                    packages[package]['examples'].append(
                        (bike.get('Year', ''), bike.get('Make', ''), bike.get('Model', ''))
                    )
    
    # Sort packages by frequency
    sorted_packages = sorted(packages.items(), key=lambda x: x[1]['count'], reverse=True)
    
    # Write report
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Motorcycle Package Report\n\n")
        f.write(f"Total unique packages: {len(packages)}\n\n")
        
        f.write("## Package Frequency\n\n")
        f.write("| Package | Count | Examples |\n")
        f.write("|---------|-------|----------|\n")
        
        for package, data in sorted_packages:
            examples = "; ".join([f"{year} {make} {model}" for year, make, model in data['examples']])
            f.write(f"| {package} | {data['count']} | {examples} |\n")

def add_manual_correction(manual_corrections_file, year, make, model, new_model, package):
    """Add a manual package correction."""
    # Create file with headers if it doesn't exist
    if not os.path.exists(manual_corrections_file):
        with open(manual_corrections_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Year', 'Make', 'Model', 'New Model', 'Package'])
    
    # Append the correction
    with open(manual_corrections_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([year, make, model, new_model, package])
    
    print(f"Added manual correction: {year} {make} {model} → {new_model} [{package}]")

def apply_manual_corrections(motorcycles, manual_corrections_file):
    """Apply manual corrections to motorcycle data."""
    if not os.path.exists(manual_corrections_file):
        print("No manual corrections file found.")
        return motorcycles, 0
    
    corrections = {}
    with open(manual_corrections_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (row['Year'].strip(), row['Make'].strip(), row['Model'].strip())
            corrections[key] = (row['New Model'].strip(), row['Package'].strip())
    
    corrected_bikes = []
    corrections_applied = 0
    
    for bike in motorcycles:
        year = bike.get('Year', '').strip()
        make = bike.get('Make', '').strip()
        model = bike.get('Model', '').strip()
        
        key = (year, make, model)
        if key in corrections:
            bike_copy = bike.copy()
            bike_copy['Model'] = corrections[key][0]
            bike_copy['Package'] = corrections[key][1]
            corrected_bikes.append(bike_copy)
            corrections_applied += 1
        else:
            corrected_bikes.append(bike)
    
    return corrected_bikes, corrections_applied

def main():
    parser = argparse.ArgumentParser(description='Motorcycle Package Manager')
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Auto-detect command
    auto_parser = subparsers.add_parser('auto-detect', help='Automatically detect and extract packages')
    auto_parser.add_argument('--input', required=True, help='Input CSV file')
    auto_parser.add_argument('--output', required=True, help='Output CSV file')
    
    # Manual correction command
    manual_parser = subparsers.add_parser('add-correction', help='Add a manual package correction')
    manual_parser.add_argument('--year', required=True, help='Motorcycle year')
    manual_parser.add_argument('--make', required=True, help='Motorcycle make')
    manual_parser.add_argument('--model', required=True, help='Original model name')
    manual_parser.add_argument('--new-model', required=True, help='Corrected model name')
    manual_parser.add_argument('--package', required=True, help='Package designation')
    
    # Apply corrections command
    apply_parser = subparsers.add_parser('apply-corrections', help='Apply manual corrections')
    apply_parser.add_argument('--input', required=True, help='Input CSV file')
    apply_parser.add_argument('--output', required=True, help='Output CSV file')
    
    # Report command
    report_parser = subparsers.add_parser('report', help='Generate package report')
    report_parser.add_argument('--input', required=True, help='Input CSV file')
    report_parser.add_argument('--output', required=True, help='Output report file')
    
    args = parser.parse_args()
    
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    manual_corrections_file = base_dir / "manual_package_corrections.csv"
    
    if args.command == 'auto-detect':
        # Load data
        print(f"Loading data from {args.input}...")
        motorcycles = load_motorcycle_data(args.input)
        
        # Identify similar models
        print("Identifying similar models and extracting packages...")
        similar_pairs = group_similar_models(motorcycles)
        
        # Apply automatic corrections
        corrected_bikes, corrections_made = apply_package_corrections(motorcycles, similar_pairs)
        
        # Apply manual corrections
        print("Applying manual corrections...")
        corrected_bikes, manual_corrections = apply_manual_corrections(corrected_bikes, manual_corrections_file)
        
        # Save result
        save_motorcycle_data(corrected_bikes, args.output)
        print(f"Made {corrections_made} automatic and {manual_corrections} manual corrections")
        print(f"Saved corrected data to {args.output}")
    
    elif args.command == 'add-correction':
        add_manual_correction(
            manual_corrections_file, 
            args.year, 
            args.make, 
            args.model, 
            args.new_model, 
            args.package
        )
    
    elif args.command == 'apply-corrections':
        # Load data
        print(f"Loading data from {args.input}...")
        motorcycles = load_motorcycle_data(args.input)
        
        # Apply manual corrections
        corrected_bikes, corrections_made = apply_manual_corrections(motorcycles, manual_corrections_file)
        
        # Save result
        save_motorcycle_data(corrected_bikes, args.output)
        print(f"Applied {corrections_made} manual corrections")
        print(f"Saved corrected data to {args.output}")
    
    elif args.command == 'report':
        # Load data
        print(f"Loading data from {args.input}...")
        motorcycles = load_motorcycle_data(args.input)
        
        # Generate report
        generate_package_report(motorcycles, args.output)
        print(f"Generated package report at {args.output}")
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
