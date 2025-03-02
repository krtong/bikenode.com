import os
import csv
import shutil
import json
import re
from pathlib import Path
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("cleanup_log.txt"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("cleanup")

class BikeDataCleanup:
    def __init__(self, base_dir=None):
        """Initialize the cleanup tool with the base directory"""
        if base_dir is None:
            self.base_dir = os.path.dirname(os.path.abspath(__file__))
        else:
            self.base_dir = base_dir
            
        self.motorcycle_dir = os.path.join(self.base_dir, "motorcycles")
        self.bicycle_dir = os.path.join(self.base_dir, "bicycles")
        self.backup_dir = os.path.join(self.base_dir, "backups")
        
        # CSV field specifications
        self.motorcycle_fields = ["Year", "Make", "Model", "Category", "Engine", "Package"]
        self.bicycle_fields = ["Year", "Make", "Model", "Category", "Package", "Frame"]
        
        # Statistics
        self.stats = {
            "directories_created": 0,
            "files_backed_up": 0,
            "motorcycle_entries": 0,
            "bicycle_entries": 0,
            "inconsistencies_fixed": 0,
            "invalid_entries": 0
        }
        
    def run(self):
        """Execute the entire cleanup process"""
        logger.info("Starting cleanup process...")
        
        # Create directory structure if needed
        self.create_directories()
        
        # Create backups of existing files
        self.backup_data()
        
        # Clean motorcycle data
        self.clean_motorcycle_data()
        
        # Clean bicycle data
        self.clean_bicycle_data()
        
        # Generate report
        self.generate_report()
        
        logger.info("Cleanup process completed!")
        return self.stats
        
    def create_directories(self):
        """Ensure all necessary directories exist"""
        logger.info("Creating directory structure...")
        
        dirs_to_create = [
            self.motorcycle_dir,
            self.bicycle_dir,
            self.backup_dir
        ]
        
        for directory in dirs_to_create:
            if not os.path.exists(directory):
                os.makedirs(directory)
                logger.info(f"Created directory: {directory}")
                self.stats["directories_created"] += 1
        
    def backup_data(self):
        """Backup existing data files"""
        logger.info("Creating backups of existing data...")
        
        # Create a timestamped backup folder
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        current_backup_dir = os.path.join(self.backup_dir, f"backup_{timestamp}")
        os.makedirs(current_backup_dir, exist_ok=True)
        
        # Files to backup
        file_patterns = [
            os.path.join(self.motorcycle_dir, "*.csv"),
            os.path.join(self.bicycle_dir, "*.csv")
        ]
        
        for pattern in file_patterns:
            for file_path in Path(self.base_dir).glob(pattern):
                if os.path.isfile(file_path):
                    # Determine the relative structure to maintain
                    rel_path = os.path.relpath(file_path, self.base_dir)
                    backup_path = os.path.join(current_backup_dir, rel_path)
                    
                    # Create parent directories in backup location
                    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
                    
                    # Copy the file
                    shutil.copy2(file_path, backup_path)
                    logger.info(f"Backed up: {rel_path}")
                    self.stats["files_backed_up"] += 1
        
    def clean_motorcycle_data(self):
        """Clean and standardize motorcycle data files"""
        logger.info("Cleaning motorcycle data files...")
        
        old_bikes_csv = os.path.join(self.motorcycle_dir, "Motorcycle_Makes_models_1894-1949.csv")
        new_bikes_csv = os.path.join(self.motorcycle_dir, "Motorcycle_Makes_models_1950-2025.csv")
        
        # Process files if they exist
        if os.path.exists(old_bikes_csv):
            self._clean_csv_file(old_bikes_csv, self.motorcycle_fields, 'motorcycle')
        
        if os.path.exists(new_bikes_csv):
            self._clean_csv_file(new_bikes_csv, self.motorcycle_fields, 'motorcycle')
    
    def clean_bicycle_data(self):
        """Clean and standardize bicycle data files"""
        logger.info("Cleaning bicycle data files...")
        
        bikes_csv = os.path.join(self.bicycle_dir, "Bicycle_Makes_models.csv")
        
        # Check if we need to create sample data
        if not os.path.exists(bikes_csv):
            self._create_sample_bicycle_data()
        else:
            self._clean_csv_file(bikes_csv, self.bicycle_fields, 'bicycle')
    
    def _create_sample_bicycle_data(self):
        """Create sample bicycle data if none exists"""
        logger.info("Creating sample bicycle data...")
        
        try:
            # Import the mock data generator
            import bicycles.mock_data as mock_data
            mock_data.create_mock_bicycle_data()
            logger.info("Successfully created sample bicycle data")
        except Exception as e:
            logger.error(f"Failed to create sample bicycle data: {e}")
            # Create minimal sample data
            bikes_csv = os.path.join(self.bicycle_dir, "Bicycle_Makes_models.csv")
            with open(bikes_csv, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(self.bicycle_fields)
                # Add a few sample entries
                sample_data = [
                    ["2022", "Trek", "Madone", "Road", "SLR 9", "Carbon"],
                    ["2022", "Specialized", "Tarmac", "Road", "SL7 Pro", "Carbon"],
                    ["2022", "Giant", "TCR Advanced", "Road", "SL 0 Disc", "Carbon"]
                ]
                writer.writerows(sample_data)
                self.stats["bicycle_entries"] = 3
                logger.info("Created minimal sample bicycle data")
    
    def _clean_csv_file(self, file_path, expected_fields, vehicle_type):
        """Clean and validate a CSV file"""
        if not os.path.exists(file_path):
            logger.warning(f"File not found: {file_path}")
            return
        
        logger.info(f"Cleaning CSV file: {file_path}")
        
        temp_file = file_path + ".temp"
        entry_count = 0
        fixed_entries = 0
        invalid_entries = 0
        
        try:
            # Read the file and validate
            with open(file_path, 'r', encoding='utf-8', errors='replace') as infile, \
                 open(temp_file, 'w', newline='', encoding='utf-8') as outfile:
                
                reader = csv.DictReader(infile)
                writer = csv.DictWriter(outfile, fieldnames=expected_fields)
                writer.writeheader()
                
                if reader.fieldnames != expected_fields:
                    logger.warning(f"Column mismatch in {file_path}. Expected: {expected_fields}, Got: {reader.fieldnames}")
                
                for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header
                    clean_row = {}
                    is_valid = True
                    fixed = False
                    
                    # Ensure all expected fields exist
                    for field in expected_fields:
                        if field not in row or row[field] is None:
                            clean_row[field] = ""
                            fixed = True
                        else:
                            # Clean the data
                            value = row[field].strip()
                            
                            # Year validation - must be a 4-digit number
                            if field == "Year" and value:
                                if not re.match(r'^\d{4}$', value):
                                    # Try to fix it if possible
                                    match = re.search(r'\d{4}', value)
                                    if match:
                                        value = match.group(0)
                                        fixed = True
                                    else:
                                        logger.warning(f"Invalid year format in row {row_num}: {value}")
                                        is_valid = False
                            
                            # Make and Model validation - can't be empty
                            if field in ["Make", "Model"] and not value:
                                logger.warning(f"Empty {field} in row {row_num}")
                                is_valid = False
                                
                            clean_row[field] = value
                    
                    if is_valid:
                        writer.writerow(clean_row)
                        entry_count += 1
                        if fixed:
                            fixed_entries += 1
                    else:
                        invalid_entries += 1
                        
            # Replace original with cleaned version if successful
            if entry_count > 0:
                shutil.move(temp_file, file_path)
                logger.info(f"Successfully cleaned {file_path} - {entry_count} valid entries")
            else:
                os.remove(temp_file)
                logger.error(f"No valid entries found in {file_path}")
                
        except Exception as e:
            logger.error(f"Error cleaning {file_path}: {str(e)}")
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        # Update statistics
        if vehicle_type == 'motorcycle':
            self.stats["motorcycle_entries"] += entry_count
        else:
            self.stats["bicycle_entries"] += entry_count
            
        self.stats["inconsistencies_fixed"] += fixed_entries
        self.stats["invalid_entries"] += invalid_entries
    
    def generate_report(self):
        """Generate a report of the cleanup process"""
        logger.info("Generating cleanup report...")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "base_directory": self.base_dir,
            "statistics": self.stats,
            "motorcycle_files": [],
            "bicycle_files": []
        }
        
        # Get motorcycle files info
        for file_path in Path(self.motorcycle_dir).glob("*.csv"):
            if os.path.isfile(file_path):
                file_info = {
                    "filename": os.path.basename(file_path),
                    "size_bytes": os.path.getsize(file_path),
                    "last_modified": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                }
                report["motorcycle_files"].append(file_info)
        
        # Get bicycle files info
        for file_path in Path(self.bicycle_dir).glob("*.csv"):
            if os.path.isfile(file_path):
                file_info = {
                    "filename": os.path.basename(file_path),
                    "size_bytes": os.path.getsize(file_path),
                    "last_modified": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                }
                report["bicycle_files"].append(file_info)
        
        # Save the report as JSON
        report_path = os.path.join(self.base_dir, "cleanup_report.json")
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        logger.info(f"Report saved to {report_path}")
        
        # Print summary
        logger.info("Cleanup Summary:")
        logger.info(f"- Directories created: {self.stats['directories_created']}")
        logger.info(f"- Files backed up: {self.stats['files_backed_up']}")
        logger.info(f"- Motorcycle entries: {self.stats['motorcycle_entries']}")
        logger.info(f"- Bicycle entries: {self.stats['bicycle_entries']}")
        logger.info(f"- Inconsistencies fixed: {self.stats['inconsistencies_fixed']}")
        logger.info(f"- Invalid entries removed: {self.stats['invalid_entries']}")

if __name__ == "__main__":
    cleanup = BikeDataCleanup()
    stats = cleanup.run()
    
    print("\nWould you like to run the database test script? (y/n)")
    response = input().strip().lower()
    
    if response == 'y':
        print("\nRunning database test script...")
        try:
            # Import the bot testing script
            import bot_testing_script
            bot_testing_script.test_database()
        except Exception as e:
            logger.error(f"Error running test script: {str(e)}")
            print(f"Error running test script: {e}")
