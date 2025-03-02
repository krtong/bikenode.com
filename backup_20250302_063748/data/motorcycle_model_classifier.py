from model_similarity import analyze_model_similarity
import csv
from collections import defaultdict

def load_motorcycle_data(file_path):
    """Load motorcycle data from CSV file"""
    motorcycles = []
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            motorcycles.append({
                'Year': int(row['Year']),
                'Make': row['Make'],
                'Model': row['Model'],
                'Category': row['Category'],
                'Engine': row['Engine']
            })
    return motorcycles

def classify_models(motorcycles):
    """Group models into base models and their variants"""
    makes = defaultdict(list)
    
    # First, group by manufacturer
    for bike in motorcycles:
        makes[bike['Make']].append(bike)
    
    # For each manufacturer, group models
    manufacturer_model_groups = {}
    for make, bikes in makes.items():
        model_groups = defaultdict(list)
        processed_models = set()
        
        # Sort bikes by model name to help with grouping
        bikes.sort(key=lambda x: x['Model'])
        
        for i, bike in enumerate(bikes):
            if bike['Model'] in processed_models:
                continue
                
            # This becomes a new group
            model_key = bike['Model']
            model_group = [bike]
            processed_models.add(bike['Model'])
            
            # Compare with all other unprocessed models
            for j in range(i+1, len(bikes)):
                if bikes[j]['Model'] not in processed_models:
                    result = analyze_model_similarity(bike['Model'], bikes[j]['Model'])
                    # If they're similar enough, add to the same group
                    if result['base_model_match'] and len(result['common_part']) >= 4:
                        model_group.append(bikes[j])
                        processed_models.add(bikes[j]['Model'])
            
            model_groups[model_key] = model_group
        
        manufacturer_model_groups[make] = model_groups
    
    return manufacturer_model_groups

def generate_model_report(file_path):
    """Generate a report of motorcycle models grouped by similarity"""
    motorcycles = load_motorcycle_data(file_path)
    model_groups = classify_models(motorcycles)
    
    report = []
    for make, models in model_groups.items():
        make_report = f"Manufacturer: {make}\n"
        make_report += "=" * 50 + "\n"
        
        for base_model, variants in models.items():
            if len(variants) > 1:  # Only show groups with variants
                make_report += f"Base Model: {base_model}\n"
                make_report += "Variants:\n"
                for variant in variants:
                    make_report += f"  - {variant['Year']} {variant['Model']} ({variant['Engine']})\n"
                make_report += "-" * 40 + "\n"
        
        report.append(make_report)
    
    return "\n".join(report)

if __name__ == "__main__":
    report = generate_model_report("motorcycles/Motorcycle_Makes_models_1950-2025.csv")
    
    # Print the first part of the report
    print(report[:5000])
    
    # Optionally save to file
    with open("motorcycle_model_report.txt", "w") as f:
        f.write(report)
