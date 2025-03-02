import csv
import os

def create_mock_bicycle_data():
    """Create mock bicycle data CSV for development and testing."""
    # Define the file path
    file_path = os.path.join(os.path.dirname(__file__), 'Bicycle_Makes_models.csv')
    
    # Sample data of popular bicycles with their packages
    data = [
        # Year, Make, Model, Category, Package, Frame
        ["2022", "Trek", "Madone", "Road", "SLR 9", "Carbon"],
        ["2022", "Trek", "Madone", "Road", "SLR 7", "Carbon"],
        ["2022", "Trek", "Madone", "Road", "SL 6", "Carbon"],
        ["2021", "Trek", "Madone", "Road", "SLR 9", "Carbon"],
        ["2021", "Trek", "Madone", "Road", "SLR 7", "Carbon"],
        ["2021", "Trek", "Madone", "Road", "SL 6", "Carbon"],
        ["2022", "Trek", "Fuel EX", "MTB", "9.9 XTR", "Carbon"],
        ["2022", "Trek", "Fuel EX", "MTB", "9.8 XT", "Carbon"],
        ["2022", "Trek", "Fuel EX", "MTB", "8 XT", "Aluminum"],
        ["2022", "Trek", "Fuel EX", "MTB", "7", "Aluminum"],
        ["2021", "Trek", "Fuel EX", "MTB", "9.9 XTR", "Carbon"],
        ["2021", "Trek", "Fuel EX", "MTB", "9.8 XT", "Carbon"],
        
        ["2022", "Specialized", "Tarmac", "Road", "SL7 Pro", "Carbon"],
        ["2022", "Specialized", "Tarmac", "Road", "SL7 Expert", "Carbon"],
        ["2022", "Specialized", "Tarmac", "Road", "SL7 Comp", "Carbon"],
        ["2021", "Specialized", "Tarmac", "Road", "SL7 Pro", "Carbon"],
        ["2021", "Specialized", "Tarmac", "Road", "SL7 Expert", "Carbon"],
        ["2022", "Specialized", "Stumpjumper", "MTB", "Pro", "Carbon"],
        ["2022", "Specialized", "Stumpjumper", "MTB", "Expert", "Carbon"],
        ["2022", "Specialized", "Stumpjumper", "MTB", "Comp", "Aluminum"],
        ["2021", "Specialized", "Stumpjumper", "MTB", "Pro", "Carbon"],
        
        ["2022", "Cannondale", "SuperSix EVO", "Road", "Hi-Mod Dura Ace", "Carbon"],
        ["2022", "Cannondale", "SuperSix EVO", "Road", "Hi-Mod Ultegra Di2", "Carbon"],
        ["2022", "Cannondale", "SuperSix EVO", "Road", "Carbon Ultegra", "Carbon"],
        ["2022", "Cannondale", "Synapse", "Road", "Carbon 3", "Carbon"],
        ["2022", "Cannondale", "Synapse", "Road", "Carbon 2", "Carbon"],
        ["2022", "Cannondale", "Synapse", "Road", "Carbon 1", "Carbon"],
        ["2022", "Cannondale", "Topstone", "Gravel", "Carbon Lefty 1", "Carbon"],
        ["2022", "Cannondale", "Topstone", "Gravel", "Carbon Lefty 3", "Carbon"],
        ["2022", "Cannondale", "Topstone", "Gravel", "Carbon 105", "Carbon"],
        
        ["2022", "Giant", "TCR Advanced", "Road", "SL 0 Disc", "Carbon"],
        ["2022", "Giant", "TCR Advanced", "Road", "Pro 0 Disc", "Carbon"],
        ["2022", "Giant", "TCR Advanced", "Road", "Pro 1 Disc", "Carbon"],
        ["2022", "Giant", "Defy Advanced", "Road", "Pro 1", "Carbon"],
        ["2022", "Giant", "Defy Advanced", "Road", "Pro 2", "Carbon"],
        ["2022", "Giant", "Defy Advanced", "Road", "Pro 3", "Carbon"],
        ["2022", "Giant", "Revolt Advanced", "Gravel", "Pro 0", "Carbon"],
        ["2022", "Giant", "Revolt Advanced", "Gravel", "Pro 1", "Carbon"],
        ["2022", "Giant", "Revolt Advanced", "Gravel", "2", "Carbon"],
        
        ["2022", "Santa Cruz", "Hightower", "MTB", "CC XX1 AXS RSV", "Carbon"],
        ["2022", "Santa Cruz", "Hightower", "MTB", "CC X01 Reserve", "Carbon"],
        ["2022", "Santa Cruz", "Hightower", "MTB", "C S", "Carbon"],
        ["2021", "Santa Cruz", "Hightower", "MTB", "CC XX1 AXS RSV", "Carbon"],
        ["2022", "Santa Cruz", "Bronson", "MTB", "CC XX1 AXS RSV", "Carbon"],
        ["2022", "Santa Cruz", "Bronson", "MTB", "CC X01 Reserve", "Carbon"],
        ["2022", "Santa Cruz", "Bronson", "MTB", "C S", "Carbon"],
        
        ["2022", "Cervelo", "R5", "Road", "Dura Ace Di2", "Carbon"],
        ["2022", "Cervelo", "R5", "Road", "Red eTAP AXS", "Carbon"],
        ["2022", "Cervelo", "R5", "Road", "Ultegra Di2", "Carbon"],
        ["2021", "Cervelo", "R5", "Road", "Dura Ace Di2", "Carbon"],
        ["2022", "Cervelo", "Aspero", "Gravel", "GRX Di2", "Carbon"],
        ["2022", "Cervelo", "Aspero", "Gravel", "Force eTAP AXS 1", "Carbon"],
        ["2022", "Cervelo", "Aspero", "Gravel", "GRX 810", "Carbon"],
        
        ["2022", "BMC", "Teammachine SLR", "Road", "01 ONE", "Carbon"],
        ["2022", "BMC", "Teammachine SLR", "Road", "01 TWO", "Carbon"],
        ["2022", "BMC", "Teammachine SLR", "Road", "01 THREE", "Carbon"],
        ["2022", "BMC", "Teammachine SLR", "Road", "01 FOUR", "Carbon"],
    ]
    
    # Write the data to CSV
    with open(file_path, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        # Write header
        writer.writerow(['Year', 'Make', 'Model', 'Category', 'Package', 'Frame'])
        # Write data rows
        writer.writerows(data)
    
    print(f"Created mock bicycle data at {file_path} with {len(data)} entries")
    
if __name__ == "__main__":
    create_mock_bicycle_data()
