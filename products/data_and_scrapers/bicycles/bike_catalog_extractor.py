#!/usr/bin/env python3
"""
Bike Catalog Extractor - A comprehensive extraction tool that methodically
scrapes the entire 99spokes.com bike catalog across all years (2000-2026)
and brands with robust error handling and resuming capabilities.
"""
import os
import sys
import json
import time
import argparse
import logging
import subprocess
import random
from datetime import datetime
from tqdm import tqdm
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("catalog_extractor.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BikeCatalogExtractor:
    """
    Manages the extraction of bike data across all years and brands
    with support for batching, resuming, and error recovery.
    """
    
    def __init__(self, output_dir="bike_catalog", headless=False, debug=False):
        """Initialize the catalog extractor"""
        self.output_dir = output_dir
        self.headless = headless
        self.debug = debug
        
        # Create output directory if it doesn't exist
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        Path(os.path.join(output_dir, "by_year")).mkdir(exist_ok=True)
        Path(os.path.join(output_dir, "by_brand")).mkdir(exist_ok=True)
        
        # State tracking
        self.state_file = os.path.join(output_dir, "extraction_state.json")
        self.state = self._load_state() or {
            "completed_years": [],
            "completed_brands": {},
            "completed_brand_year_pairs": [],
            "failed_attempts": {},
            "last_run": None,
            "total_bikes_extracted": 0
        }
        
        # Default years ordered by data volume (newer years first for better data)
        self.all_years = [
            2026, 2025, 2024, 2023, 2022, 2021, 2020,
            2019, 2018, 2017, 2016, 2015, 2014, 2013,
            2012, 2011, 2010, 2009, 2008, 2007, 2006,
            2005, 2004, 2003, 2002, 2001, 2000
        ]
        
        # Brand tiers for prioritization (top brands first)
        self.brand_tiers = self._define_brand_tiers()
        
    def _define_brand_tiers(self):
        """Define brand tiers for prioritized extraction"""
        # Tier 1: Top volume mainstream brands
        tier1 = [
            "specialized", "trek", "cannondale", "giant", "santa-cruz", 
            "canyon", "cervelo", "bmc", "scott", "kona"
        ]
        
        # Tier 2: High volume but less mainstream
        tier2 = [
            "norco", "orbea", "cube", "merida", "felt", "fuji", "pinarello", 
            "pivot", "yeti", "gt", "ibis", "jamis", "marin", "salsa", "surly"
        ]
        
        # Tier 3: E-bike specialists
        tier3 = [
            "rad power bikes", "riese & müller", "gazelle", "electra", "aventon",
            "himiway", "ride1up", "juiced bikes", "pedego", "biktrix"
        ]
        
        # Tier 4: Remaining brands
        # Will be populated dynamically when scraping
        
        return {
            "tier1": tier1,
            "tier2": tier2,
            "tier3": tier3,
            "tier4": []  # Will be populated during extraction
        }
    
    def _load_state(self):
        """Load extraction state from file"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading state file: {e}")
        return None
    
    def _save_state(self):
        """Save current extraction state to file"""
        self.state["last_run"] = datetime.now().isoformat()
        try:
            with open(self.state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving state file: {e}")
    
    def extract_all_years(self, start_year=None, end_year=None):
        """Extract bikes from all years or specified range"""
        # Filter years based on specified range
        years_to_process = self.all_years
        if start_year and end_year:
            years_to_process = [y for y in years_to_process if start_year <= y <= end_year]
        
        logger.info(f"Starting extraction for {len(years_to_process)} years: {years_to_process}")
        
        for year in tqdm(years_to_process, desc="Processing Years"):
            if str(year) in self.state["completed_years"]:
                logger.info(f"Year {year} already completed, skipping")
                continue
            
            success = self.extract_year(year)
            
            if success:
                logger.info(f"Completed extraction for year {year}")
                self.state["completed_years"].append(str(year))
                self._save_state()
            else:
                logger.error(f"Failed to complete extraction for year {year}")
                # Don't retry in this run - will be attempted again on next run
    
    def extract_year(self, year):
        """Extract all bikes for a specific year"""
        logger.info(f"Starting extraction for year {year}")
        
        output_dir = os.path.join(self.output_dir, "by_year", f"year_{year}")
        Path(output_dir).mkdir(exist_ok=True)
        
        # Run the hierarchical scraper for this year
        cmd = [
            "python3", "hierarchical_bike_scraper.py",
            "--year", str(year),
            "--output", os.path.join(output_dir, f"bikes_{year}"),
        ]
        
        if self.headless:
            cmd.append("--headless")
        
        if self.debug:
            cmd.append("--debug")
        
        try:
            logger.info(f"Running command: {' '.join(cmd)}")
            result = subprocess.run(cmd, check=True)
            
            # Check if the CSV file was created (indicating success)
            expected_csv = os.path.join(output_dir, f"bikes_{year}.csv")
            if os.path.exists(expected_csv):
                return True
            else:
                logger.error(f"Expected output file {expected_csv} not found")
                return False
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Error running extraction for year {year}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during extraction for year {year}: {e}")
            return False
    
    def extract_all_brands(self, brand_list=None, years=None):
        """Extract all bikes for specific brands across years"""
        if years is None:
            # Default to the last 5 years for brand-specific extraction
            years = [y for y in self.all_years if y >= 2020]
        
        brands_to_process = brand_list or self._get_prioritized_brands()
        logger.info(f"Starting extraction for {len(brands_to_process)} brands across {len(years)} years")
        
        for brand in tqdm(brands_to_process, desc="Processing Brands"):
            brand_key = brand.lower().replace(' ', '-')
            
            # Skip if all years for this brand are completed
            if brand_key in self.state["completed_brands"]:
                completed_years = self.state["completed_brands"][brand_key]
                if all(str(year) in completed_years for year in years):
                    logger.info(f"Brand {brand} already completed for all requested years, skipping")
                    continue
            
            for year in years:
                pair_key = f"{brand_key}|{year}"
                if pair_key in self.state["completed_brand_year_pairs"]:
                    logger.info(f"Brand {brand} for year {year} already completed, skipping")
                    continue
                
                success = self.extract_brand_year(brand, year)
                
                if success:
                    logger.info(f"Completed extraction for {brand} in year {year}")
                    self.state.setdefault("completed_brands", {}).setdefault(brand_key, []).append(str(year))
                    self.state["completed_brand_year_pairs"].append(pair_key)
                    self._save_state()
                else:
                    logger.error(f"Failed to complete extraction for {brand} in year {year}")
                    self.state.setdefault("failed_attempts", {}).setdefault(pair_key, 0)
                    self.state["failed_attempts"][pair_key] += 1
                    self._save_state()
                
                # Add a random pause between brand extractions to avoid detection
                time.sleep(random.uniform(2, 5))
    
    def extract_brand_year(self, brand, year):
        """Extract all bikes for a specific brand and year"""
        logger.info(f"Starting extraction for brand {brand} in year {year}")
        
        # Create output directory structure
        brand_dir = os.path.join(self.output_dir, "by_brand", brand.lower().replace(' ', '_'))
        Path(brand_dir).mkdir(exist_ok=True)
        
        # Run the hierarchical scraper for this brand and year
        cmd = [
            "python3", "hierarchical_bike_scraper.py",
            "--year", str(year),
            "--brand-filter", brand,
            "--output", os.path.join(brand_dir, f"bikes_{brand.lower().replace(' ', '_')}_{year}"),
        ]
        
        if self.headless:
            cmd.append("--headless")
        
        if self.debug:
            cmd.append("--debug")
        
        try:
            logger.info(f"Running command: {' '.join(cmd)}")
            result = subprocess.run(cmd, check=True)
            
            # Check if the CSV file was created (indicating success)
            expected_csv = os.path.join(
                brand_dir, 
                f"bikes_{brand.lower().replace(' ', '_')}_{year}.csv"
            )
            
            if os.path.exists(expected_csv):
                return True
            else:
                logger.error(f"Expected output file {expected_csv} not found")
                return False
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Error running extraction for brand {brand} year {year}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during extraction for brand {brand} year {year}: {e}")
            return False
    
    def _get_prioritized_brands(self):
        """Get a prioritized list of brands to process"""
        all_brands = []
        for tier in ["tier1", "tier2", "tier3", "tier4"]:
            all_brands.extend(self.brand_tiers.get(tier, []))
        
        return all_brands
    
    def analyze_results(self):
        """Analyze extracted data and generate summary report"""
        logger.info("Analyzing extraction results")
        
        # Find all CSV files in the output directory
        csv_files = []
        for root, dirs, files in os.walk(self.output_dir):
            for file in files:
                if file.endswith('.csv'):
                    csv_files.append(os.path.join(root, file))
        
        if not csv_files:
            logger.warning("No CSV files found for analysis")
            return
        
        # Count bikes per year
        bikes_per_year = {}
        bikes_per_brand = {}
        total_bikes = 0
        
        for csv_file in csv_files:
            # Get bike count (line count minus header)
            try:
                with open(csv_file, 'r') as f:
                    lines = f.readlines()
                    bike_count = len(lines) - 1 if lines else 0
                    total_bikes += bike_count
                
                # Parse filename to get year and brand
                filename = os.path.basename(csv_file)
                
                # Extract year from filename
                year_match = next((y for y in self.all_years if str(y) in filename), None)
                if year_match:
                    bikes_per_year[year_match] = bikes_per_year.get(year_match, 0) + bike_count
                
                # Try to extract brand from path
                brand_dir = os.path.basename(os.path.dirname(csv_file))
                if brand_dir.startswith("by_brand"):
                    continue
                
                if "by_brand" in csv_file:
                    brand_name = brand_dir.replace('_', ' ').title()
                    bikes_per_brand[brand_name] = bikes_per_brand.get(brand_name, 0) + bike_count
                
            except Exception as e:
                logger.error(f"Error analyzing {csv_file}: {e}")
        
        # Save analysis results
        analysis = {
            "total_bikes": total_bikes,
            "bikes_per_year": dict(sorted(bikes_per_year.items())),
            "bikes_per_brand": dict(sorted(bikes_per_brand.items(), key=lambda x: x[1], reverse=True)),
            "analyzed_on": datetime.now().isoformat(),
            "csv_files_found": len(csv_files)
        }
        
        analysis_file = os.path.join(self.output_dir, "extraction_analysis.json")
        try:
            with open(analysis_file, 'w') as f:
                json.dump(analysis, f, indent=2)
            logger.info(f"Analysis saved to {analysis_file}")
            
            self.state["total_bikes_extracted"] = total_bikes
            self._save_state()
            
            # Print summary
            print("\n====== EXTRACTION SUMMARY ======")
            print(f"Total bikes extracted: {total_bikes}")
            print(f"Years covered: {len(bikes_per_year)}")
            print(f"Brands covered: {len(bikes_per_brand)}")
            print(f"CSV files generated: {len(csv_files)}")
            print("==============================\n")
            
        except Exception as e:
            logger.error(f"Error saving analysis: {e}")
    
    def batch_extraction(self, batch_size=5, mode="year"):
        """Run extraction in batches to avoid overloading"""
        logger.info(f"Starting batch extraction in {mode} mode with batch size {batch_size}")
        
        if mode == "year":
            # Filter out already completed years
            years_to_process = [y for y in self.all_years 
                               if str(y) not in self.state["completed_years"]]
            
            # Process in batches
            for i in range(0, len(years_to_process), batch_size):
                batch = years_to_process[i:i+batch_size]
                logger.info(f"Processing batch of years: {batch}")
                
                for year in batch:
                    self.extract_year(year)
                    
                # Add a longer pause between batches
                logger.info(f"Batch completed. Pausing before next batch...")
                time.sleep(random.uniform(10, 20))
                
        elif mode == "brand":
            brands = self._get_prioritized_brands()
            # Use recent years for brand extraction
            years = [y for y in self.all_years if y >= 2020]
            
            # Process brands in batches
            for i in range(0, len(brands), batch_size):
                brand_batch = brands[i:i+batch_size]
                logger.info(f"Processing batch of brands: {brand_batch}")
                
                for brand in brand_batch:
                    for year in years:
                        pair_key = f"{brand.lower().replace(' ', '-')}|{year}"
                        if pair_key not in self.state["completed_brand_year_pairs"]:
                            self.extract_brand_year(brand, year)
                            # Short pause between each brand-year combination
                            time.sleep(random.uniform(3, 7))
                    
                # Add a longer pause between batches
                logger.info(f"Brand batch completed. Pausing before next batch...")
                time.sleep(random.uniform(15, 30))
        else:
            logger.error(f"Invalid batch mode: {mode}")

def main():
    """Main function to run the bike catalog extractor"""
    parser = argparse.ArgumentParser(
        description="Extract the complete bike catalog from 99spokes.com"
    )
    parser.add_argument("--output-dir", default="bike_catalog", 
                        help="Directory for extracted data (default: bike_catalog)")
    parser.add_argument("--batch-size", type=int, default=5, 
                        help="Number of items to process in each batch (default: 5)")
    parser.add_argument("--batch-mode", choices=["year", "brand"], default="year",
                        help="Batch extraction mode - by year or by brand (default: year)")
    parser.add_argument("--brands", help="Comma-separated list of brands to extract")
    parser.add_argument("--start-year", type=int, help="Start year for extraction range")
    parser.add_argument("--end-year", type=int, help="End year for extraction range")
    parser.add_argument("--recent-only", action="store_true", 
                        help="Extract only recent years (2020-2026)")
    parser.add_argument("--headless", action="store_true", 
                        help="Run in headless mode (not recommended for long runs)")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--analyze", action="store_true", 
                        help="Analyze existing extraction results")
    parser.add_argument("--extract-years", action="store_true", 
                        help="Extract all bikes by year")
    parser.add_argument("--extract-brands", action="store_true", 
                        help="Extract all bikes by brand")
    parser.add_argument("--batch-extract", action="store_true", 
                        help="Run extraction in batches")
    
    args = parser.parse_args()
    
    extractor = BikeCatalogExtractor(
        output_dir=args.output_dir,
        headless=args.headless,
        debug=args.debug
    )
    
    try:
        # Determine execution mode
        if args.analyze:
            extractor.analyze_results()
            return
            
        if args.extract_years:
            start_year = args.start_year
            end_year = args.end_year
            
            if args.recent_only:
                start_year = 2020
                end_year = 2026
                
            extractor.extract_all_years(start_year, end_year)
            
        elif args.extract_brands:
            brand_list = args.brands.split(',') if args.brands else None
            
            years = None
            if args.start_year and args.end_year:
                years = list(range(args.start_year, args.end_year + 1))
            elif args.recent_only:
                years = list(range(2020, 2027))
                
            extractor.extract_all_brands(brand_list, years)
            
        elif args.batch_extract:
            extractor.batch_extraction(args.batch_size, args.batch_mode)
            
        else:
            # Default: extract everything by year
            if args.recent_only:
                extractor.extract_all_years(2020, 2026)
            else:
                extractor.extract_all_years(args.start_year, args.end_year)
            
        # Run analysis after extraction
        extractor.analyze_results()
        
    except KeyboardInterrupt:
        logger.info("Extraction interrupted by user")
    except Exception as e:
        logger.error(f"Error during extraction: {e}")
        import traceback
        traceback.print_exc()
        
    # Save state even if there was an error
    extractor._save_state()
    
if __name__ == "__main__":
    main()
