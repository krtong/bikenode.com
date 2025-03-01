import os
import pandas as pd
import glob

def combine_motorcycle_data(data_dir='./data', output_file='motorcycle_database.xlsx'):
    """
    Combine all motorcycle data files into a single Excel spreadsheet with columns:
    year | make | model | category | engine
    """
    # Get all files matching the pattern YYYY_motorcycles
    files = glob.glob(os.path.join(data_dir, '*_motorcycles'))
    
    # Sort files by year
    files.sort()
    
    # Create an empty list to hold all dataframes
    all_dfs = []
    
    print(f"Found {len(files)} files to process...")
    
    # Process each file
    for file_path in files:
        # Extract year from filename
        year = os.path.basename(file_path).split('_')[0]
        
        try:
            # Read the file as TSV
            df = pd.read_csv(file_path, sep='\t')
            
            # Fix column names (first column has year in it)
            column_names = df.columns.tolist()
            column_names[0] = "Full_Model_Name"  # Temporary name
            df.columns = column_names
            
            # Split make and model
            df['Make'] = df['Full_Model_Name'].apply(lambda x: x.split(' ')[0])
            df['Model'] = df['Full_Model_Name'].apply(lambda x: ' '.join(x.split(' ')[1:]))
            
            # Add year column
            df['Year'] = year
            
            # Select and reorder columns
            df = df[['Year', 'Make', 'Model', 'Category', 'Engine']]
            
            # Append to our list
            all_dfs.append(df)
            
            print(f"Processed data for year {year} - found {len(df)} models")
            
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    if not all_dfs:
        print("No data was loaded. Check file paths and formats.")
        return
    
    # Combine all dataframes
    combined_df = pd.concat(all_dfs, ignore_index=True)
    
    print(f"Combined data: {len(combined_df)} total motorcycle models")
    
    # Save to Excel
    combined_df.to_excel(output_file, index=False)
    print(f"Data saved to {output_file}")

if __name__ == "__main__":
    combine_motorcycle_data()