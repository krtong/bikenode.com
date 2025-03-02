#!/usr/bin/env python3
"""
Fix for the constructor error in the scraper file
"""
import os
import sys
import shutil
from datetime import datetime

def fix_file():
    """Fix the constructor error in the scraper file by properly structuring the class"""
    scraper_path = "data/bicycles/scrape.py"
    
    if not os.path.exists(scraper_path):
        print(f"❌ Scraper file not found at {scraper_path}")
        return False
    
    # Create backup with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{scraper_path}.bak_constructor_{timestamp}"
    try:
        shutil.copy2(scraper_path, backup_path)
        print(f"✅ Created backup of scraper at {backup_path}")
    except Exception as e:
        print(f"Warning: Could not create backup: {e}")
        response = input("Continue without backup? (y/n): ")
        if response.lower() != 'y':
            return False
    
    # Read the file content
    try:
        with open(scraper_path, 'r') as f:
            content = f.read()
            
        # Create a completely new implementation with proper indentation
        proper_implementation = """from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import csv
import json
import logging
import os
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NinetyNineSpokesScraper:
    def __init__(self, headless=False, debug_dir="debug_output", allow_manual_intervention=False):
        \"\"\"
        Initialize the scraper with optional headless mode
        
        Args:
            headless: Whether to run in headless mode (no visible browser)
            debug_dir: Directory to save debug output
            allow_manual_intervention: Whether to allow user to manually solve challenges
        \"\"\"
        options = webdriver.ChromeOptions()
        # Add options to better mimic a real browser and avoid detection
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--window-size=1920,1080")
        
        # Add a realistic user agent
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15"
        ]
        options.add_argument(f"--user-agent={random.choice(user_agents)}")
        
        # Disable automation flags
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Only use headless if specified AND manual intervention is not allowed
        # This ensures the browser is visible when manual intervention is needed
        if headless and not allow_manual_intervention:
            options.add_argument('--headless')
            
        self.driver = webdriver.Chrome(options=options)
        self.allow_manual_intervention = allow_manual_intervention
        
        # Executing CDP commands to prevent detection
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": \"\"\"
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            \"\"\"
        })
        
        self.bikes = []
        
        # Create debug directory if it doesn't exist
        self.debug_dir = debug_dir
        os.makedirs(self.debug_dir, exist_ok=True)
    
    def is_bot_challenge_page(self):
        \"\"\"
        Check if the current page is a bot challenge/protection page
        Now with improved detection to avoid false positives
        \"\"\"
        page_title = self.driver.title.lower()
        
        # Check title first - most reliable indicator
        title_indicators = ["just a moment", "checking your browser", "security check"]
        if any(indicator in page_title for indicator in title_indicators):
            logger.info(f"Bot challenge detected in page title: {page_title}")
            return True
            
        # Check for specific Cloudflare challenge elements
        try:
            cf_challenge = self.driver.find_element(By.ID, "cf-challenge-running")
            if cf_challenge:
                logger.info("Bot challenge detected: found cf-challenge-running element")
                return True
        except:
            pass
            
        try:
            cf_error = self.driver.find_element(By.ID, "cf-error-details")
            if cf_error:
                logger.info("Bot challenge detected: found cf-error-details element")
                return True
        except:
            pass
        
        # Check for challenge in URL
        current_url = self.driver.current_url.lower()
        challenge_url_patterns = ["challenge", "captcha", "__cf_chl"]
        if any(pattern in current_url for pattern in challenge_url_patterns):
            logger.info(f"Bot challenge detected in URL: {current_url}")
            return True
            
        # For page content, require more specific challenge phrases
        # Simple mentions of cloudflare or robot are no longer enough
        page_source = self.driver.page_source.lower()
        strong_phrases = [
            "please complete the security check",
            "checking if the site connection is secure",
            "please wait while we verify",
            "protection system",
            "browser check"
        ]
        
        if any(phrase in page_source for phrase in strong_phrases):
            logger.info("Bot challenge detected: found strong challenge phrase in content")
            return True
            
        # If we made it here, it's a normal page (not a challenge)
        return False
"""
        # Extract the remaining methods from the original file
        remainder = content[content.find("def wait_for_bot_challenge"):]
        
        # Ensure proper indentation for the remainder of the methods
        # Each method should be indented with 4 spaces
        lines = remainder.split("\n")
        properly_indented_remainder = []
        for line in lines:
            # If line starts with "def ", it's a method definition
            if line.lstrip().startswith("def "):
                # Add 4 spaces indentation to method definition
                properly_indented_remainder.append("    " + line.lstrip())
            elif line.strip():  # Not an empty line
                # Add 8 spaces indentation to method contents
                properly_indented_remainder.append("    " + line)
            else:
                # Keep empty lines as is
                properly_indented_remainder.append(line)
        
        # Combine the proper implementation with the fixed remainder
        final_content = proper_implementation + "\n".join(properly_indented_remainder)
        
        # Write the fixed content back to the file
        with open(scraper_path, 'w') as f:
            f.write(final_content)
            
        print("✅ Successfully fixed the constructor error!")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing file: {e}")
        import traceback
        traceback.print_exc()
        
        # Try to restore from backup if possible
        if os.path.exists(backup_path):
            try:
                shutil.copy2(backup_path, scraper_path)
                print("✅ Restored original file from backup")
            except:
                print("❌ Failed to restore from backup")
                
        return False

if __name__ == "__main__":
    print("Fixing constructor error in scrape.py...")
    if fix_file():
        print("\nFix completed successfully! You can now run the scraper again.")
        print("Try: python run_scraper.py --year 2024 --output bikes_2024.csv")
    else:
        print("\nFailed to apply the fix. Please check the error messages above.")
