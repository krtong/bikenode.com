import csv
from pathlib import Path

def test_package_extraction():
    """
    Test the extraction of package information from the motorcycle data.
    Focus on the Aprilia Tuono 1000 R example.
    """
    # Sample data from the CSV
    sample_data = [
        ["2010", "Aprilia", "Tuono 1000 R", "R", "Naked bike", "998cc"],
        ["2010", "Aprilia", "Tuono 1000 R FACTORY", "", "Naked bike", "998cc"],
        ["2010", "Aprilia", "SX 50", "", "Super motard", "50cc"],
        ["2010", "Aprilia", "SXV 4.5", "", "Super motard", "452cc"],
        ["2010", "Harley-Davidson", "FLSTFB Sportster Fat Boy Special", "Special", "Custom/cruiser", "1584cc"],
        ["2010", "BMW", "S 1000 RR", "", "Sport", "999cc"]
    ]

    print("Testing package extraction with sample data...")
    print("=" * 50)
    
    # Display the sample data as it would be structured in our model
    for row in sample_data:
        year, make, model, package, bike_type, engine = row
        
        print(f"Original data:")
        print(f"  Year: {year}")
        print(f"  Make: {make}")
        print(f"  Model: {model}")
        print(f"  Package: {package}")
        print(f"  Type: {bike_type}")
        print(f"  Engine: {engine}")
        
        # Proposed corrected representation
        corrected_model = model
        corrected_package = package
        
        # Special handling for the Aprilia Tuono case
        if make == "Aprilia" and "Tuono" in model and "FACTORY" in model:
            corrected_model = "Tuono 1000 R" 
            corrected_package = "FACTORY"
        
        print(f"Corrected data:")
        print(f"  Model: {corrected_model}")
        print(f"  Package: {corrected_package}")
        print("-" * 50)

def scan_for_packages_in_model_names():
    """
    Scan through the motorcycle data to find model names that might contain package information.
    """
    base_dir = Path(__file__).parent
    input_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found at {input_file}")
        return
    
    potential_packages = set()
    models_with_potential_packages = []
    
    common_packages = [
        "Special", "R", "S", "GT", "Custom", "Sport", "Classic", "Deluxe", "LX",
        "LE", "Limited", "RS", "Factory", "Premium", "Base", "Touring", "Elite"
    ]
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            model = row.get('model', '').strip()
            package = row.get('package', '').strip()
            
            # Check if model name contains a common package name (as a word)
            for pkg in common_packages:
                if re.search(r'\b' + pkg + r'\b', model, re.IGNORECASE) and not package:
                    potential_packages.add(pkg)
                    models_with_potential_packages.append((row.get('year', ''), 
                                                         row.get('make', ''), 
                                                         model, pkg))
    
    print(f"Found {len(potential_packages)} potential packages in model names:")
    for pkg in sorted(potential_packages):
        print(f"  - {pkg}")
        
    print("\nExample models with potential packages in their names:")
    for year, make, model, pkg in models_with_potential_packages[:10]:
        print(f"  {year} {make} {model} - Potential package: {pkg}")

if __name__ == "__main__":
    test_package_extraction()
    # Uncomment to scan for packages in model names
    # scan_for_packages_in_model_names()
