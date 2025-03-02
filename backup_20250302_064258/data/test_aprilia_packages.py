import csv
from pathlib import Path

def test_package_extraction():
    """
    Specific test for Aprilia Tuono models to verify package extraction.
    """
    # Sample data representing Aprilia Tuono models
    sample_data = [
        ["2010", "Aprilia", "Tuono 1000 R", "R", "Naked bike", "998cc"],
        ["2010", "Aprilia", "Tuono 1000 R FACTORY", "", "Naked bike", "998cc"],
        ["2011", "Aprilia", "Tuono 1000 R", "R", "Naked bike", "998cc"],
        ["2011", "Aprilia", "Tuono V4 APRC", "", "Naked bike", "1077cc"],
        ["2012", "Aprilia", "Tuono V4 R APRC", "", "Naked bike", "1077cc"],
        ["2014", "Aprilia", "Tuono V4 R ABS", "", "Naked bike", "1077cc"],
    ]

    print("Testing package extraction for Aprilia Tuono models...")
    print("=" * 70)
    
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
        
        # Apply our correction logic
        corrected_model = model
        corrected_package = package
        
        # Logic for Tuono 1000 R FACTORY
        if "FACTORY" in model and not package:
            corrected_model = "Tuono 1000 R"
            corrected_package = "FACTORY"
        
        # Logic for extracting APRC as a package
        if "APRC" in model and not "APRC" in corrected_package:
            if corrected_package:
                corrected_package += " APRC"
            else:
                corrected_package = "APRC"
            corrected_model = corrected_model.replace(" APRC", "")
        
        # Logic for extracting ABS as a package
        if "ABS" in model and not "ABS" in corrected_package:
            if corrected_package:
                corrected_package += " ABS"
            else:
                corrected_package = "ABS"
            corrected_model = corrected_model.replace(" ABS", "")
            
        print(f"Corrected data:")
        print(f"  Model: {corrected_model}")
        print(f"  Package: {corrected_package}")
        print("-" * 70)

def extract_common_package_patterns():
    """
    Analyze motorcycle data to identify common patterns where 
    packages might be embedded in model names.
    """
    base_dir = Path(__file__).parent
    input_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found at {input_file}")
        return
    
    # Common suffixes that might indicate packages
    potential_package_suffixes = [
        "Special", "Limited", "Anniversary", "Edition", "Premium",
        "Sport", "Touring", "Classic", "Custom", "Deluxe", "Elite",
        "Pro", "Racing", "R", "S", "RS", "GT", "LX", "ABS", "FACTORY"
    ]
    
    # Count models with these suffixes
    suffix_counts = {suffix: [] for suffix in potential_package_suffixes}
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            model = row.get('Model', '').strip()
            package = row.get('Package', '').strip()
            make = row.get('Make', '').strip()
            year = row.get('Year', '').strip()
            
            # Check for each potential package suffix in the model name
            for suffix in potential_package_suffixes:
                if model.endswith(f" {suffix}") and not package:
                    key = f"{year} {make} {model}"
                    suffix_counts[suffix].append(key)
    
    # Report results
    print("\nPotential package suffixes found in model names (without package field):")
    for suffix, models in sorted(suffix_counts.items(), key=lambda x: len(x[1]), reverse=True):
        if models:
            print(f"  {suffix}: {len(models)} models")
            # Print a few examples
            for example in models[:3]:
                print(f"    - {example}")
            if len(models) > 3:
                print(f"    - ... and {len(models)-3} more")

if __name__ == "__main__":
    test_package_extraction()
    extract_common_package_patterns()
