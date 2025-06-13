#!/usr/bin/env python3
"""
Main orchestration script for the crawl-scrape pipeline.
Runs all pipeline steps in sequence or specific steps as needed.
"""

import argparse
import subprocess
import sys
from pathlib import Path
from typing import List, Optional

from config import config
from utils import setup_logging, ensure_dir


class PipelineRunner:
    """Orchestrates the execution of pipeline steps."""
    
    def __init__(self, target_domain: str):
        """Initialize pipeline runner."""
        self.target_domain = target_domain
        self.logger = setup_logging(
            'pipeline_runner',
            config.dirs['env'] / f'pipeline_{target_domain.replace(".", "_")}.log'
        )
        
        # Define pipeline steps with their scripts
        self.steps = [
            {
                'step': '01_map',
                'name': 'Site Mapping',
                'script': 'run_map.py',
                'required': True,
            },
            {
                'step': '02_filter',
                'name': 'URL Filtering',
                'script': 'filter_urls.py',
                'required': True,
            },
            {
                'step': '03_group',
                'name': 'URL Grouping',
                'script': 'group_urls.py',
                'required': True,
            },
            {
                'step': '04_probe',
                'name': 'Template Probing',
                'script': 'probe_template.py',
                'required': True,
            },
            {
                'step': '05_decide',
                'name': 'Decision Point',
                'script': None,  # Manual step
                'required': False,
            },
            {
                'step': '06_plan',
                'name': 'Extraction Planning',
                'script': None,  # Manual step
                'required': False,
            },
            {
                'step': '07_sample',
                'name': 'Sample Crawling',
                'script': 'crawl_sample.py',
                'required': False,
            },
            {
                'step': '08_fetch',
                'name': 'Full Crawling',
                'script': 'crawl_full.py',
                'required': True,
            },
            {
                'step': '09_scrape',
                'name': 'Data Extraction',
                'script': 'parse_dom.py',  # Will choose between parse_dom.py and parse_json.py
                'required': True,
            },
            {
                'step': '10_dedupe',
                'name': 'Deduplication',
                'script': 'dedupe.py',
                'required': True,
            },
            {
                'step': '11_clean',
                'name': 'Data Cleaning',
                'script': 'clean.py',
                'required': True,
            },
            {
                'step': '12_load',
                'name': 'Database Loading',
                'script': 'load_db.py',
                'required': True,
            },
            {
                'step': '13_qc',
                'name': 'Quality Control',
                'script': 'tests.py',
                'required': False,
            },
            {
                'step': '14_refresh',
                'name': 'Incremental Updates',
                'script': 'incremental_crawl.py',
                'required': False,
            },
        ]
    
    def run_step(self, step_info: dict) -> bool:
        """Run a single pipeline step."""
        step_num = step_info['step']
        step_name = step_info['name']
        script = step_info['script']
        
        self.logger.info(f"Starting {step_num}: {step_name}")
        
        # Handle manual steps
        if script is None:
            self.logger.info(f"{step_num} is a manual step. Please complete it before continuing.")
            if step_info['required']:
                response = input(f"Have you completed {step_name}? (y/n): ")
                if response.lower() != 'y':
                    self.logger.error(f"Pipeline stopped at {step_num}")
                    return False
            return True
        
        # Construct script path
        script_path = config.dirs[step_num.split('_')[1]] / script
        
        if not script_path.exists():
            self.logger.error(f"Script not found: {script_path}")
            if step_info['required']:
                return False
            else:
                self.logger.warning(f"Skipping optional step {step_num}")
                return True
        
        # Special handling for scrape step
        if step_num == '09_scrape':
            # Check if we should use DOM or JSON parser
            plan_file = config.dirs['plan'] / 'api_endpoints.yaml'
            if plan_file.exists():
                self.logger.info("API endpoints found, using JSON parser")
                script_path = config.dirs['scrape'] / 'parse_json.py'
        
        # Run the script
        try:
            cmd = [sys.executable, str(script_path), '--domain', self.target_domain]
            self.logger.info(f"Running: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            if result.stdout:
                self.logger.info(f"Output: {result.stdout}")
            
            self.logger.info(f"Completed {step_num}: {step_name}")
            return True
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Error in {step_num}: {e}")
            if e.stderr:
                self.logger.error(f"Error output: {e.stderr}")
            
            if step_info['required']:
                return False
            else:
                self.logger.warning(f"Continuing despite error in optional step {step_num}")
                return True
    
    def run_pipeline(self, start_step: Optional[str] = None, end_step: Optional[str] = None,
                     skip_steps: Optional[List[str]] = None) -> bool:
        """Run the complete pipeline or a subset of steps."""
        skip_steps = skip_steps or []
        
        # Find start and end indices
        start_idx = 0
        end_idx = len(self.steps)
        
        if start_step:
            for i, step in enumerate(self.steps):
                if step['step'] == start_step:
                    start_idx = i
                    break
            else:
                self.logger.error(f"Start step not found: {start_step}")
                return False
        
        if end_step:
            for i, step in enumerate(self.steps):
                if step['step'] == end_step:
                    end_idx = i + 1
                    break
            else:
                self.logger.error(f"End step not found: {end_step}")
                return False
        
        # Run selected steps
        self.logger.info(f"Running pipeline for domain: {self.target_domain}")
        self.logger.info(f"Steps: {start_idx + 1} to {end_idx}")
        
        for i in range(start_idx, end_idx):
            step = self.steps[i]
            
            if step['step'] in skip_steps:
                self.logger.info(f"Skipping {step['step']}: {step['name']}")
                continue
            
            success = self.run_step(step)
            if not success:
                self.logger.error(f"Pipeline failed at {step['step']}")
                return False
        
        self.logger.info("Pipeline completed successfully!")
        return True
    
    def run_refresh(self) -> bool:
        """Run only the refresh step for incremental updates."""
        self.logger.info(f"Running incremental refresh for domain: {self.target_domain}")
        
        refresh_step = {
            'step': '14_refresh',
            'name': 'Incremental Updates',
            'script': 'incremental_crawl.py',
            'required': True,
        }
        
        return self.run_step(refresh_step)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Run the crawl-scrape pipeline',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run complete pipeline
  python run_pipeline.py example.com
  
  # Run from a specific step
  python run_pipeline.py example.com --start 07_sample
  
  # Run up to a specific step
  python run_pipeline.py example.com --end 09_scrape
  
  # Run a range of steps
  python run_pipeline.py example.com --start 07_sample --end 11_clean
  
  # Skip certain steps
  python run_pipeline.py example.com --skip 05_decide 06_plan
  
  # Run only refresh
  python run_pipeline.py example.com --refresh
        """
    )
    
    parser.add_argument('domain', help='Target domain to scrape')
    parser.add_argument('--start', help='Start from this step (e.g., 07_sample)')
    parser.add_argument('--end', help='End at this step (e.g., 11_clean)')
    parser.add_argument('--skip', nargs='+', help='Skip these steps')
    parser.add_argument('--refresh', action='store_true', help='Run only incremental refresh')
    
    args = parser.parse_args()
    
    # Create pipeline runner
    runner = PipelineRunner(args.domain)
    
    # Run pipeline
    if args.refresh:
        success = runner.run_refresh()
    else:
        success = runner.run_pipeline(
            start_step=args.start,
            end_step=args.end,
            skip_steps=args.skip
        )
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()