import os
import csv
import json
import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter
from pathlib import Path
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('validator')

class BikeDataValidator:
    def __init__(self, data_dir=None):
        """Initialize the validator with the data directory"""
        if data_dir is None:
            self.data_dir = os.path.dirname(os.path.abspath(__file__))
        else:
            self.data_dir = data_dir
            
        self.motorcycle_dir = os.path.join(self.data_dir, "motorcycles")
        self.bicycle_dir = os.path.join(self.data_dir, "bicycles")
        self.output_dir = os.path.join(self.data_dir, "reports")
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Statistics storage
        self.stats = {
            "motorcycle": {
                "total_entries": 0,
                "unique_makes": 0,
                "unique_models": 0,
                "years_range": [],
                "top_makes": [],
                "categories": {},
                "duplicates": 0,
                "missing_data": 0
            },
            "bicycle": {
                "total_entries": 0,
                "unique_makes": 0,
                "unique_models": 0,
                "years_range": [],
                "top_makes": [],
                "categories": {},
                "duplicates": 0,
                "missing_data": 0
            }
        }
        
    def validate_all(self):
        """Run all validation checks"""
        logger.info("Starting data validation...")
        
        self.validate_motorcycle_data()
        self.validate_bicycle_data()
        self.generate_reports()
        
        logger.info("Validation complete!")
        return self.stats
    
    def validate_motorcycle_data(self):
        """Validate motorcycle data files"""
        logger.info("Validating motorcycle data...")
        
        motorcycle_files = []
        for file_path in Path(self.motorcycle_dir).glob("*.csv"):
            if os.path.isfile(file_path):
                motorcycle_files.append(file_path)
        
        if not motorcycle_files:
            logger.warning("No motorcycle data files found!")
            return
        
        # Read all files into DataFrames
        all_data = []
        for file_path in motorcycle_files:
            try:
                df = pd.read_csv(file_path)
                all_data.append(df)
            except Exception as e:
                logger.error(f"Error reading {file_path}: {str(e)}")
        
        if not all_data:
            logger.error("No valid motorcycle data was read!")
            return
            
        # Combine all DataFrames
        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Run validation checks
        self._validate_dataset(combined_df, "motorcycle")
    
    def validate_bicycle_data(self):
        """Validate bicycle data files"""
        logger.info("Validating bicycle data...")
        
        bicycle_files = []
        for file_path in Path(self.bicycle_dir).glob("*.csv"):
            if os.path.isfile(file_path):
                bicycle_files.append(file_path)
        
        if not bicycle_files:
            logger.warning("No bicycle data files found!")
            return
        
        # Read all files into DataFrames
        all_data = []
        for file_path in bicycle_files:
            try:
                df = pd.read_csv(file_path)
                all_data.append(df)
            except Exception as e:
                logger.error(f"Error reading {file_path}: {str(e)}")
        
        if not all_data:
            logger.error("No valid bicycle data was read!")
            return
            
        # Combine all DataFrames
        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Run validation checks
        self._validate_dataset(combined_df, "bicycle")
    
    def _validate_dataset(self, df, vehicle_type):
        """Run validation checks on a dataset"""
        stats = self.stats[vehicle_type]
        
        # Basic counts
        stats["total_entries"] = len(df)
        
        # Check for required columns
        required_columns = ["Year", "Make", "Model"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            logger.error(f"Missing required columns in {vehicle_type} data: {missing_columns}")
            return
        
        # Missing data
        missing_data = df[required_columns].isna().sum().sum()
        stats["missing_data"] = int(missing_data)
        
        # Check for duplicates
        duplicates = df.duplicated(subset=["Year", "Make", "Model"]).sum()
        stats["duplicates"] = int(duplicates)
        
        # Get unique makes and models
        unique_makes = df["Make"].unique()
        unique_models = df["Model"].unique()
        stats["unique_makes"] = len(unique_makes)
        stats["unique_models"] = len(unique_models)
        
        # Get year range
        years = pd.to_numeric(df["Year"], errors="coerce").dropna()
        if len(years) > 0:
            stats["years_range"] = [int(years.min()), int(years.max())]
        
        # Get top makes
        make_counts = Counter(df["Make"].dropna())
        stats["top_makes"] = make_counts.most_common(10)
        
        # Get category distribution if available
        if "Category" in df.columns:
            category_counts = Counter(df["Category"].dropna())
            stats["categories"] = dict(category_counts.most_common())
        
        logger.info(f"Validation complete for {vehicle_type} data: {stats['total_entries']} entries")
    
    def generate_reports(self):
        """Generate validation reports and visualizations"""
        logger.info("Generating validation reports...")
        
        # Create JSON report
        report_path = os.path.join(self.output_dir, "data_validation_report.json")
        with open(report_path, 'w') as f:
            json.dump(self.stats, f, indent=2)
            
        logger.info(f"Report saved to {report_path}")
        
        # Generate visualizations if there's data
        if self.stats["motorcycle"]["total_entries"] > 0:
            self._generate_charts("motorcycle")
            
        if self.stats["bicycle"]["total_entries"] > 0:
            self._generate_charts("bicycle")
    
    def _generate_charts(self, vehicle_type):
        """Generate charts for the given vehicle type"""
        stats = self.stats[vehicle_type]
        
        # Skip if there's not enough data
        if stats["unique_makes"] < 2:
            return
            
        # Create a figure for top manufacturers
        plt.figure(figsize=(10, 6))
        labels = [x[0] for x in stats["top_makes"][:10]]
        values = [x[1] for x in stats["top_makes"][:10]]
        
        plt.bar(labels, values)
        plt.xlabel('Manufacturer')
        plt.ylabel('Number of Models')
        plt.title(f'Top 10 {vehicle_type.capitalize()} Manufacturers')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        
        # Save the chart
        chart_path = os.path.join(self.output_dir, f"{vehicle_type}_manufacturers.png")
        plt.savefig(chart_path)
        plt.close()
        
        # Create a pie chart for categories if available
        if stats["categories"]:
            plt.figure(figsize=(10, 8))
            labels = list(stats["categories"].keys())
            values = list(stats["categories"].values())
            
            # Limit to top 10 categories for readability
            if len(labels) > 10:
                labels = labels[:9] + ["Other"]
                values = values[:9] + [sum(values[9:])]
            
            plt.pie(values, labels=labels, autopct='%1.1f%%', startangle=90)
            plt.axis('equal')
            plt.title(f'{vehicle_type.capitalize()} Categories Distribution')
            
            # Save the chart
            chart_path = os.path.join(self.output_dir, f"{vehicle_type}_categories.png")
            plt.savefig(chart_path)
            plt.close()


if __name__ == "__main__":
    print("BikeNode.com Data Validation Tool\n")
    print("This tool will validate your motorcycle and bicycle data files and generate reports.")
    
    validator = BikeDataValidator()
    stats = validator.validate_all()
    
    print("\nValidation Summary:")
    print("===================")
    print(f"Motorcycles: {stats['motorcycle']['total_entries']} entries, {stats['motorcycle']['unique_makes']} makes, {stats['motorcycle']['unique_models']} models")
    
    if stats['motorcycle']['years_range']:
        print(f"Year range: {stats['motorcycle']['years_range'][0]}-{stats['motorcycle']['years_range'][1]}")
    
    print(f"Bicycles: {stats['bicycle']['total_entries']} entries, {stats['bicycle']['unique_makes']} makes, {stats['bicycle']['unique_models']} models")
    
    if stats['bicycle']['years_range']:
        print(f"Year range: {stats['bicycle']['years_range'][0]}-{stats['bicycle']['years_range'][1]}")
    
    print("\nDetailed reports saved to the 'reports' directory.")
    
    print("\nWould you like to run the cleanup script to fix any issues? (y/n)")
    response = input().strip().lower()
    
    if response == 'y':
        print("\nRunning cleanup script...")
        try:
            from cleanup import BikeDataCleanup
            cleanup = BikeDataCleanup()
            cleanup.run()
        except Exception as e:
            logger.error(f"Error running cleanup script: {str(e)}")
            print(f"Error running cleanup script: {e}")
