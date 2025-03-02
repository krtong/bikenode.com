#!/usr/bin/env python3
"""
Utility script to resume an interrupted bike scraping job
"""
import os
import sys
import argparse
import subprocess

def main():
    parser = argparse.ArgumentParser(description="Resume an interrupted bike scraping job")
    parser.add_argument("--year", type=int, default=None, 
                        help="Year to resume scraping for (if not specified, will use the one from progress file)")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--method", choices=["family", "brand", "both"], default="both",
                       help="Method to use: family, brand, or both")
    args = parser.parse_args()
    
    # Check if progress file exists
    progress_file = "bike_scraper_progress.json"
    if not os.path.exists(progress_file):
        print(f"Error: Progress file {progress_file} not found.")
        print("Make sure you run this script in the same directory as the original script.")
        return 1
    
    # Construct command to resume scraping
    cmd = [sys.executable, "extract_all_bikes.py", "--resume"]
    
    if args.year:
        cmd.extend(["--year", str(args.year)])
    
    if args.headless:
        cmd.append("--headless")
    
    cmd.extend(["--method", args.method])
    
    print("=" * 70)
    print("RESUMING BIKE SCRAPING")
    print("=" * 70)
    print(f"Command: {' '.join(cmd)}")
    print("=" * 70)
    
    # Run the command
    try:
        process = subprocess.run(cmd)
        return process.returncode
    except KeyboardInterrupt:
        print("\nResume process interrupted.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
