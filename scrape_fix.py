#!/usr/bin/env python3
"""
Direct fix for the scraper file by replacing it with a corrected version
"""
import os
import sys
import shutil
from datetime import datetime

def fix_scraper():
    """Replace the scraper file with a corrected version"""
    scraper_path = "data/bicycles/scrape.py"
    
    if not os.path.exists(scraper_path):
        print(f"❌ Scraper file not found at {scraper_path}")
        return False
    
    # Create backup with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{scraper_path}.bak_replace_{timestamp}"
    try:
        shutil.copy2(scraper_path, backup_path)
        print(f"✅ Created backup of scraper at {backup_path}")
    except Exception as e:
        print(f"Warning: Could not create backup: {e}")
        response = input("Continue without backup? (y/n): ")
        if response.lower() != 'y':
            return False

    # The corrected method with proper indentation
    corrected_method = """    def is_bot_challenge_page(self):
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
        return False"""
        
    try:
        # Read in the file
        with open(scraper_path, 'r') as file:
            content = file.read()
            
        # Find the method that needs to be replaced
        start_pattern = r"\s*def is_bot_challenge_page\(self\):"
        end_pattern = r"\s*def wait_for_bot_challenge\("
        
        # Split the content at these patterns
        import re
        parts = re.split(f"({start_pattern}.*?){end_pattern}", content, flags=re.DOTALL)
        
        if len(parts) != 3:
            print("❌ Could not locate the method to replace correctly.")
            print("Manual fix required. Please edit the file and fix the indentation error.")
            return False
            
        # Reassemble the file with the corrected method
        fixed_content = parts[0] + corrected_method + "\n    def wait_for_bot_challenge(" + parts[2]
        
        # Write the fixed content back
        with open(scraper_path, 'w') as file:
            file.write(fixed_content)
            
        print("✅ Successfully fixed the scraper file!")
        return True
            
    except Exception as e:
        print(f"❌ Error fixing scraper file: {e}")
        import traceback
        traceback.print_exc()
        
        # Try to restore from backup
        try:
            if os.path.exists(backup_path):
                shutil.copy2(backup_path, scraper_path)
                print("✅ Restored original file from backup")
        except:
            print("❌ Failed to restore from backup")
            
        return False

if __name__ == "__main__":
    print("Fixing the scraper file with correct indentation...")
    if fix_scraper():
        print("\nFix completed successfully! Try running the scraper now:")
        print("  python run_scraper.py --year 2024 --output bikes_2024.csv")
    else:
        print("\nFailed to apply the fix automatically.")
        print("You might need to manually edit the file:")
        print("  data/bicycles/scrape.py")
        print("and fix the indentation of the is_bot_challenge_page method.")
