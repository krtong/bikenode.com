import os
import sys

def main():
    """
    Set up both motorcycle and bicycle databases for the BikeRole Discord bot.
    This script will ensure that all necessary directories exist and the bicycle data is generated.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create necessary directories
    directories = [
        os.path.join(current_dir, "motorcycles"),
        os.path.join(current_dir, "bicycles"),
        os.path.join(current_dir, "processed")
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            print(f"Creating directory: {directory}")
            os.makedirs(directory, exist_ok=True)
    
    # Check if motorcycle files exist
    motorcycle_files = [
        os.path.join(current_dir, "motorcycles/Motorcycle_Makes_models_1894-1949.csv"),
        os.path.join(current_dir, "motorcycles/Motorcycle_Makes_models_1950-2025.csv")
    ]
    
    missing_files = [f for f in motorcycle_files if not os.path.exists(f)]
    if missing_files:
        print("⚠️  WARNING: The following motorcycle data files are missing:")
        for f in missing_files:
            print(f"   - {f}")
        print("\nPlease ensure these files are present before running the bot.")
    else:
        print("✅ Motorcycle data files found.")
    
    # Generate bicycle data if needed
    bicycle_data_file = os.path.join(current_dir, "bicycles/Bicycle_Makes_models.csv")
    if not os.path.exists(bicycle_data_file):
        print("Bicycle data file not found. Generating...")
        try:
            from generate_bicycle_data import generate_bicycle_data
            generate_bicycle_data()
            print("✅ Bicycle data generated successfully.")
        except Exception as e:
            print(f"❌ Error generating bicycle data: {e}")
            return
    else:
        print("✅ Bicycle data file found.")
    
    print("\nSetting up database...")
    try:
        # Test loading the extended database
        from bike_lookup_extended import ExtendedBikeDatabase
        db = ExtendedBikeDatabase()
        
        # Print stats
        print(f"\n✅ Database loaded successfully!")
        print(f"📊 Motorcycles: {len(db.vehicles['motorcycle']['makes'])} makes, {len(db.vehicles['motorcycle']['models'])} models")
        print(f"🚲 Bicycles: {len(db.vehicles['bicycle']['makes'])} makes, {len(db.vehicles['bicycle']['models'])} models")
        
        # Sample searches
        print("\nTesting search functionality...")
        
        # Motorcycle search example
        moto_results = db.search("harley davidson", "motorcycle")
        print(f"  - Found {len(moto_results)} motorcycles for 'harley davidson'")
        if moto_results:
            sample = moto_results[0]
            print(f"    Sample: {sample['year']} {sample['make']} {sample['model']}")
        
        # Bicycle search example
        bike_results = db.search("trek madone", "bicycle")
        print(f"  - Found {len(bike_results)} bicycles for 'trek madone'")
        if bike_results:
            sample = bike_results[0]
            print(f"    Sample: {sample['year']} {sample['make']} {sample['model']} {sample['package']}")
            
        print("\nDatabase setup complete! You can now run the Discord bot.")
        print("Use 'python enhanced_discord_bot_with_bicycles.py' to start the bot.")
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return

if __name__ == "__main__":
    main()
