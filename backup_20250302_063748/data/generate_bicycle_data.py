import csv
import os

def generate_bicycle_data():
    """
    Generate a CSV file with bicycle data in the correct format for the bike database.
    This creates a more extensive dataset than the mock_data.py script.
    """
    output_file = os.path.join(os.path.dirname(__file__), 'bicycles/Bicycle_Makes_models.csv')
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # More comprehensive bicycle data with major brands and their popular models
    data = []
    
    # Trek
    trek_models = {
        'Madone': {'category': 'Road', 'packages': ['SLR 9', 'SLR 7', 'SL 6', 'SL 5']},
        'Emonda': {'category': 'Road', 'packages': ['SLR 9', 'SLR 7', 'SL 6', 'SL 5']},
        'Domane': {'category': 'Road', 'packages': ['SLR 9', 'SLR 7', 'SL 6', 'SL 5', 'AL 5']},
        'Fuel EX': {'category': 'MTB', 'packages': ['9.9 XTR', '9.8 XT', '8 XT', '7', '5']},
        'Slash': {'category': 'MTB', 'packages': ['9.9 XTR', '9.8 XT', '8', '7']},
        'Checkpoint': {'category': 'Gravel', 'packages': ['SLR 9', 'SLR 7', 'SLR 6', 'SL 6', 'SL 5']},
        'Farley': {'category': 'Fat Bike', 'packages': ['9.8', '7', '5']},
        'Supercaliber': {'category': 'MTB XC', 'packages': ['9.9', '9.8', '9.7']}
    }
    
    # Specialized
    specialized_models = {
        'Tarmac': {'category': 'Road', 'packages': ['SL7 Pro', 'SL7 Expert', 'SL7 Comp', 'SL6 Sport']},
        'Roubaix': {'category': 'Road', 'packages': ['Pro', 'Expert', 'Comp', 'Sport']},
        'Stumpjumper': {'category': 'MTB', 'packages': ['Pro', 'Expert', 'Comp', 'Alloy']},
        'Epic': {'category': 'MTB XC', 'packages': ['Pro', 'Expert', 'Comp', 'Evo']},
        'Diverge': {'category': 'Gravel', 'packages': ['Pro', 'Expert', 'Comp', 'Sport', 'Base']},
        'Enduro': {'category': 'MTB', 'packages': ['Pro', 'Expert', 'Comp', 'Elite']}
    }
    
    # Cannondale
    cannondale_models = {
        'SuperSix EVO': {'category': 'Road', 'packages': ['Hi-Mod Dura Ace', 'Hi-Mod Ultegra Di2', 'Carbon Ultegra']},
        'Synapse': {'category': 'Road', 'packages': ['Carbon 3', 'Carbon 2', 'Carbon 1', 'Alloy']},
        'Topstone': {'category': 'Gravel', 'packages': ['Carbon Lefty 1', 'Carbon Lefty 3', 'Carbon 105']},
        'Scalpel': {'category': 'MTB XC', 'packages': ['Hi-Mod 1', 'Carbon 2', 'Carbon 3']},
        'Habit': {'category': 'MTB', 'packages': ['Carbon 1', 'Carbon 2', 'Carbon 3']}
    }
    
    # Giant
    giant_models = {
        'TCR Advanced': {'category': 'Road', 'packages': ['SL 0 Disc', 'Pro 0 Disc', 'Pro 1 Disc']},
        'Defy Advanced': {'category': 'Road', 'packages': ['Pro 1', 'Pro 2', 'Pro 3']},
        'Revolt Advanced': {'category': 'Gravel', 'packages': ['Pro 0', 'Pro 1', 'Pro 2']},
        'Trance X Advanced': {'category': 'MTB', 'packages': ['Pro 0', 'Pro 1', '29 1']},
        'Anthem Advanced': {'category': 'MTB XC', 'packages': ['Pro 0', 'Pro 1', '29 1']}
    }
    
    # Santa Cruz
    santa_cruz_models = {
        'Hightower': {'category': 'MTB', 'packages': ['CC XX1 AXS RSV', 'CC X01 Reserve', 'C S']},
        'Bronson': {'category': 'MTB', 'packages': ['CC XX1 AXS RSV', 'CC X01 Reserve', 'C S']},
        'Tallboy': {'category': 'MTB', 'packages': ['CC XX1 AXS RSV', 'CC X01 Reserve', 'C S']},
        'Blur': {'category': 'MTB XC', 'packages': ['CC XX1 AXS RSV', 'CC X01 TR Reserve', 'C TR S']},
        'Stigmata': {'category': 'Gravel', 'packages': ['CC Force AXS RSV', 'CC Rival', 'C GRX']}
    }
    
    # Cervelo
    cervelo_models = {
        'R5': {'category': 'Road', 'packages': ['Dura Ace Di2', 'Red eTAP AXS', 'Ultegra Di2']},
        'S5': {'category': 'Road', 'packages': ['Dura Ace Di2', 'Red eTAP AXS', 'Ultegra Di2']},
        'Caledonia': {'category': 'Road', 'packages': ['Dura Ace Di2', 'Ultegra Di2', 'Ultegra']},
        'Aspero': {'category': 'Gravel', 'packages': ['GRX Di2', 'Force eTAP AXS 1', 'GRX 810']},
        'P5': {'category': 'Triathlon', 'packages': ['Dura Ace Di2', 'Ultegra Di2', 'Disc']}
    }
    
    # BMC
    bmc_models = {
        'Teammachine SLR': {'category': 'Road', 'packages': ['01 ONE', '01 TWO', '01 THREE', '01 FOUR']},
        'Roadmachine': {'category': 'Road', 'packages': ['01 ONE', '01 TWO', '01 THREE', '01 FOUR']},
        'Timemachine Road': {'category': 'Road', 'packages': ['01 ONE', '01 TWO', '01 THREE']},
        'Agonist': {'category': 'MTB XC', 'packages': ['01 ONE', '01 TWO', '02 ONE']},
        'Fourstroke': {'category': 'MTB XC', 'packages': ['01 LT ONE', '01 ONE', '01 TWO']}
    }
    
    # Generate data rows for each manufacturer, model, package combination
    years = ['2021', '2022', '2023']
    frame_materials = {'Carbon': ['Carbon', 'Carbon Fiber', 'Carbon Composite'], 'Aluminum': ['Aluminum', 'Alloy']}
    
    # Function to generate rows for a brand's models
    def generate_rows_for_brand(brand, model_dict):
        rows = []
        for model, details in model_dict.items():
            category = details['category']
            for package in details['packages']:
                # Determine frame material based on package name (higher packages typically use carbon)
                frame_material = 'Carbon'
                if any(term in package.lower() for term in ['alloy', 'aluminum', 'al']):
                    frame_material = 'Aluminum'
                
                for year in years:
                    # Create a row for each year, model, package combination
                    rows.append([year, brand, model, category, package, frame_material])
        return rows
    
    # Generate rows for each manufacturer
    data.extend(generate_rows_for_brand('Trek', trek_models))
    data.extend(generate_rows_for_brand('Specialized', specialized_models))
    data.extend(generate_rows_for_brand('Cannondale', cannondale_models))
    data.extend(generate_rows_for_brand('Giant', giant_models))
    data.extend(generate_rows_for_brand('Santa Cruz', santa_cruz_models))
    data.extend(generate_rows_for_brand('Cervelo', cervelo_models))
    data.extend(generate_rows_for_brand('BMC', bmc_models))
    
    # Write the data to CSV
    with open(output_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        # Write header
        writer.writerow(['Year', 'Make', 'Model', 'Category', 'Package', 'Frame'])
        # Write data rows
        writer.writerows(data)
    
    print(f"Generated bicycle data at {output_file} with {len(data)} entries")
    
if __name__ == "__main__":
    generate_bicycle_data()