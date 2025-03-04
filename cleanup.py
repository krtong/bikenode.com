#!/usr/bin/env python3
"""
One-time cleanup script for the bikenode.com project directory.
This script will:
1. Organize data files into appropriate folders
2. Remove temporary and unnecessary files
3. Create a proper structure for bike data storage

DELETE THIS SCRIPT AFTER RUNNING
"""

import os
import sys
import shutil
import glob
from datetime import datetime
from pathlib import Path

def print_status(message):
    """Print status message with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def ensure_dir(directory):
    """Create directory if it doesn't exist"""
    if not os.path.exists(directory):
        os.makedirs(directory)
        print_status(f"Created directory: {directory}")
    return directory

def move_files(source_pattern, destination_dir, file_type="file"):
    """Move files matching pattern to destination directory"""
    ensure_dir(destination_dir)
    moved = 0
    
    for file_path in glob.glob(source_pattern):
        if os.path.isfile(file_path):
            filename = os.path.basename(file_path)
            dest_path = os.path.join(destination_dir, filename)
            
            # Handle file already exists
            if os.path.exists(dest_path):
                base, ext = os.path.splitext(filename)
                dest_path = os.path.join(destination_dir, f"{base}_{int(datetime.now().timestamp())}{ext}")
            
            shutil.move(file_path, dest_path)
            moved += 1
    
    print_status(f"Moved {moved} {file_type}s to {destination_dir}")
    return moved

def clean_project_directory():
    """Main cleanup function to organize project files"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print_status(f"Starting cleanup of directory: {base_dir}")
    
    # Create organized directory structure
    data_dir = ensure_dir(os.path.join(base_dir, "bike_data"))
    exports_dir = ensure_dir(os.path.join(data_dir, "exports"))
    logs_dir = ensure_dir(os.path.join(base_dir, "logs"))
    temp_dir = ensure_dir(os.path.join(base_dir, "temp"))
    
    # Move data files to appropriate directories
    move_files(os.path.join(base_dir, "*.csv"), exports_dir, "CSV file")
    move_files(os.path.join(base_dir, "*.json"), exports_dir, "JSON file")
    
    # Move log files
    move_files(os.path.join(base_dir, "*.log"), logs_dir, "log file")
    
    # Create year-based subdirectories in data
    years = list(range(2000, datetime.now().year + 2))
    for year in years:
        year_dir = ensure_dir(os.path.join(data_dir, str(year)))
    
    # Move screenshots to temp
    move_files(os.path.join(base_dir, "debug_screenshots", "*"), temp_dir, "screenshot")
    
    # Clean up __pycache__ directories
    pycache_dirs = []
    for root, dirs, _ in os.walk(base_dir):
        for dir_name in dirs:
            if dir_name == "__pycache__":
                pycache_dirs.append(os.path.join(root, dir_name))
    
    for pycache_dir in pycache_dirs:
        try:
            shutil.rmtree(pycache_dir)
            print_status(f"Removed: {pycache_dir}")
        except Exception as e:
            print_status(f"Error removing {pycache_dir}: {e}")
    
    # Remove empty directories
    empty_dirs = 0
    for root, dirs, files in os.walk(base_dir, topdown=False):
        # Skip the main directories we just created
        if root in [data_dir, exports_dir, logs_dir, temp_dir]:
            continue
            
        if not files and not dirs:
            try:
                os.rmdir(root)
                empty_dirs += 1
            except Exception as e:
                print_status(f"Error removing empty directory {root}: {e}")
    
    print_status(f"Removed {empty_dirs} empty directories")
    print_status("Directory cleanup complete!")

if __name__ == "__main__":
    try:
        clean_project_directory()
        print("\nCleanup completed successfully. You can now delete this script.")
    except Exception as e:
        print(f"Error during cleanup: {e}")
        sys.exit(1)
