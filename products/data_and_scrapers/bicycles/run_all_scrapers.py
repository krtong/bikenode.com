#!/usr/bin/env python3
"""
Master script to orchestrate all scraping methods to extract 
bike data from 99spokes.com with maximum coverage and fallback approaches
"""
import os
import sys
import time
import json
import argparse
import logging
import subprocess
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("master_scraper.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class MasterScraper:
    """
    Orchestrates multiple scraping strategies to maximize data coverage
    with fallback mechanisms
    """
    
    def __init__(self, output_dir="master_output"):
        self.output_dir = output_dir
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.run_dir = os.path.join(output_dir, self.timestamp)
        
        # Create output directories
        os.makedirs(self.run_dir, exist_ok=True)
        os.makedirs(os.path.join(self.run_dir, "logs"), exist_ok=True)
        os.makedirs(os.path.join(self.run_dir, "data"), exist_ok=True)
        
        # Run tracking
        self.state_file = os.path.join(self.run_dir, "run_state.json")
        self.state = {
            "run_id": self.timestamp,
            "started_at": datetime.now().isoformat(),
            "completed_scrapers": [],
            "failed_scrapers": [],
            "bike_counts": {}
        }
        
    def _save_state(self):
        """Save current run state"""
        try:
            self.state["last_updated"] = datetime.now().isoformat()
            with open(self.state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving run state: {e}")
    
    def _count_bikes_in_csv(self, csv_file):
        """Count rows in a CSV file (excluding header)"""
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                return sum(1 for _ in f) - 1
        except Exception as e:
            logger.error(f"Error counting rows in {csv_file}: {e}")
            return -1
    
    def run_scraper(self, scraper_name, command):
        """Run a specific scraper with the given command"""
        logger.info(f"Running {scraper_name} with command: {' '.join(command)}")
        
        # Prepare log file
        log_file = os.path.join(self.run_dir, "logs", f"{scraper_name.lower().replace(' ', '_')}.log")
        
        try:
            # Run the scraper and capture output
            with open(log_file, 'w') as f:
                start_time = time.time()
                process = subprocess.Popen(
                    command,
                    stdout=f,
                    stderr=subprocess.STDOUT
                )
                exit_code = process.wait()
                duration = time.time() - start_time
            
            if exit_code == 0:
                logger.info(f"{scraper_name} completed successfully in {duration:.1f} seconds")
                self.state["completed_scrapers"].append({
                    "name": scraper_name,
                    "command": command,
                    "duration": duration,
                    "exit_code": exit_code,
                    "completed_at": datetime.now().isoformat()
                })
                return True
            else:
                logger.error(f"{scraper_name} failed with exit code {exit_code}")
                self.state["failed_scrapers"].append({
                    "name": scraper_name,
                    "command": command,
                    "duration": duration,
                    "exit_code": exit_code,
                    "failed_at": datetime.now().isoformat()
                })
                return False
                
        except Exception as e:
            logger.error(f"Error running {scraper_name}: {e}")
            self.state["failed_scrapers"].append({
                "name": scraper_name,
                "command": command,
                "error": str(e),
                "failed_at": datetime.now().isoformat()
            })
            return False
        finally:
            self._save_state()
    
    def run_all_scrapers(self, years, brands=None, headless=False, debug=False):
        """
        Run all scraping strategies in order of reliability
        
        Args:
            years: List of years to scrape
            brands: Optional list of brands to scrape (defaults to top brands)
            headless: Whether to run browsers in headless mode
            debug: Whether to enable debug mode
        """
        logger.info(f"Starting master scraper for years: {years}")
        
        # Default brands if not specified
        if not brands:
            brands = [
                "Specialized", "Trek", "Cannondale", "Giant", "Santa-Cruz",
                "Canyon", "BMC", "Cervelo", "Scott", "Kona"
            ]
        
        data_dir = os.path.join(self.run_dir, "data")
        
        # 1. First try pattern-based direct scraper (most reliable for strict anti-bot sites)
        pattern_output_dir = os.path.join(data_dir, "pattern_scraper")
        os.makedirs(pattern_output_dir, exist_ok=True)
        
        for year in years:
            pattern_cmd = [
                "python3", "pattern_bike_scraper.py",
                "--years", str(year),
                "--output-dir", pattern_output_dir,
                "--output", os.path.join(pattern_output_dir, f"pattern_bikes_{year}.csv"),
                "--brands", ",".join(brands),
                "--max-models", "15"
            ]
            
            if headless:
                pattern_cmd.append("--headless")
            if debug:
                pattern_cmd.append("--debug")
                
            self.run_scraper(f"Pattern Scraper - {year}", pattern_cmd)
            
            # Count found bikes
            pattern_csv = os.path.join(pattern_output_dir, f"pattern_bikes_{year}.csv")
            if os.path.exists(pattern_csv):
                bike_count = self._count_bikes_in_csv(pattern_csv)
                self.state["bike_counts"][f"pattern_scraper_{year}"] = bike_count
                self._save_state()
        
        # 2. Try direct bike scraper for each year
        direct_output_dir = os.path.join(data_dir, "direct_scraper")
        os.makedirs(direct_output_dir, exist_ok=True)
        
        for year in years:
            direct_cmd = [
                "python3", "direct_bike_scraper.py",
                "--years", str(year),
                "--output-dir", direct_output_dir,
                "--brands", ",".join(brands[:5])  # Limit to top brands
            ]
            
            if headless:
                direct_cmd.append("--headless")
            if debug:
                direct_cmd.append("--debug")
                
            self.run_scraper(f"Direct Scraper - {year}", direct_cmd)
            
            # Count found bikes
            direct_csv = os.path.join(direct_output_dir, "all_bikes.csv")
            if os.path.exists(direct_csv):
                bike_count = self._count_bikes_in_csv(direct_csv)
                self.state["bike_counts"]["direct_scraper"] = bike_count
                self._save_state()
        
        # 3. Hierarchical scraper as final attempt - only if we have few bikes so far
        combined_bikes = sum(count for scraper, count in self.state["bike_counts"].items())
        if combined_bikes < len(brands) * len(years) * 2:  # If we have less than 2 bikes per brand per year
            logger.info("Low bike count, running hierarchical scraper as final attempt")
            
            hierarchical_output_dir = os.path.join(data_dir, "hierarchical_scraper")
            os.makedirs(hierarchical_output_dir, exist_ok=True)
            
            for year in years:
                hier_cmd = [
                    "python3", "hierarchical_bike_scraper.py",
                    "--year", str(year),
                    "--output", os.path.join(hierarchical_output_dir, f"bikes_{year}"),
                    "--brands", str(min(10, len(brands)))  # Limit to top N brands
                ]
                
                if headless:
                    hier_cmd.append("--headless")
                if debug:
                    hier_cmd.append("--debug")
                    
                self.run_scraper(f"Hierarchical Scraper - {year}", hier_cmd)
                
                # Count found bikes
                hier_csv = os.path.join(hierarchical_output_dir, f"bikes_{year}.csv")
                if os.path.exists(hier_csv):
                    bike_count = self._count_bikes_in_csv(hier_csv)
                    self.state["bike_counts"][f"hierarchical_scraper_{year}"] = bike_count
                    self._save_state()
        
        # 4. Combine all results
        logger.info("Combining all results")
        combine_cmd = [
            "python3", "combine_data.py",
            "--input-dir", data_dir,
            "--output-csv", os.path.join(self.run_dir, "all_bikes_combined.csv"),
            "--output-json", os.path.join(self.run_dir, "all_bikes_combined.json")
        ]
        
        self.run_scraper("Data Combiner", combine_cmd)
        
        # Final bike count
        final_csv = os.path.join(self.run_dir, "all_bikes_combined.csv")
        if os.path.exists(final_csv):
            total_bikes = self._count_bikes_in_csv(final_csv)
            self.state["total_combined_bikes"] = total_bikes
            self._save_state()
            
            logger.info(f"Master scraper completed with {total_bikes} total bikes")
        else:
            logger.warning("No combined output was produced")
        
        return self.state

def main():
    """Main function to run the master scraper"""
    parser = argparse.ArgumentParser(
        description="Master script to orchestrate multiple bike scraping strategies"
    )
    parser.add_argument("--years", type=str, default="2024,2023",
                      help="Comma-separated list of years to scrape (default: 2024,2023)")
    parser.add_argument("--brands", type=str,
                      help="Comma-separated list of brands to scrape")
    parser.add_argument("--output-dir", default="master_output",
                      help="Output directory for all scraped data")
    parser.add_argument("--headless", action="store_true",
                      help="Run browsers in headless mode")
    parser.add_argument("--debug", action="store_true",
                      help="Enable debug mode with additional logging")
    
    args = parser.parse_args()
    
    # Parse years
    years = [int(y.strip()) for y in args.years.split(",")]
    
    # Parse brands if provided
    brands = None
    if args.brands:
        brands = [b.strip() for b in args.brands.split(",")]
    
    # Initialize and run master scraper
    master = MasterScraper(output_dir=args.output_dir)
    
    try:
        result = master.run_all_scrapers(
            years=years,
            brands=brands,
            headless=args.headless,
            debug=args.debug
        )
        
        # Print summary
        print("\n====== MASTER SCRAPER SUMMARY ======")
        print(f"Run ID: {result['run_id']}")
        print(f"Total bikes: {result.get('total_combined_bikes', 0)}")
        print(f"Completed scrapers: {len(result['completed_scrapers'])}")
        print(f"Failed scrapers: {len(result['failed_scrapers'])}")
        
        print("\nBike counts by scraper:")
        for scraper, count in result.get("bike_counts", {}).items():
            print(f"  {scraper}: {count}")
            
        print(f"\nResults saved to: {master.run_dir}")
        print("==================================\n")
        
    except KeyboardInterrupt:
        print("\nMaster scraper interrupted by user")
    except Exception as e:
        logger.error(f"Error in master scraper: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
