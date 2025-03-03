#!/usr/bin/env python3
"""
Batch Scraper for 99spokes.com bike data

This script manages multiple instances of hierarchical_bike_scraper.py to efficiently
distribute scraping workloads across years, brands, and families. It supports both
parallel execution and sequential batching with configurable delays.
"""

import os
import sys
import time
import json
import random
import argparse
import logging
import subprocess
import multiprocessing
from pathlib import Path
from datetime import datetime
from threading import Thread
from queue import Queue, Empty

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("batch_scraper.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class BatchScraper:
    """
    Manages multiple instances of the hierarchical bike scraper to
    distribute workload and optimize scraping performance
    """
    
    def __init__(self, output_dir="batched_output", max_workers=3):
        """Initialize the batch scraper with configuration"""
        self.output_dir = output_dir
        self.max_workers = max_workers
        self.state_file = os.path.join(output_dir, "batch_state.json")
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "logs"), exist_ok=True)
        
        # Load state if available
        self.state = self._load_state() or {
            "completed_jobs": [],
            "failed_jobs": [],
            "in_progress": [],
            "job_results": {},
            "last_run": None
        }
        
        # Job tracking
        self.job_queue = Queue()
        self.active_jobs = 0
        self.result_data = {}
        
        # All supported years in order of priority
        self.all_years = [
            2026, 2025, 2024, 2023, 2022, 2021, 2020,
            2019, 2018, 2017, 2016, 2015, 2014, 2013,
            2012, 2011, 2010, 2009, 2008, 2007, 2006,
            2005, 2004, 2003, 2002, 2001, 2000
        ]
    
    def _load_state(self):
        """Load batch state from file"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading state file: {e}")
        return None
    
    def _save_state(self):
        """Save current batch state to file"""
        try:
            self.state["last_run"] = datetime.now().isoformat()
            with open(self.state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
            logger.info(f"Saved batch state to {self.state_file}")
        except Exception as e:
            logger.error(f"Error saving state file: {e}")
    
    def create_year_jobs(self, years=None, brand_filters=None):
        """Create jobs to scrape years, optionally with brand filters"""
        if years is None:
            years = self.all_years
        
        jobs = []
        
        for year in years:
            job_id = f"year_{year}"
            if brand_filters:
                for brand in brand_filters:
                    brand_job_id = f"year_{year}_brand_{brand.lower().replace(' ', '_')}"
                    
                    # Skip if already completed
                    if brand_job_id in self.state["completed_jobs"]:
                        logger.info(f"Skipping completed job: {brand_job_id}")
                        continue
                    
                    job = {
                        "id": brand_job_id,
                        "type": "year_brand",
                        "year": year,
                        "brand": brand,
                        "command": [
                            "python3", "hierarchical_bike_scraper.py",
                            "--year", str(year),
                            "--brand-filter", brand,
                            "--output", os.path.join(
                                self.output_dir, 
                                f"bikes_{year}_{brand.lower().replace(' ', '_')}"
                            )
                        ]
                    }
                    jobs.append(job)
            else:
                # Skip if already completed
                if job_id in self.state["completed_jobs"]:
                    logger.info(f"Skipping completed job: {job_id}")
                    continue
                    
                job = {
                    "id": job_id,
                    "type": "year",
                    "year": year,
                    "command": [
                        "python3", "hierarchical_bike_scraper.py",
                        "--year", str(year),
                        "--output", os.path.join(self.output_dir, f"bikes_{year}")
                    ]
                }
                jobs.append(job)
        
        logger.info(f"Created {len(jobs)} year-based jobs")
        return jobs
    
    def create_brand_jobs(self, brands, years=None):
        """Create jobs to scrape specific brands across multiple years"""
        if years is None:
            # Default to recent years (2020-2026)
            years = [y for y in self.all_years if y >= 2020]
        
        jobs = []
        
        for brand in brands:
            brand_key = brand.lower().replace(' ', '_')
            
            for year in years:
                job_id = f"brand_{brand_key}_year_{year}"
                
                # Skip if already completed
                if job_id in self.state["completed_jobs"]:
                    logger.info(f"Skipping completed job: {job_id}")
                    continue
                
                job = {
                    "id": job_id,
                    "type": "brand_year",
                    "brand": brand,
                    "year": year,
                    "command": [
                        "python3", "hierarchical_bike_scraper.py",
                        "--year", str(year),
                        "--brand-filter", brand,
                        "--output", os.path.join(
                            self.output_dir, 
                            f"bikes_{brand_key}_{year}"
                        )
                    ]
                }
                jobs.append(job)
        
        logger.info(f"Created {len(jobs)} brand-based jobs")
        return jobs
    
    def worker(self, worker_id):
        """Worker function to process jobs from the queue"""
        logger.info(f"Starting worker {worker_id}")
        
        while True:
            try:
                # Get a job from the queue
                try:
                    job = self.job_queue.get(block=True, timeout=5)
                except Empty:
                    # No more jobs
                    break
                
                job_id = job["id"]
                logger.info(f"Worker {worker_id} processing job: {job_id}")
                
                # Mark job as in progress
                self.state["in_progress"].append(job_id)
                self._save_state()
                
                # Create log file for this job
                log_file = os.path.join(self.output_dir, "logs", f"{job_id}.log")
                
                # Execute the command
                start_time = time.time()
                command = job["command"]
                
                try:
                    # Run the command and capture output
                    with open(log_file, 'w') as f:
                        process = subprocess.Popen(
                            command,
                            stdout=f,
                            stderr=subprocess.STDOUT
                        )
                        exit_code = process.wait()
                    
                    duration = time.time() - start_time
                    
                    # Check if the job was successful
                    if exit_code == 0:
                        logger.info(f"Worker {worker_id} completed job {job_id} in {duration:.1f} seconds")
                        
                        # Record job success
                        self.state["completed_jobs"].append(job_id)
                        if job_id in self.state["in_progress"]:
                            self.state["in_progress"].remove(job_id)
                            
                        # Record results
                        self.state["job_results"][job_id] = {
                            "status": "completed",
                            "duration": duration,
                            "completed_at": datetime.now().isoformat()
                        }
                    else:
                        logger.warning(f"Worker {worker_id} job {job_id} failed with exit code {exit_code}")
                        
                        # Record job failure
                        self.state["failed_jobs"].append(job_id)
                        if job_id in self.state["in_progress"]:
                            self.state["in_progress"].remove(job_id)
                            
                        # Record results
                        self.state["job_results"][job_id] = {
                            "status": "failed",
                            "exit_code": exit_code,
                            "duration": duration,
                            "failed_at": datetime.now().isoformat()
                        }
                
                except Exception as e:
                    logger.error(f"Worker {worker_id} error on job {job_id}: {e}")
                    
                    # Record job failure
                    self.state["failed_jobs"].append(job_id)
                    if job_id in self.state["in_progress"]:
                        self.state["in_progress"].remove(job_id)
                        
                    # Record results
                    self.state["job_results"][job_id] = {
                        "status": "error",
                        "error": str(e),
                        "failed_at": datetime.now().isoformat()
                    }
                
                # Save state after each job
                self._save_state()
                
                # Add a random delay between jobs to avoid overloading the server
                delay = random.uniform(5, 15)
                logger.info(f"Worker {worker_id} waiting {delay:.1f} seconds before next job")
                time.sleep(delay)
                
                # Mark job as done in the queue
                self.job_queue.task_done()
            
            except Exception as e:
                logger.error(f"Worker {worker_id} unexpected error: {e}")
        
        logger.info(f"Worker {worker_id} finished")
    
    def run_batch(self, jobs, sequential=False):
        """
        Run a batch of jobs, either in parallel or sequentially
        
        Args:
            jobs (list): List of job dictionaries to process
            sequential (bool): If True, run jobs one at a time instead of in parallel
        """
        if not jobs:
            logger.warning("No jobs to process")
            return
        
        logger.info(f"Starting batch with {len(jobs)} jobs" + 
                  (f" sequentially" if sequential else f" using {self.max_workers} workers"))
        
        # Add all jobs to the queue
        for job in jobs:
            self.job_queue.put(job)
        
        if sequential:
            # Process jobs one at a time
            self.worker("sequential")
        else:
            # Create worker threads
            workers = []
            for i in range(self.max_workers):
                worker = Thread(target=self.worker, args=(i+1,))
                worker.daemon = True
                worker.start()
                workers.append(worker)
            
            # Wait for all jobs to complete
            self.job_queue.join()
            
            # Wait for all workers to finish
            for worker in workers:
                worker.join()
        
        logger.info("Batch processing complete")
        
        # Save final state
        self._save_state()
        
        # Print summary
        completed = len(self.state["completed_jobs"])
        failed = len(self.state["failed_jobs"])
        total = completed + failed
        
        print("\n========== BATCH SUMMARY ==========")
        print(f"Total jobs: {total}")
        print(f"Completed: {completed} ({completed/total*100:.1f}%)")
        print(f"Failed: {failed} ({failed/total*100:.1f}%)")
        print("===================================\n")
        
        if failed > 0:
            print("Failed jobs:")
            for job_id in self.state["failed_jobs"]:
                print(f"  - {job_id}")
            print()
    
    def combine_results(self):
        """Combine results from all completed jobs"""
        logger.info("Combining results from all completed jobs")
        
        # Find all CSV files in the output directory
        csv_files = []
        for root, dirs, files in os.walk(self.output_dir):
            for file in files:
                if file.endswith('.csv') and not file.endswith('_combined.csv'):
                    csv_files.append(os.path.join(root, file))
        
        if not csv_files:
            logger.warning("No CSV files found to combine")
            return
        
        logger.info(f"Found {len(csv_files)} CSV files to combine")
        
        # Combine using hierarchical_bike_scraper.py's functionality
        # We could also implement our own combining logic here
        combined_file = os.path.join(self.output_dir, "all_bikes_combined.csv")
        
        try:
            logger.info(f"Running combine command to create {combined_file}")
            command = [
                "python3", "combine_data.py",
                "--input-dir", self.output_dir,
                "--output-csv", combined_file
            ]
            
            result = subprocess.run(command, check=True)
            
            if os.path.exists(combined_file):
                # Count lines to get bike count (minus header)
                with open(combined_file, 'r') as f:
                    bike_count = sum(1 for line in f) - 1
                    
                logger.info(f"Successfully combined {len(csv_files)} files into {combined_file} with {bike_count} bikes")
                print(f"\nCombined results saved to {combined_file} with {bike_count} bikes")
            else:
                logger.error(f"Failed to create combined file {combined_file}")
                
        except Exception as e:
            logger.error(f"Error combining results: {e}")
            print(f"Error combining results: {e}")

def main():
    """Main function to run the batch scraper"""
    parser = argparse.ArgumentParser(
        description="Run multiple instances of hierarchical_bike_scraper.py in batch mode"
    )
    
    # Basic configuration
    parser.add_argument("--output-dir", default="batched_output",
                      help="Directory for output files (default: batched_output)")
    parser.add_argument("--workers", type=int, default=3,
                      help="Maximum number of concurrent workers (default: 3)")
    parser.add_argument("--sequential", action="store_true",
                      help="Run jobs sequentially (one at a time) instead of in parallel")
    
    # Year options
    parser.add_argument("--years", type=str,
                      help="Comma-separated list of years to scrape")
    parser.add_argument("--start-year", type=int, default=2020,
                      help="Start year for range (default: 2020)")
    parser.add_argument("--end-year", type=int, default=2026,
                      help="End year for range (default: 2026)")
    parser.add_argument("--all-years", action="store_true",
                      help="Process all available years (2000-2026)")
    
    # Brand options
    parser.add_argument("--brands", type=str,
                      help="Comma-separated list of brands to scrape")
    parser.add_argument("--top-brands", type=int,
                      help="Scrape only the top N brands")
    
    # Mode options
    parser.add_argument("--by-year", action="store_true",
                      help="Process by year (each job handles all brands for one year)")
    parser.add_argument("--by-brand", action="store_true",
                      help="Process by brand (each job handles one brand across years)")
    parser.add_argument("--by-year-brand", action="store_true",
                      help="Process by year-brand combination (most granular)")
    
    # Finalization options
    parser.add_argument("--combine", action="store_true",
                      help="Combine all results after batch completion")
    
    args = parser.parse_args()
    
    # Initialize batch scraper
    batch_scraper = BatchScraper(
        output_dir=args.output_dir,
        max_workers=args.workers
    )
    
    # Determine years to process
    years = None
    if args.all_years:
        years = batch_scraper.all_years
    elif args.years:
        years = [int(y.strip()) for y in args.years.split(",")]
    else:
        years = list(range(args.start_year, args.end_year + 1))
    
    # Determine brands to process
    brands = None
    if args.brands:
        brands = [b.strip() for b in args.brands.split(",")]
    
    # Create jobs based on selected mode
    jobs = []
    
    if args.by_brand and brands:
        # Create jobs by brand (each brand across specified years)
        jobs = batch_scraper.create_brand_jobs(brands, years)
    elif args.by_year_brand and brands:
        # Create jobs by year-brand combination
        jobs = batch_scraper.create_year_jobs(years, brands)
    elif args.by_year or not (args.by_brand or args.by_year_brand):
        # Default to by-year mode if not specified
        jobs = batch_scraper.create_year_jobs(years)
    
    # Run the batch
    batch_scraper.run_batch(jobs, sequential=args.sequential)
    
    # Combine results if requested
    if args.combine:
        batch_scraper.combine_results()

if __name__ == "__main__":
    main()
