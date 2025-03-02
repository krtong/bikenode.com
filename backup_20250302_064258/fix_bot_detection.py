#!/usr/bin/env python3
"""
Quick fix for the bot challenge detection false positives
"""
import os
import sys
import re
import shutil
from datetime import datetime

def fix_bot_detection():
    """Fix the overly sensitive bot detection in the scraper"""
    scraper_path = "data/bicycles/scrape.py"
    
    if not os.path.exists(scraper_path):
        print(f"❌ Scraper file not found at {scraper_path}")
        return False
    
    # Create backup with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{scraper_path}.bak_{timestamp}"
    try:
        shutil.copy2(scraper_path, backup_path)
        print(f"✅ Created backup of scraper at {backup_path}")
    except Exception as e:
        print(f"Warning: Could not create backup: {e}")
        response = input("Continue without backup? (y/n): ")
        if response.lower() != 'y':
            return False
    
    try:
        # Read the current file
        with open(scraper_path, 'r') as f:
            content = f.read()
        
        # Find the current is_bot_challenge_page method
        bot_detection_pattern = re.compile(r'def is_bot_challenge_page\(self\):.*?return False', re.DOTALL)
        match = bot_detection_pattern.search(content)
        
        if not match:
            print("❌ Could not find the is_bot_challenge_page method in the scraper file")
            return False
        
        # Replace with the fixed version that avoids false positives
        fixed_method = '''    def is_bot_challenge_page(self):
        """
        Check if the current page is a bot challenge/protection page
        Now with improved detection to avoid false positives
        """
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
        return False'''
        
        # Replace the method
        updated_content = content.replace(match.group(0), fixed_method)
        
        # Write the changes back to the file
        with open(scraper_path, 'w') as f:
            f.write(updated_content)
            
        print("✅ Successfully fixed the bot detection logic!")
        print("The scraper will now be more accurate at distinguishing between:")
        print("  - Actual Cloudflare challenges")
        print("  - Normal pages that just happen to mention 'cloudflare' or 'robot'")
        return True
        
    except Exception as e:
        print(f"❌ Error updating bot detection: {e}")
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
    print("Fixing bot challenge detection to avoid false positives...")
    if fix_bot_detection():
        print("\nFix completed successfully! Run the scraper again and it should work properly.")
        print("If you still encounter issues, please run the fix_challenge_detection.py script for a more detailed diagnosis.")
    else:
        print("\nFailed to apply the fix. Please check the error messages above.")

#!/usr/bin/env python3
"""
Utility script to diagnose and fix bot detection issues with 99spokes.com scraping
"""
import os
import sys
import argparse
import time
import random
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def setup_undetectable_browser(headless=False, user_agent=None):
    """Set up a browser with anti-detection measures"""
    options = Options()
    
    # Use a realistic user agent if provided, otherwise use a default one
    if not user_agent:
        user_agents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        ]
        user_agent = random.choice(user_agents)
    
    options.add_argument(f"user-agent={user_agent}")
    
    # Disable automation flags
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    # Add realistic window size and other parameters
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-infobars")
    options.add_argument("--disable-dev-shm-usage")
    
    if headless:
        options.add_argument("--headless")
    
    driver = webdriver.Chrome(options=options)
    
    # Additional stealth settings via CDP
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            // Overwrite the 'webdriver' property to undefined
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Overwrite the navigator.plugins to make it look normal
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    var plugins = []; 
                    for (var i = 0; i < 5; i++) {
                        plugins.push({
                            name: ['PDF Viewer', 'Chrome PDF Plugin', 'Chromium PDF Plugin'][Math.floor(Math.random() * 3)],
                            description: ['Portable Document Format', 'Portable Document Format'][Math.floor(Math.random() * 2)],
                            filename: ['internal-pdf-viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', 'internal-pdf-viewer'][Math.floor(Math.random() * 3)]
                        });
                    }
                    return plugins;
                }
            });
            
            // Overwrite the languages property
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'es']
            });
        """
    })
    
    return driver

def check_site(url, driver):
    """Check if the site loads properly and detect any bot challenges"""
    print(f"Testing URL: {url}")
    
    try:
        driver.get(url)
        time.sleep(5)  # Wait for page to load
        
        # Take screenshot
        driver.save_screenshot("site_check.png")
        print(f"✅ Screenshot saved to 'site_check.png'")
        
        # Check for typical bot detection indicators
        challenge_detected = False
        
        # Check page title
        title = driver.title.lower()
        if any(x in title for x in ["security check", "captcha", "challenge", "checking your browser", "just a moment"]):
            challenge_detected = True
            print(f"⚠️ Bot challenge detected in page title: {driver.title}")
        
        # Check for CloudFlare challenges
        cloudflare_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'cloudflare') or contains(@class, 'cloudflare')]")
        if cloudflare_elements:
            challenge_detected = True
            print("⚠️ CloudFlare protection detected")
        
        # Check for CAPTCHA elements
        captcha_elements = driver.find_elements(By.XPATH, "//*[contains(@class, 'captcha') or contains(@id, 'captcha')]")
        if captcha_elements:
            challenge_detected = True
            print("⚠️ CAPTCHA detected")
        
        # Check the cookies for signs of bot detection
        cookies = driver.get_cookies()
        bot_cookies = [c for c in cookies if "bot" in c["name"].lower() or "captcha" in c["name"].lower()]
        if bot_cookies:
            challenge_detected = True
            print("⚠️ Bot detection cookies found:")
            for cookie in bot_cookies:
                print(f"  - {cookie['name']}")
                
        # Extract and analyze browser fingerprint parameters
        try:
            fingerprint_data = driver.execute_script("""
                return {
                    screen: {
                        width: screen.width,
                        height: screen.height,
                        colorDepth: screen.colorDepth
                    },
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language,
                    plugins: Array.from(navigator.plugins).length,
                    userAgent: navigator.userAgent,
                    webdriver: navigator.webdriver,
                    platform: navigator.platform
                }
            """)
            
            print("\nBrowser fingerprint data:")
            print(json.dumps(fingerprint_data, indent=2))
            
            # Check for telltale signs of automation
            if fingerprint_data.get("webdriver") is not None:
                print("⚠️ webdriver property exposed (shows as automation)")
                challenge_detected = True
            
        except Exception as e:
            print(f"Error getting fingerprint data: {e}")
            
        if not challenge_detected:
            # Check if content loaded as expected
            expected_content = driver.find_elements(By.XPATH, "//a[contains(@href, '/bikes/')]")
            if expected_content:
                print(f"✅ Site loaded successfully! Found {len(expected_content)} bike links.")
            else:
                print("⚠️ Site loaded but expected content not found. Possible blocking.")
                challenge_detected = True
                
        return not challenge_detected
        
    except Exception as e:
        print(f"Error accessing site: {e}")
        return False

def test_stealth_techniques(url):
    """Test different stealth techniques to see which work best"""
    print("\n" + "=" * 80)
    print("TESTING MULTIPLE STEALTH TECHNIQUES")
    print("=" * 80)
    
    techniques = {
        "Standard": {
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "extra_options": []
        },
        "Random User-Agent": {
            "user_agent": None,  # Will use random one
            "extra_options": []
        },
        "Mobile Emulation": {
            "user_agent": "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
            "extra_options": ["--enable-features=NetworkServiceInProcess"]
        },
        "With Headers": {
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "extra_options": ["--disable-features=IsolateOrigins,site-per-process"]
        },
    }
    
    results = {}
    
    for name, config in techniques.items():
        print(f"\nTesting technique: {name}")
        print("-" * 50)
        
        # Setup browser with this technique
        options = Options()
        
        # Apply user agent
        if config["user_agent"]:
            options.add_argument(f"user-agent={config['user_agent']}")
            print(f"Using User-Agent: {config['user_agent']}")
        else:
            user_agents = [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0"
            ]
            options.add_argument(f"user-agent={random.choice(user_agents)}")
            print(f"Using Random User-Agent")
        
        # Basic anti-detection
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # Add extra options
        for opt in config["extra_options"]:
            options.add_argument(opt)
            
        options.add_argument("--window-size=1920,1080")
        
        driver = webdriver.Chrome(options=options)
        
        # Add CDP scripts
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """
        })
        
        try:
            # Try to access the site
            print(f"Checking {url}...")
            driver.get(url)
            time.sleep(5)
            
            # Take a screenshot
            screenshot_name = f"stealth_test_{name.lower().replace(' ', '_')}.png"
            driver.save_screenshot(screenshot_name)
            print(f"Screenshot saved as {screenshot_name}")
            
            # Check for challenge
            challenge_detected = False
            title = driver.title.lower()
            if any(x in title for x in ["security check", "captcha", "challenge", "checking"]):
                challenge_detected = True
                print(f"❌ Challenge detected: {driver.title}")
            else:
                content_elements = driver.find_elements(By.XPATH, "//a[contains(@href, '/bikes/')]")
                if content_elements:
                    print(f"✅ Success! Found {len(content_elements)} bike links")
                else:
                    print("❌ No challenge, but no expected content either")
                    challenge_detected = True
            
            results[name] = not challenge_detected
            
        except Exception as e:
            print(f"Error testing technique {name}: {e}")
            results[name] = False
            
        finally:
            driver.quit()
    
    # Print summary
    print("\n" + "=" * 80)
    print("RESULTS SUMMARY")
    print("=" * 80)
    for name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{name}: {status}")
    
    # Find best technique
    best_technique = next((name for name, success in results.items() if success), None)
    if best_technique:
        print(f"\n🏆 Recommendation: Use '{best_technique}' technique for your scraper")
    else:
        print("\n❌ All techniques failed. Consider using manual intervention or adding delays.")

def fix_headers_in_script(file_path):
    """Update the scraper script with better headers for bot detection avoidance"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check if the file already contains key anti-detection code
        if "Object.defineProperty(navigator, 'webdriver'" in content:
            print(f"File {file_path} already has anti-detection code")
            return True
            
        # Find the browser initialization part
        browser_init_pattern = r"(options\s*=\s*Options\(\).*?driver\s*=\s*webdriver\.Chrome\(options=options\))"
        import re
        match = re.search(browser_init_pattern, content, re.DOTALL)
        
        if not match:
            print(f"Could not find browser initialization in {file_path}")
            return False
        
        # Prepare enhanced initialization code
        enhanced_code = """options = Options()
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--window-size=1920,1080")
        
        # Use a realistic user agent
        user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        options.add_argument(f"--user-agent={user_agent}")
        
        # Disable automation flags
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        if headless:
            options.add_argument('--headless')
            
        # Initialize browser
        driver = webdriver.Chrome(options=options)
        
        # Mask webdriver to avoid detection
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
                
                // Add more realistic browser fingerprinting
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5].map(() => ({
                        name: ['PDF Viewer', 'Chrome PDF Plugin'][Math.floor(Math.random() * 2)]
                    }))
                });
            '''
        })"""
        
        # Replace old code with enhanced code
        updated_content = content.replace(match.group(0), enhanced_code)
        
        # Write back to file
        with open(file_path, 'w') as f:
            f.write(updated_content)
            
        print(f"✅ Updated {file_path} with enhanced anti-detection code")
        return True
        
    except Exception as e:
        print(f"Error updating file: {e}")
        return False

def apply_fixes():
    """Apply all fixes to the project files"""
    print("\n" + "=" * 80)
    print("APPLYING FIXES TO PROJECT FILES")
    print("=" * 80)
    
    # List all Python files
    project_path = "/Users/kevintong/Documents/Code/bikenode.com"
    py_files = []
    for root, _, files in os.walk(project_path):
        for file in files:
            if file.endswith('.py'):
                py_files.append(os.path.join(root, file))
    
    print(f"Found {len(py_files)} Python files in project")
    
    # Update each file
    for file_path in py_files:
        if "selenium" in open(file_path).read():
            print(f"Processing {os.path.basename(file_path)}...")
            fix_headers_in_script(file_path)
    
    print("\n✅ Fixes applied to all relevant files")

def main():
    parser = argparse.ArgumentParser(description="Diagnose and fix bot detection issues")
    parser.add_argument("--url", default="https://99spokes.com/bikes", 
                      help="URL to check (default: https://99spokes.com/bikes)")
    parser.add_argument("--test-techniques", action="store_true",
                      help="Test multiple stealth techniques")
    parser.add_argument("--apply-fixes", action="store_true",
                      help="Apply fixes to project files")
    parser.add_argument("--visible", action="store_true",
                      help="Make browser visible (not headless)")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 80)
    print("99SPOKES.COM BOT DETECTION FIXER")
    print("=" * 80)
    
    if args.test_techniques:
        test_stealth_techniques(args.url)
        return
        
    if args.apply_fixes:
        apply_fixes()
        return
    
    # Default behavior: check site
    print("\nChecking if site can be accessed without triggering bot detection...")
    driver = setup_undetectable_browser(headless=not args.visible)
    
    try:
        success = check_site(args.url, driver)
        
        if success:
            print("\n✅ SUCCESS: Site can be accessed without triggering bot detection")
            print("\nFurther steps:")
            print("1. Use this configuration in your scraper")
            print("2. Add random delays between requests")
            print("3. Run with --apply-fixes to update your project files")
        else:
            print("\n❌ DETECTION: Bot detection triggered")
            print("\nTry the following:")
            print("1. Run with --test-techniques to find the best approach")
            print("2. Consider adding manual intervention for challenges")
            print("3. Use random delays between requests (3-7 seconds)")
            print("4. Rotate IP addresses if possible")
    finally:
        driver.quit()
        
if __name__ == "__main__":
    main()
