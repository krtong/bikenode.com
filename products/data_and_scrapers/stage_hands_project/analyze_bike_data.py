import json
import os
import re
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt

class BikeDataAnalyzer:
    """
    Analyzer for bike data scraped from 99spokes.com
    """
    
    def __init__(self, data_file=None):
        self.data_file = data_file
        self.bikes = []
        self.output_dir = os.path.join(os.path.dirname(__file__), 'analysis')
        
        # Create output directory if it doesn't exist
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
        # Load data if file is provided
        if data_file:
            self.load_data(data_file)
    
    def load_data(self, data_file):
        """Load bike data from a JSON file"""
        print(f"Loading data from {data_file}...")
        with open(data_file, 'r', encoding='utf-8') as f:
            self.bikes = json.load(f)
        print(f"Loaded {len(self.bikes)} bikes")
    
    def clean_data(self):
        """Clean and normalize the bike data"""
        print("Cleaning and normalizing bike data...")
        
        for bike in self.bikes:
            # Clean brand and model
            if 'brand' in bike:
                bike['brand'] = re.sub(r'^\d{4}', '', bike['brand'])  # Remove year prefix
                bike['brand'] = bike['brand'].strip()
            
            # Extract weight as a number
            if 'specs' in bike and 'Weight' in bike['specs']:
                weight_str = bike['specs']['Weight']
                weight_match = re.search(r'(\d+\.?\d*)\s*lbs', weight_str)
                if weight_match:
                    bike['weight_lbs'] = float(weight_match.group(1))
            
            # Extract wheel size
            if 'specs' in bike and 'Wheels' in bike['specs']:
                wheels_str = bike['specs']['Wheels']
                wheel_match = re.search(r'(\d+\.?\d*)\\u2033', wheels_str)
                if wheel_match:
                    bike['wheel_size'] = float(wheel_match.group(1))
            
            # Extract suspension type
            if 'specs' in bike and 'Suspension' in bike['specs']:
                suspension_str = bike['specs']['Suspension']
                if 'Full' in suspension_str:
                    bike['suspension_type'] = 'Full'
                elif 'Hardtail' in suspension_str:
                    bike['suspension_type'] = 'Hardtail'
                else:
                    bike['suspension_type'] = 'Rigid'
            
            # Extract price if available
            if 'price' in bike:
                price_str = bike['price']
                price_match = re.search(r'\$(\d+,?\d*)', price_str)
                if price_match:
                    bike['price_usd'] = float(price_match.group(1).replace(',', ''))
        
        print("Data cleaning complete")
    
    def generate_summary(self):
        """Generate a summary of the bike data"""
        print("Generating bike data summary...")
        
        # Count bikes by brand
        brands = {}
        for bike in self.bikes:
            brand = bike.get('brand', 'Unknown')
            brands[brand] = brands.get(brand, 0) + 1
        
        # Count bikes by suspension type
        suspension_types = {}
        for bike in self.bikes:
            suspension = bike.get('suspension_type', 'Unknown')
            suspension_types[suspension] = suspension_types.get(suspension, 0) + 1
        
        # Calculate average weight
        weights = [bike.get('weight_lbs') for bike in self.bikes if 'weight_lbs' in bike]
        avg_weight = sum(weights) / len(weights) if weights else 0
        
        # Calculate price statistics
        prices = [bike.get('price_usd') for bike in self.bikes if 'price_usd' in bike]
        avg_price = sum(prices) / len(prices) if prices else 0
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0
        
        summary = {
            'total_bikes': len(self.bikes),
            'brands': brands,
            'suspension_types': suspension_types,
            'average_weight_lbs': avg_weight,
            'price_statistics': {
                'average_price_usd': avg_price,
                'min_price_usd': min_price,
                'max_price_usd': max_price
            }
        }
        
        # Save summary to file
        summary_file = os.path.join(self.output_dir, 'bike_data_summary.json')
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        
        print(f"Summary saved to {summary_file}")
        return summary
    
    def create_dataframe(self):
        """Create a pandas DataFrame from the bike data"""
        # Extract relevant fields for each bike
        data = []
        for bike in self.bikes:
            row = {
                'brand': bike.get('brand', 'Unknown'),
                'model': bike.get('model', 'Unknown'),
                'year': bike.get('year', 'Unknown'),
                'weight_lbs': bike.get('weight_lbs', None),
                'wheel_size': bike.get('wheel_size', None),
                'suspension_type': bike.get('suspension_type', 'Unknown'),
                'price_usd': bike.get('price_usd', None)
            }
            
            # Add specs if available
            if 'specs' in bike:
                for key, value in bike['specs'].items():
                    row[f'spec_{key}'] = value
            
            data.append(row)
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Save to CSV
        csv_file = os.path.join(self.output_dir, 'bike_data.csv')
        df.to_csv(csv_file, index=False)
        print(f"DataFrame saved to {csv_file}")
        
        return df
    
    def generate_visualizations(self, df=None):
        """Generate visualizations from the bike data"""
        if df is None:
            df = self.create_dataframe()
        
        print("Generating visualizations...")
        
        # 1. Brand distribution pie chart
        plt.figure(figsize=(10, 6))
        brand_counts = df['brand'].value_counts()
        if len(brand_counts) > 0:
            brand_counts.plot(kind='pie', autopct='%1.1f%%')
            plt.title('Bike Distribution by Brand')
            plt.ylabel('')
        else:
            plt.text(0.5, 0.5, 'No brand data available', 
                    horizontalalignment='center', verticalalignment='center')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'brand_distribution.png'))
        plt.close()
        
        # 2. Suspension type distribution
        plt.figure(figsize=(10, 6))
        if 'suspension_type' in df.columns:
            suspension_counts = df['suspension_type'].value_counts()
            if len(suspension_counts) > 0:
                suspension_counts.plot(kind='bar')
                plt.title('Bike Distribution by Suspension Type')
                plt.xlabel('Suspension Type')
                plt.ylabel('Count')
            else:
                plt.text(0.5, 0.5, 'No suspension type data available', 
                        horizontalalignment='center', verticalalignment='center')
        else:
            plt.text(0.5, 0.5, 'No suspension type data available', 
                    horizontalalignment='center', verticalalignment='center')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'suspension_distribution.png'))
        plt.close()
        
        # 3. Weight distribution histogram
        plt.figure(figsize=(10, 6))
        weights = df['weight_lbs'].dropna()
        if len(weights) > 0:
            weights.plot(kind='hist', bins=10)
            plt.title('Bike Weight Distribution')
            plt.xlabel('Weight (lbs)')
            plt.ylabel('Count')
        else:
            plt.text(0.5, 0.5, 'No weight data available', 
                    horizontalalignment='center', verticalalignment='center')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'weight_distribution.png'))
        plt.close()
        
        # 4. Price vs Weight scatter plot
        plt.figure(figsize=(10, 6))
        # Filter for rows that have both weight and price data
        df_filtered = df.dropna(subset=['weight_lbs', 'price_usd'])
        if len(df_filtered) > 0:
            plt.scatter(df_filtered['weight_lbs'], df_filtered['price_usd'])
            plt.title('Price vs Weight')
            plt.xlabel('Weight (lbs)')
            plt.ylabel('Price (USD)')
        else:
            plt.text(0.5, 0.5, 'Insufficient data for scatter plot', 
                    horizontalalignment='center', verticalalignment='center')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'price_vs_weight.png'))
        plt.close()
        
        print("Visualizations saved to the analysis directory")
    
    def run_analysis(self):
        """Run the complete analysis pipeline"""
        print("Starting bike data analysis...")
        
        # Clean the data
        self.clean_data()
        
        # Generate summary
        summary = self.generate_summary()
        
        # Create DataFrame
        df = self.create_dataframe()
        
        # Generate visualizations
        self.generate_visualizations(df)
        
        print("Analysis complete!")
        return summary


if __name__ == "__main__":
    # Find the most recent data file
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    data_files = [f for f in os.listdir(data_dir) if f.startswith('99spokes_specific_bikes_')]
    
    if data_files:
        # Sort by timestamp (newest first)
        latest_file = sorted(data_files, reverse=True)[0]
        data_file_path = os.path.join(data_dir, latest_file)
        
        # Run analysis
        analyzer = BikeDataAnalyzer(data_file_path)
        analyzer.run_analysis()
    else:
        print("No bike data files found. Please run a scraper first.")