import csv
import os

def separate_model_package(input_file, output_file):
    """
    Process a CSV file to separate model names into 'Model' and 'Package' columns based on common prefixes.
    
    Args:
        input_file (str): Path to the input CSV file.
        output_file (str): Path to the output CSV file.
    """
    # Step 1: Read the input CSV into a list of dictionaries
    with open(input_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # Ensure required fields exist
        required_fields = {'Year', 'Make', 'Model'}
        if not required_fields.issubset(reader.fieldnames):
            raise ValueError(f"Input CSV must contain {required_fields} columns")
        
        # Store fieldnames for later use
        all_fieldnames = list(reader.fieldnames)
        rows = list(reader)
    
    # Add 'Package' to fieldnames if it's not already present
    if 'Package' not in all_fieldnames:
        all_fieldnames.append('Package')
    
    processed_rows = []
    i = 0
    
    # Step 2: Group rows by Year and Make
    while i < len(rows):
        current_year = rows[i]['Year']
        current_make = rows[i]['Make']
        group = []
        # Collect all consecutive rows with the same Year and Make
        while (i < len(rows) and 
               rows[i]['Year'] == current_year and 
               rows[i]['Make'] == current_make):
            group.append(rows[i])
            i += 1
        
        # Step 3: Process each group
        if group:
            # Sort rows by Model to ensure consistent subgrouping
            group.sort(key=lambda x: x['Model'])
            
            # Step 4: Find subgroups within the group based on common prefixes
            current_subgroup = [group[0]]
            current_prefix = group[0]['Model']
            
            for row in group[1:]:
                # Compute the common prefix between the current prefix and the next model
                temp_prefix = os.path.commonprefix([current_prefix, row['Model']])
                # Require the common prefix to have at least two tokens (i.e., one space)
                if len(temp_prefix.split()) >= 2:
                    current_subgroup.append(row)
                    current_prefix = temp_prefix
                else:
                    # Process the completed subgroup
                    process_subgroup(current_subgroup)
                    processed_rows.extend(current_subgroup)
                    # Start a new subgroup
                    current_subgroup = [row]
                    current_prefix = row['Model']
            
            # Process the last subgroup
            if current_subgroup:
                process_subgroup(current_subgroup)
                processed_rows.extend(current_subgroup)
    
    # Step 5: Write the processed rows to the output CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=all_fieldnames)
        writer.writeheader()
        
        # Remove the temporary 'OriginalModel' field before writing
        for row in processed_rows:
            row.pop('OriginalModel', None)
            
            # Ensure all row keys are in fieldnames to prevent errors
            for key in list(row.keys()):
                if key not in all_fieldnames:
                    row.pop(key)
            
            writer.writerow(row)

def process_subgroup(subgroup):
    """
    Process a subgroup of rows to assign Model and Package based on their common prefix.
    
    Args:
        subgroup (list): List of row dictionaries to process.
    """
    # Store the original model name for package extraction
    for row in subgroup:
        row['OriginalModel'] = row['Model']
    
    # Find the common prefix among all models in the subgroup
    final_common_prefix = os.path.commonprefix([r['Model'] for r in subgroup])
    
    # Ensure the common prefix ends at a word boundary (space)
    if final_common_prefix and not final_common_prefix.endswith(' '):
        # Find the last space in the common prefix
        last_space_pos = final_common_prefix.rfind(' ')
        if last_space_pos != -1:
            final_common_prefix = final_common_prefix[:last_space_pos + 1]
    
    # Assign the common prefix as the Model and the remainder as the Package
    for row in subgroup:
        row['Model'] = final_common_prefix.strip()
        row['Package'] = row['OriginalModel'][len(final_common_prefix):].strip()

if __name__ == "__main__":
    # Check for CSV files in the data directory
    base_dir = "/Users/kevintong/Documents/Code/bikenode.com/data"
    transformed_dir = os.path.join(base_dir, "transformed")
    
    # Create transformed directory if it doesn't exist
    if not os.path.exists(transformed_dir):
        os.makedirs(transformed_dir)
        print(f"Created directory: {transformed_dir}")
    
    # Look for potential input files
    csv_files = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".csv") and "Motorcycle" in file:
                csv_files.append(os.path.join(root, file))
    
    if not csv_files:
        print("Error: No motorcycle CSV files found in the data directory.")
        exit(1)
    
    # Use the first found CSV file as input
    input_file = csv_files[0]
    output_file = os.path.join(transformed_dir, "Motorcycle_Transformed_Data_fixed.csv")
    
    print(f"Using input file: {input_file}")
    print(f"Output will be saved to: {output_file}")
    
    try:
        separate_model_package(input_file, output_file)
        print(f"Successfully processed {input_file} into {output_file}")
    except Exception as e:
        print(f"Error: {e}")
