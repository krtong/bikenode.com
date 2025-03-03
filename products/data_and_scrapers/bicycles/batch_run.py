#!/usr/bin/env python3
"""
Batch runner for scraping multiple years or brands
"""
import os
import sys
import argparse
import subprocess
import json
import time
from datetime import datetime
from pathlib import Path

def run_scraper(year=None, brand=None, output=None, pages=3, format='csv'):
    """Run the scraper with specified parameters"""
    cmd = [sys.executable, "run_scraper.py"]
    
    if year:
        cmd.extend(["--year", str(year)])
    
    if brand:
        cmd.extend(["--brand", brand])
    
    if output:
        cmd.extend(["--output", output])
    
    if pages:
        cmd.extend(["--pages", str(pages)])
    
    if format:
        cmd.extend(["--format", format])
    
    print(f"Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True, text=True, capture_output=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running scraper: {e}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return False, e.stderr
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False, str(e)

def create_batch_config(output_file="batch_config.json"):
    """Create a sample batch configuration file"""
    config = {
        "output_dir": "exports",
        "format": "csv",
        "runs": [
            {
                "year": 2025,
                "pages": 3,
                "output": "bikes_2025.csv"
            },
            {
                "year": 2024,
                "pages": 3,
                "output": "bikes_2024.csv"
            },
            {
                "year": 2023,
                "pages": 2,
                "output": "bikes_2023.csv"
            }
        ],
        "post_process": {
            "merge": True,
            "output": "all_bikes_{timestamp}.csv"
        }
    }
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        print(f"✅ Created sample configuration at {output_file}")
        print("Edit this file to customize your batch scraping.")
        return True
    except Exception as e:
        print(f"Error creating configuration file: {e}")
        return False

def load_batch_config(config_file):
    """Load a batch configuration from file"""
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading configuration file: {e}")
        return None

def run_batch(config_file):
    """Run a batch of scraper jobs from a config file"""
    config = load_batch_config(config_file)
    if not config:
        return False
    
    # Create output directory if it doesn't exist
    output_dir = config.get("output_dir", "exports")
    os.makedirs(output_dir, exist_ok=True)
    
    # Track successful outputs
    successful_outputs = []
    
    # Run each configured job
    for i, job in enumerate(config.get("runs", [])):
        print("\n" + "=" * 70)
        print(f"BATCH JOB {i+1}/{len(config.get('runs', []))}")
        print("=" * 70)
        
        year = job.get("year")
        brand = job.get("brand")
        pages = job.get("pages", 3)
        
        # Determine output path
        output = job.get("output")
        if output and not os.path.isabs(output):
            output = os.path.join(output_dir, output)
        elif not output:
            filename = f"bikes_{year}"
            if brand:
                filename += f"_{brand.lower()}"
            filename += f".{config.get('format', 'csv')}"
            output = os.path.join(output_dir, filename)
        
        # Run the scraper
        print(f"Scraping year: {year}, brand: {brand}, output: {output}")
        success, log = run_scraper(
            year=year,
            brand=brand,
            output=output,
            pages=pages,
            format=config.get("format", "csv")
        )
        
        if success:
            print(f"✅ Job completed successfully: {output}")
            successful_outputs.append(output)
        else:
            print(f"❌ Job failed")
        
        # Add a delay between jobs to avoid overloading the server
        if i < len(config.get("runs", [])) - 1:
            delay = config.get("delay_between_jobs", 5)
            print(f"\nWaiting {delay} seconds before next job...")
            time.sleep(delay)
    
    # Post-processing
    if config.get("post_process", {}).get("merge") and successful_outputs:
        print("\n" + "=" * 70)
        print("POST-PROCESSING: MERGING RESULTS")
        print("=" * 70)
        
        # Generate output filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        merge_output = config.get("post_process", {}).get("output", "all_bikes_merged.csv")
        merge_output = merge_output.replace("{timestamp}", timestamp)
        merge_output = os.path.join(output_dir, merge_output)
        
        print(f"Merging {len(successful_outputs)} files into {merge_output}")
        
        # Run the merge script
        merge_cmd = [
            sys.executable, "merge_data.py",
            "--input"] + successful_outputs + [
            "--output", merge_output,
            "--deduplicate"
        ]
        
        try:
            subprocess.run(merge_cmd, check=True)
            print(f"✅ Successfully merged files into {merge_output}")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to merge files: {e}")
        except Exception as e:
            print(f"❌ Unexpected error during merge: {e}")
    
    return True

def main():
    parser = argparse.ArgumentParser(description="Run batch scraping jobs")
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Config subcommand
    config_parser = subparsers.add_parser("config", help="Create a sample configuration file")
    config_parser.add_argument("--output", default="batch_config.json", 
                             help="Output path for the sample configuration")
    
    # Run subcommand
    run_parser = subparsers.add_parser("run", help="Run a batch of scraping jobs")
    run_parser.add_argument("--config", default="batch_config.json",
                          help="Path to the batch configuration file")
    
    args = parser.parse_args()
    
    if args.command == "config":
        create_batch_config(args.output)
    elif args.command == "run":
        if not os.path.exists(args.config):
            print(f"Error: Configuration file '{args.config}' not found")
            return 1
        run_batch(args.config)
    else:
        parser.print_help()
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
