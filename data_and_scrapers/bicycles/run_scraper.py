#!/usr/bin/env python3
"""
Run script for hierarchical bike scraper with simplified options
"""
import os
import sys
import argparse
import subprocess
import time
import signal
import json

def parse_arguments():
    """Parse command line arguments with simplified options"""
    parser = argparse.ArgumentParser(description="Run bike scraper with simplified options")
    
    # Main options
    parser.add_argument("--year", type=int, default=2024, help="Year to extract bikes for (default: 2024)")
    parser.add_argument("--brands", type=str, help="Comma-separated list of brands to scrape")
    parser.add_argument("--all-years", action="store_true", help="Process all available years (2000-2026)")
    parser.add_argument("--recent-years", action="store_true", help="Process recent years (2020-2026)")
    parser.add_argument("--resume", action="store_true", help="Resume from previous run")
    
    # Output options
    parser.add_argument("--output-dir", type=str, default="bike_data", help="Output directory for scraped data")
    
    # Run mode
    parser.add_argument("--headless", action="store_true", help="Run in headless mode (not recommended)")
    parser.add_argument("--debug", action="store_true", help="Enable debug screenshots")
    
    return parser.parse_args()

def create_output_dir(dir_name):
    """Create output directory if it doesn't exist"""
    if not os.path.exists(dir_name):
        os.makedirs(dir_name)
        print(f"Created output directory: {dir_name}")
    return dir_name

def build_command(args):
    """Build command for hierarchical_bike_scraper.py with parsed arguments"""
    cmd = ["python3", "hierarchical_bike_scraper.py"]
    
    # Year options
    if args.all_years:
        cmd.append("--all-years")
    elif args.recent_years:
        cmd.extend(["--year-start", "2020", "--year-end", "2026"])
    else:
        cmd.extend(["--year", str(args.year)])
    
    # Brand filtering
    if args.brands:
        cmd.extend(["--brand-filter", args.brands])
    
    # Resume option
    if args.resume:
        cmd.append("--resume")
    
    # Output directory
    output_dir = create_output_dir(args.output_dir)
    cmd.extend(["--output", os.path.join(output_dir, "bikes")])
    
    # Mode options
    if args.headless:
        cmd.append("--headless")
    if args.debug:
        cmd.append("--debug")
    
    return cmd

def handle_signal(sig, frame):
    """Handle keyboard interrupt gracefully"""
    print("\nStopping scraper gracefully. Please wait...")
    time.sleep(1)
    sys.exit(0)

def main():
    """Main function to run the scraper with simplified options"""
    # Parse arguments
    args = parse_arguments()
    
    # Register signal handler for clean exit
    signal.signal(signal.SIGINT, handle_signal)
    
    # Build and print command
    cmd = build_command(args)
    print("Running command:", " ".join(cmd))
    
    # Execute scraper
    try:
        subprocess.run(cmd)
    except Exception as e:
        print(f"Error running scraper: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
