#!/usr/bin/env python3
"""
Script to modify the existing scraper to use saved Cloudflare cookies.
"""

import os
import sys
import glob
import shutil

def update_scraper_files():
    # Find the latest cookies file
    cookies_dir = "cookies"
    if not os.path.exists(cookies_dir):
        print("❌ No cookies directory found. Run run_solver.py first.")
        return False
        
    cookie_files = glob.glob(os.path.join(cookies_dir, "*_cookies.txt"))
    if not cookie_files:
        print("❌ No cookie files found. Run run_solver.py first.")
        return False
        
    # Get the most recent cookies file
    latest_cookie_file = max(cookie_files, key=os.path.getmtime)
    print(f"Found cookies file: {latest_cookie_file}")
    
    # Read the scraper file
    scraper_path = "data/bicycles/scrape.py"
    if not os.path.exists(scraper_path):
        print(f"❌ Scraper file not found at {scraper_path}")
        return False
        
    try:
        with open(scraper_path, 'r') as f:
            scraper_code = f.read()
    except Exception as e:
        print(f"❌ Error reading scraper file: {e}")
        return False
    
    # Check if we've already modified the file
    if "from cloudflare_helper import" in scraper_code:
        print("✅ Scraper already updated to use cookies.")
        return True
    
    # Add the import
    import_line = "from selenium.webdriver.common.by import By"
    new_import = "from selenium.webdriver.common.by import By\nimport glob\nfrom cloudflare_helper import apply_cookies_to_webdriver"
    scraper_code = scraper_code.replace(import_line, new_import)
    
    # Add cookie loading to the navigate_to_url method
    nav_method = "def navigate_to_url(self, url, retry_count=2, wait_time=5):"
    cookie_code = """def navigate_to_url(self, url, retry_count=2, wait_time=5):
        \"\"\"
        Navigate to URL with bot protection handling and optional manual intervention
        
        Args:
            url: URL to navigate to
            retry_count: Number of retry attempts
            wait_time: Base time to wait for page load
            
        Returns:
            bool: True if navigation was successful, False otherwise
        \"\"\"
        logger.info(f"Navigating to: {url}")
        
        # First navigate to the domain root to set cookies
        parsed_url = url.split("//")[-1].split("/")[0]
        domain_root = f"https://{parsed_url}"
        
        # Try to load cookies
        cookies_dir = "cookies"
        cookie_file = os.path.join(cookies_dir, f"{parsed_url}_cookies.txt")
        cookies_loaded = False
        
        # If specific cookie file doesn't exist, try to find any cookie file for the domain
        if not os.path.exists(cookie_file) and os.path.exists(cookies_dir):
            possible_files = glob.glob(os.path.join(cookies_dir, f"{parsed_url.split('.')[-2]}*_cookies.txt"))
            if possible_files:
                cookie_file = possible_files[0]
        
        if os.path.exists(cookie_file):
            logger.info(f"Found cookies file: {cookie_file}")
            try:
                self.driver.get(domain_root)
                time.sleep(2)
                
                # Read and apply cookies
                with open(cookie_file, 'r') as f:
                    cookies_str = f.read().strip()
                    for cookie_pair in cookies_str.split(';'):
                        if cookie_pair.strip():
                            try:
                                name, value = cookie_pair.strip().split('=', 1)
                                self.driver.add_cookie({
                                    "name": name, 
                                    "value": value, 
                                    "domain": parsed_url
                                })
                            except Exception as e:
                                logger.warning(f"Error adding cookie: {e}")
                
                cookies_loaded = True
                logger.info("Cookies loaded successfully!")
                
                # Refresh the page to apply cookies
                self.driver.refresh()
                time.sleep(2)
            except Exception as e:
                logger.error(f"Error loading cookies: {e}")
        
        # Continue with normal navigation
        for attempt in range(retry_count + 1):
            try:
                self.driver.get(url)
                """
                
    scraper_code = scraper_code.replace(nav_method, cookie_code)
    
    # Create a backup of the original
    backup_path = scraper_path + ".bak"
    try:
        # Use shutil.copy2 to preserve file metadata
        shutil.copy2(scraper_path, backup_path)
        print(f"✅ Created backup of original scraper at {backup_path}")
    except Exception as e:
        print(f"⚠️ Warning: Could not create backup: {e}")
    
    # Write the updated file
    try:
        with open(scraper_path, 'w') as f:
            f.write(scraper_code)
        print("✅ Successfully updated scraper to use Cloudflare cookies!")
        return True
    except Exception as e:
        print(f"❌ Error writing to scraper file: {e}")
        return False

if __name__ == "__main__":
    if update_scraper_files():
        print("\nThe scraper has been updated to use saved cookies.")
        print("This should reduce the need to solve Cloudflare challenges.")
        print("\nYou can now run the scraper as usual:")
        print("python run_scraper.py")
    else:
        print("\nFailed to update the scraper.")
        print("Please run run_solver.py first to solve a Cloudflare challenge.")
