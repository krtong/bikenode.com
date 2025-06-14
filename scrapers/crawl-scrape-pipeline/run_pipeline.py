#!/usr/bin/env python3
"""
Main pipeline runner for the crawl-scrape pipeline.
Executes all steps in sequence or specific steps as needed.
"""
import argparse
import logging
import sys
import subprocess
from pathlib import Path
from typing import List, Optional

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from orchestration.config import STEPS, LOGGING_CONFIG, get_step_config
from orchestration.utils_minimal import logger

# Configure logging
logging.config.dictConfig(LOGGING_CONFIG)


class PipelineRunner:
    """Orchestrates the execution of the crawl-scrape pipeline."""
    
    def __init__(self, domain: str, start_step: Optional[str] = None, end_step: Optional[str] = None):
        self.domain = domain
        self.start_step = start_step or "01_map"
        self.end_step = end_step or "13_qc"
        self.step_order = list(STEPS.keys())
        
    def get_steps_to_run(self) -> List[str]:
        """Determine which steps to run based on start and end parameters."""
        try:
            start_idx = self.step_order.index(self.start_step)
            end_idx = self.step_order.index(self.end_step) + 1
            return self.step_order[start_idx:end_idx]
        except ValueError as e:
            logger.error(f"Invalid step name: {e}")
            sys.exit(1)
    
    def run_step(self, step_name: str) -> bool:
        """Run a single pipeline step."""
        logger.info(f"{'='*60}")
        logger.info(f"Running step: {step_name}")
        logger.info(f"{'='*60}")
        
        step_dir = STEPS[step_name]
        step_config = get_step_config(step_name)
        
        # Map step names to their execution scripts
        step_scripts = {
            "01_map": "simple_map.py",
            "02_filter": "filter_urls.py",
            "03_group": "group_urls.py",
            "04_probe": "probe_template.py",
            "07_sample": "crawl_sample.py",
            "08_fetch": "crawl_full.py",
            "09_scrape": "parse_dom.py",
            "10_dedupe": "dedupe.py",
            "11_clean": "clean.py",
            "12_load": "load_db.py",
            "13_qc": "tests.py",
            "14_refresh": "incremental_crawl.py",
        }
        
        script_name = step_scripts.get(step_name)
        if not script_name:
            logger.warning(f"No script defined for step {step_name}, skipping...")
            return True
        
        script_path = step_dir / script_name
        
        if not script_path.exists():
            logger.error(f"Script not found: {script_path}")
            return False
        
        # Prepare command with domain argument
        cmd = [sys.executable, str(script_path)]
        
        # Add domain argument for steps that need it
        if step_name in ["01_map", "03_group", "07_sample", "08_fetch"]:
            if step_name == "03_group":
                cmd.extend(["--domain", self.domain])
            else:
                cmd.append(self.domain)
        
        try:
            # Run the step
            result = subprocess.run(
                cmd,
                cwd=str(step_dir),
                capture_output=True,
                text=True,
                check=True
            )
            
            if result.stdout:
                logger.info(f"Output:\n{result.stdout}")
            
            logger.info(f"Step {step_name} completed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Step {step_name} failed with exit code {e.returncode}")
            if e.stderr:
                logger.error(f"Error output:\n{e.stderr}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error in step {step_name}: {e}")
            return False
    
    def run(self) -> bool:
        """Run the complete pipeline."""
        logger.info(f"Starting pipeline for domain: {self.domain}")
        steps_to_run = self.get_steps_to_run()
        logger.info(f"Steps to run: {', '.join(steps_to_run)}")
        
        for step in steps_to_run:
            if not self.run_step(step):
                logger.error(f"Pipeline failed at step: {step}")
                return False
        
        logger.info("Pipeline completed successfully!")
        return True


def main():
    """Main entry point for the pipeline runner."""
    parser = argparse.ArgumentParser(
        description="Run the crawl-scrape pipeline for a given domain"
    )
    parser.add_argument(
        "domain",
        help="Domain to crawl (e.g., quotes.toscrape.com)"
    )
    parser.add_argument(
        "--start",
        default="01_map",
        help="Step to start from (default: 01_map)"
    )
    parser.add_argument(
        "--end",
        default="13_qc",
        help="Step to end at (default: 13_qc)"
    )
    parser.add_argument(
        "--step",
        help="Run only a specific step"
    )
    
    args = parser.parse_args()
    
    # If specific step is requested, run only that step
    if args.step:
        start_step = end_step = args.step
    else:
        start_step = args.start
        end_step = args.end
    
    # Create and run pipeline
    runner = PipelineRunner(args.domain, start_step, end_step)
    success = runner.run()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()