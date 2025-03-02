#!/usr/bin/env python3
"""
Utility script to improve bot challenge detection and handling in your bike scraper
"""
import os
import sys
import argparse
import re
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class ChallengeTester:
    def __init__(self, headless=False):
        """Initialize the challenge tester with browser configuration"""
        options = Options()
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--window-size=1920,1080")
        
        # Use a realistic user agent
        user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        options.add_argument(f"--user-agent={user_agent}")
        
        if headless:
            options.add_argument('--headless')
            
        # Disable automation flags
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Initialize browser
        self.driver = webdriver.Chrome(options=options)
        
        # Mask webdriver to avoid detection
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            '''
        })

    def navigate_to_url(self, url, wait_time=5):
        """Navigate to a URL and handle page loading"""
        print(f"Navigating to: {url}")
        
        try:
            self.driver.get(url)
            time.sleep(wait_time)  # Wait for page to load
            return True
        except Exception as e:
            print(f"Error navigating to {url}: {e}")
            return False

    def test_challenge_detection(self, url=None):
        """Test various challenge detection methods"""
        if url:
            self.navigate_to_url(url)
        
        # Take screenshot for reference
        self.driver.save_screenshot("page_state.png")
        print("✅ Screenshot saved as page_state.png")
            
        print("\nTesting challenge detection methods...")
        
        # Method 1: Page title check
        title = self.driver.title.lower()
        title_indicators = ["just a moment", "checking your browser", "security check", "cloudflare"]
        title_match = any(indicator in title for indicator in title_indicators)
        
        print(f"• Method 1 (Title): {'DETECTED' if title_match else 'NOT DETECTED'}")
        print(f"  Current title: \"{self.driver.title}\"")
        
        # Method 2: Element text check
        challenge_text = ["checking your browser", "verify you are human", "security check"]
        
        elements_with_text = []
        for text in challenge_text:
            elements = self.driver.find_elements(By.XPATH, f"//*[contains(text(), '{text}')]")
            elements_with_text.extend(elements)
            
        print(f"• Method 2 (Text): {'DETECTED' if elements_with_text else 'NOT DETECTED'}")
        if elements_with_text:
            print(f"  Found {len(elements_with_text)} elements with challenge text")
        
        # Method 3: CloudFlare elements
        cf_elements = self.driver.find_elements(By.XPATH, 
            "//*[contains(@class, 'cf-') or contains(@id, 'cf-') or contains(@class, 'cloudflare')]")
        
        print(f"• Method 3 (CloudFlare): {'DETECTED' if cf_elements else 'NOT DETECTED'}")
        if cf_elements:
            print(f"  Found {len(cf_elements)} CloudFlare-related elements")
        
        # Method 4: CAPTCHA elements
        captcha_elements = self.driver.find_elements(By.XPATH, 
            "//*[contains(@class, 'captcha') or contains(@id, 'captcha') or contains(@src, 'captcha')]")
        
        print(f"• Method 4 (CAPTCHA): {'DETECTED' if captcha_elements else 'NOT DETECTED'}")
        if captcha_elements:
            print(f"  Found {len(captcha_elements)} CAPTCHA-related elements")
        
        # Method 5: Content check (inverse detection)
        content_elements = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/bikes/')]")
        content_missing = len(content_elements) < 3  # Expecting at least 3 bike links on a normal page
        
        print(f"• Method 5 (Content): {'DETECTED' if content_missing else 'NOT DETECTED'}")
        print(f"  Found {len(content_elements)} bike links")
        
        # Summary
        is_challenge = title_match or len(elements_with_text) > 0 or len(cf_elements) > 0 or len(captcha_elements) > 0
        
        print("\nVerdict:")
        if is_challenge:
            print("❌ CHALLENGE PAGE DETECTED")
        elif content_missing:
            print("⚠️ NO CHALLENGE DETECTED, BUT CONTENT MISSING (possible stealth blocking)")
        else:
            print("✅ NO CHALLENGE DETECTED, CONTENT PRESENT (page loaded normally)")
            
        return is_challenge

    def generate_detection_code(self):
        """Generate improved challenge detection code"""
        code = """
def is_challenge_page(self):
    \"\"\"Check if the current page is a security challenge or bot detection page\"\"\"
    # Method 1: Check page title
    page_title = self.driver.title.lower()
    title_indicators = ["security check", "checking your browser", "just a moment", 
                        "attention required", "cloudflare", "captcha"]
    
    if any(indicator in page_title for indicator in title_indicators):
        return True
        
    # Method 2: Check for specific challenge text
    challenge_text_patterns = [
        "checking your browser", "verify you are human", "security check", 
        "please wait", "browser check", "please complete the security check"
    ]
    
    try:
        for pattern in challenge_text_patterns:
            elements = self.driver.find_elements(By.XPATH, f"//*[contains(text(), '{pattern}')]")
            if elements:
                return True
    except:
        pass
        
    # Method 3: Check for CloudFlare specific elements
    try:
        cf_elements = self.driver.find_elements(By.XPATH, 
            "//*[contains(@class, 'cf-') or contains(@id, 'cf-') or contains(@class, 'cloudflare')]")
        if cf_elements:
            return True
    except:
        pass
    
    # Method 4: Check for CAPTCHA elements
    try:
        captcha_elements = self.driver.find_elements(By.XPATH, 
            "//*[contains(@class, 'captcha') or contains(@id, 'captcha') or contains(@src, 'captcha')]")
        if captcha_elements:
            return True
    except:
        pass
    
    # Method 5: Check for iframe (common in challenges)
    try:
        iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
        if iframes and len(self.driver.find_elements(By.XPATH, "//a")) < 5:
            # If there are iframes but very few links, likely a challenge page
            return True
    except:
        pass
    
    # If we got here, no challenge was detected
    return False
"""
        return code

    def patch_file(self, file_path):
        """Patch a file with improved challenge detection code"""
        if not os.path.exists(file_path):
            print(f"Error: File {file_path} not found")
            return False
            
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            # Find the is_challenge_page function
            pattern = r'def\s+is_challenge_page\s*\([^\)]*\).*?(?=def|$)'
            match = re.search(pattern, content, re.DOTALL)
            
            if not match:
                print(f"Could not find is_challenge_page function in {file_path}")
                return False
                
            # Replace with our improved version
            improved_code = self.generate_detection_code()
            new_content = content.replace(match.group(0), improved_code)
            
            # Create backup
            with open(f"{file_path}.bak", 'w') as f:
                f.write(content)
                
            # Write updated file
            with open(file_path, 'w') as f:
                f.write(new_content)
                
            print(f"✅ Updated {file_path} with improved challenge detection")
            print(f"✅ Backup saved as {file_path}.bak")
            return True
            
        except Exception as e:
            print(f"Error patching file: {e}")
            return False

    def close(self):
        """Close the browser"""
        self.driver.quit()
        print("Browser closed")

def find_scraper_files():
    """Find all potential scraper files in the project"""
    project_path = "/Users/kevintong/Documents/Code/bikenode.com"
    scraper_files = []
    
    for root, _, files in os.walk(project_path):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r') as f:
                    content = f.read()
                    if "is_challenge_page" in content and "selenium" in content:
                        scraper_files.append(file_path)
    
    return scraper_files

def main():
    parser = argparse.ArgumentParser(description="Test and improve challenge detection")
    parser.add_argument("--url", default="https://99spokes.com/bikes", help="URL to test")
    parser.add_argument("--visible", action="store_true", help="Make browser visible")
    parser.add_argument("--patch", action="store_true", help="Patch scraper files with improved detection")
    parser.add_argument("--file", help="Specific file to patch")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 80)
    print("CHALLENGE DETECTION TESTER & IMPROVER")
    print("=" * 80 + "\n")
    
    tester = ChallengeTester(headless=not args.visible)
    
    try:
        if args.patch:
            if args.file:
                # Patch specific file
                tester.patch_file(args.file)
            else:
                # Find and patch all scraper files
                scraper_files = find_scraper_files()
                if not scraper_files:
                    print("No scraper files found with is_challenge_page function")
                else:
                    print(f"Found {len(scraper_files)} scraper files to patch")
                    for file_path in scraper_files:
                        tester.patch_file(file_path)
        else:
            # Test detection
            tester.navigate_to_url(args.url)
            is_challenge = tester.test_challenge_detection()
            
            # Show the code for improved detection
            if is_challenge:
                print("\nGenerated improved challenge detection code you can use:")
                print("-" * 80)
                print(tester.generate_detection_code())
                print("-" * 80)
                print("\nTo automatically patch your files, run with --patch")
            else:
                print("\nNo challenge detected. If you're still having issues, run with --patch")
                print("to improve the challenge detection in your scraper files.")
    finally:
        tester.close()

if __name__ == "__main__":
    main()
