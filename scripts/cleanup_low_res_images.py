#!/usr/bin/env python3
"""
Script to remove motorcycle images below 600x600 resolution
Author: Generated for bikenode.com image cleanup
"""

import os
import sys
from PIL import Image
from pathlib import Path
import logging
from datetime import datetime

# Configuration
IMAGES_DIR = "/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles"
MIN_WIDTH = 600
MIN_HEIGHT = 600
LOG_FILE = "/Users/kevintong/Documents/Code/bikenode.com/scripts/deleted_images.log"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

def check_and_delete_low_res_images():
    """Check all motorcycle images and delete those below minimum resolution"""
    
    deleted_count = 0
    kept_count = 0
    error_count = 0
    
    # Supported image extensions
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'}
    
    logging.info(f"Starting image cleanup in: {IMAGES_DIR}")
    logging.info(f"Minimum resolution required: {MIN_WIDTH}x{MIN_HEIGHT}")
    logging.info("-" * 50)
    
    # Walk through all motorcycle image files
    for root, dirs, files in os.walk(IMAGES_DIR):
        for file in files:
            if Path(file).suffix.lower() in image_extensions:
                file_path = os.path.join(root, file)
                
                try:
                    with Image.open(file_path) as img:
                        width, height = img.size
                        
                        if width < MIN_WIDTH or height < MIN_HEIGHT:
                            logging.info(f"DELETING: {file_path} ({width}x{height})")
                            os.remove(file_path)
                            deleted_count += 1
                        else:
                            logging.info(f"KEEPING: {file_path} ({width}x{height})")
                            kept_count += 1
                            
                except Exception as e:
                    logging.error(f"ERROR processing {file_path}: {str(e)}")
                    error_count += 1
                
                # Progress indicator
                total_processed = deleted_count + kept_count + error_count
                if total_processed % 50 == 0:
                    print(f"Processed {total_processed} images...")
    
    logging.info("-" * 50)
    logging.info(f"Cleanup completed!")
    logging.info(f"Images deleted: {deleted_count}")
    logging.info(f"Images kept: {kept_count}")
    logging.info(f"Errors encountered: {error_count}")
    
    return deleted_count, kept_count, error_count

def main():
    print("Motorcycle Image Cleanup Tool")
    print("=" * 30)
    print(f"This will delete all images smaller than {MIN_WIDTH}x{MIN_HEIGHT} pixels")
    print(f"Directory: {IMAGES_DIR}")
    print()
    
    # Check if PIL is available
    try:
        from PIL import Image
    except ImportError:
        print("Error: Pillow (PIL) is not installed. Please install it first:")
        print("pip install Pillow")
        sys.exit(1)
    
    # Confirm before proceeding
    response = input("Do you want to proceed? (y/N): ").strip().lower()
    if response != 'y':
        print("Operation cancelled.")
        sys.exit(0)
    
    # Run cleanup
    deleted, kept, errors = check_and_delete_low_res_images()
    
    print()
    print("Summary:")
    print(f"- Images deleted: {deleted}")
    print(f"- Images kept: {kept}")
    print(f"- Errors: {errors}")
    print(f"- Log file: {LOG_FILE}")

if __name__ == "__main__":
    main()
