#!/usr/bin/env python3
"""
Main pipeline orchestrator for the crawl-scrape pipeline.
Runs all or specific steps of the 14-step pipeline.
"""

import argparse
import logging
import subprocess
import sys
from pathlib import Path
from typing import List, Optional

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from orchestration.config import STEPS, LOGGING_CONFIG, get_step_config
from orchestration.utils_minimal import logger

def setup_logging():
    """Set up logging configuration."""
    import logging.config
    logging.config.dictConfig(LOGGING_CONFIG)

# Map of step numbers to their execution scripts
STEP_SCRIPTS = {
    1: "01_map/run_map.py",
    2: "02_filter/filter_urls.py",
    3: "03_group/group_urls.py",
    4: "04_probe/probe_template.py",
    5: None,  # Manual step - decision.md
    6: None,  # Manual step - css_selectors.json
    7: "07_sample/crawl_sample.py",
    8: "08_fetch/crawl_full.py",
    9: "09_scrape/parse_dom.py",
    10: "10_dedupe/dedupe.py",
    11: "11_clean/clean.py",
    12: "12_load/load_db.py",
    13: "13_qc/tests.py",
    14: "14_refresh/incremental_crawl.py"
}

# Step names for display
STEP_NAMES = {
    1: "Map - URL Discovery",
    2: "Filter - URL Selection",
    3: "Group - Pattern Recognition",
    4: "Probe - Template Analysis",
    5: "Decide - Strategy Selection (Manual)",
    6: "Plan - Selector Definition (Manual)",
    7: "Sample - Test Extraction",
    8: "Fetch - Full Crawl",
    9: "Scrape - Data Extraction",
    10: "Dedupe - Deduplication",
    11: "Clean - Data Normalization",
    12: "Load - Database Storage",
    13: "QC - Quality Control",
    14: "Refresh - Incremental Updates"
}


class PipelineRunner:
    """Orchestrates the execution of pipeline steps."""
    
    def __init__(self, domain: str, start_step: int = 1, end_step: int = 14):
        """Initialize pipeline runner."""
        self.domain = domain
        self.start_step = start_step
        self.end_step = end_step
        self.base_dir = Path(__file__).parent.parent
        setup_logging()
        
    def validate_steps(self) -> bool:
        """Validate step range."""
        if self.start_step < 1 or self.end_step > 14:
            logger.error("Steps must be between 1 and 14")
            return False
        if self.start_step > self.end_step:
            logger.error("Start step must be <= end step")
            return False
        return True
        
    def check_prerequisites(self, step: int) -> bool:
        """Check if prerequisites for a step are met."""
        # Check if previous step output exists
        if step > 1:
            if step == 2:
                # Check for dump.csv from step 1
                dump_file = self.base_dir / "01_map" / "dump.csv"
                if not dump_file.exists():
                    logger.error(f"Missing dump.csv from step 1. Run step 1 first.")
                    return False
            elif step == 3:
                # Check for all_urls.txt from step 2
                urls_file = self.base_dir / "02_filter" / "all_urls.txt"
                if not urls_file.exists():
                    logger.error(f"Missing all_urls.txt from step 2. Run step 2 first.")
                    return False
            # Add more prerequisite checks as needed
        return True
        
    def run_step(self, step: int) -> bool:
        """Run a single pipeline step."""
        step_name = STEP_NAMES.get(step, f"Step {step}")
        logger.info(f"\n{'='*60}")
        logger.info(f"Running Step {step}: {step_name}")
        logger.info(f"{'='*60}")
        
        # Check prerequisites
        if not self.check_prerequisites(step):
            return False
            
        # Get script path
        script_path = STEP_SCRIPTS.get(step)
        
        # Handle manual steps
        if script_path is None:
            if step == 5:
                logger.info("Step 5 is manual. Please edit 05_decide/decision.md")
                logger.info("Define which URL patterns to scrape and in what order.")
                return True
            elif step == 6:
                logger.info("Step 6 is manual. Please edit 06_plan/css_selectors.json")
                logger.info("Define CSS/XPath selectors for data extraction.")
                return True
            else:
                logger.error(f"No script defined for step {step}")
                return False
                
        # Run the script
        full_script_path = self.base_dir / script_path
        
        if not full_script_path.exists():
            logger.error(f"Script not found: {full_script_path}")
            return False
            
        try:
            # Build command
            cmd = [sys.executable, str(full_script_path)]
            
            # Add domain argument for steps that need it
            if step in [1, 3, 7, 8, 14]:
                if step == 3:
                    cmd.extend(['--domain', self.domain])
                else:
                    cmd.append(self.domain)
                
            logger.info(f"Executing: {' '.join(cmd)}")
            
            # Run the script
            result = subprocess.run(
                cmd,
                cwd=str(self.base_dir),
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"Step {step} failed with exit code {result.returncode}")
                if result.stderr:
                    logger.error(f"Error output:\n{result.stderr}")
                return False
                
            # Log output
            if result.stdout:
                logger.info(f"Output:\n{result.stdout}")
                
            logger.info(f"Step {step} completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error running step {step}: {e}")
            return False
            
    def run(self) -> bool:
        """Run the pipeline for specified step range."""
        if not self.validate_steps():
            return False
            
        logger.info(f"\nStarting pipeline for domain: {self.domain}")
        logger.info(f"Running steps {self.start_step} to {self.end_step}")
        
        # Run each step in sequence
        for step in range(self.start_step, self.end_step + 1):
            if not self.run_step(step):
                logger.error(f"Pipeline failed at step {step}")
                return False
                
        logger.info(f"\n{'='*60}")
        logger.info("Pipeline completed successfully!")
        logger.info(f"{'='*60}")
        return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Run the crawl-scrape pipeline',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Steps:
  1. Map - URL Discovery
  2. Filter - URL Selection  
  3. Group - Pattern Recognition
  4. Probe - Template Analysis
  5. Decide - Strategy Selection (Manual)
  6. Plan - Selector Definition (Manual)
  7. Sample - Test Extraction
  8. Fetch - Full Crawl
  9. Scrape - Data Extraction
  10. Dedupe - Deduplication
  11. Clean - Data Normalization
  12. Load - Database Storage
  13. QC - Quality Control
  14. Refresh - Incremental Updates

Examples:
  # Run entire pipeline
  python run_pipeline.py example.com
  
  # Run only step 1
  python run_pipeline.py example.com --start 1 --end 1
  
  # Run steps 1-3
  python run_pipeline.py example.com --start 1 --end 3
  
  # Run steps 7-12
  python run_pipeline.py example.com --start 7 --end 12
        """
    )
    
    parser.add_argument('domain', help='Domain to process (e.g., example.com)')
    parser.add_argument('--start', type=int, default=1, 
                       help='Starting step number (default: 1)')
    parser.add_argument('--end', type=int, default=14,
                       help='Ending step number (default: 14)')
    
    args = parser.parse_args()
    
    # Clean domain
    domain = args.domain.replace('https://', '').replace('http://', '').rstrip('/')
    
    # Create and run pipeline
    runner = PipelineRunner(domain, args.start, args.end)
    success = runner.run()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()