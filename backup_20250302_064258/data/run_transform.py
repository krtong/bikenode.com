import csv
import os
from transform_motorcycle_data import transform_motorcycle_data
from pathlib import Path

def show_sample_results():
    """
    Run the transformation and show a sample of the results.
    """
    print("Starting motorcycle data transformation...")
    success = transform_motorcycle_data()
    
    if not success:
        print("Transformation failed. Check the error messages above.")
        return
    
    # Path to the transformed data
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    output_file = base_dir / "motorcycles/Motorcycle_Transformed_Data.csv"
    
    if not output_file.exists():
        print(f"Error: Output file not found at {output_file}")
        return
    
    # Read and show a sample of the transformed data
    print("\n=== SAMPLE OF TRANSFORMED DATA ===\n")
    
    with open(output_file, 'r', encoding='utf-8') as file:
        csv_reader = csv.reader(file)
        
        # Get the header
        header = next(csv_reader)
        print(" | ".join(header))
        print("-" * 80)
        
        # Show 10 rows from early motorcycles
        print("\nEarly Motorcycles (1894-1949):")
        file.seek(0)  # Reset file pointer
        next(csv_reader)  # Skip header
        
        early_count = 0
        for row in csv_reader:
            year = int(row[0]) if row[0].isdigit() else 0
            if year < 1950 and early_count < 5:
                print(" | ".join(row))
                early_count += 1
            if early_count >= 5 and year >= 1950:
                break
                
        # Show 10 rows from modern motorcycles
        print("\nModern Motorcycles (1950-2025):")
        file.seek(0)  # Reset file pointer
        next(csv_reader)  # Skip header
        
        modern_count = 0
        for row in csv_reader:
            year = int(row[0]) if row[0].isdigit() else 0
            if year >= 1950 and modern_count < 5:
                print(" | ".join(row))
                modern_count += 1
            if modern_count >= 5:
                break
    
    # Show statistics
    with open(output_file, 'r', encoding='utf-8') as file:
        csv_reader = csv.reader(file)
        next(csv_reader)  # Skip header
        
        total_rows = sum(1 for _ in csv_reader)
    
    print(f"\nTotal records in transformed data: {total_rows}")
    print(f"File saved at: {output_file}")
    print("\nTransformation completed successfully!")

if __name__ == "__main__":
    show_sample_results()
