#!/usr/bin/env python3
"""
Utility script to analyze the HTML structure of bike listings on 99spokes.com
Helps identify the best CSS selectors and XPath expressions for scraping
"""
import os
import sys
import json
import time
import random
import argparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def setup_browser(headless=False):
    """Setup browser with anti-detection measures"""
    options = Options()
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
    
    driver = webdriver.Chrome(options=options)
    
    # Mask webdriver to avoid detection
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        '''
    })
    
    return driver

def save_element_structure(element, output_dir, prefix="element", max_depth=3, current_depth=0):
    """Save HTML structure and screenshot of an element"""
    try:
        # Create unique filename
        filename = f"{prefix}_{hash(element.id)}"
        
        # Save element HTML
        html_file = os.path.join(output_dir, f"{filename}.html")
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(element.get_attribute("outerHTML"))
        
        # Try to take a screenshot
        try:
            screenshot_file = os.path.join(output_dir, f"{filename}.png")
            element.screenshot(screenshot_file)
        except Exception as e:
            print(f"Could not take screenshot: {e}")
        
        # Extract key attributes
        element_info = {
            "tag": element.tag_name,
            "id": element.get_attribute("id"),
            "class": element.get_attribute("class"),
            "text": element.text[:100] + ("..." if len(element.text) > 100 else ""),
            "href": element.get_attribute("href") if element.tag_name == "a" else None
        }
        
        # Save element info
        info_file = os.path.join(output_dir, f"{filename}.json")
        with open(info_file, "w", encoding="utf-8") as f:
            json.dump(element_info, f, indent=2)
        
        # If not at max depth, process child elements
        if current_depth < max_depth:
            child_elements = element.find_elements(By.XPATH, "./*")
            for i, child in enumerate(child_elements[:5]):  # Limit to 5 children per element
                try:
                    child_prefix = f"{prefix}_child{i}"
                    save_element_structure(child, output_dir, child_prefix, max_depth, current_depth + 1)
                except:
                    pass
    
    except Exception as e:
        print(f"Error analyzing element: {e}")

def analyze_bike_listings(url, output_dir="listing_analysis"):
    """Analyze the HTML structure of bike listings on the page"""
    print(f"Analyzing bike listings on: {url}")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    driver = setup_browser(headless=False)  # Non-headless to ensure everything loads
    
    try:
        # Navigate to URL
        driver.get(url)
        print("Waiting for page to load...")
        time.sleep(5)
        
        # Save full page screenshot and HTML
        driver.save_screenshot(os.path.join(output_dir, "full_page.png"))
        with open(os.path.join(output_dir, "full_page.html"), "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        
        # Try different selectors to find bike listings
        selectors = [
            "a[href*='/bikes/']",
            "div.bike-card",
            "div.product-card",
            "div[data-testid*='bike']",
            ".grid-item",
            "a.card"
        ]
        
        for selector in selectors:
            try:
                print(f"Trying selector: {selector}")
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if len(elements) >= 3:  # Found meaningful number of elements
                    print(f"✅ Found {len(elements)} elements with selector: {selector}")
                    
                    # Analyze the first 5 elements
                    for i, element in enumerate(elements[:5]):
                        print(f"  Analyzing element {i+1}/{min(5, len(elements))}")
                        save_element_structure(element, output_dir, f"{selector.replace('[', '_').replace(']', '_').replace('*', 'x')}_{i}")
                        
                    print(f"Selector {selector} looks promising!")
                else:
                    print(f"❌ Only found {len(elements)} elements with selector: {selector}")
            except Exception as e:
                print(f"Error with selector {selector}: {e}")
        
        # Try XPath approach
        xpath_expressions = [
            "//a[contains(@href, '/bikes/') and not(contains(@href, '/bikes?'))]",
            "//div[.//img and .//a[contains(@href, '/bikes/')]]"
        ]
        
        for xpath in xpath_expressions:
            try:
                print(f"Trying XPath: {xpath}")
                elements = driver.find_elements(By.XPATH, xpath)
                if len(elements) >= 3:  # Found meaningful number of elements
                    print(f"✅ Found {len(elements)} elements with XPath: {xpath}")
                    
                    # Analyze the first 3 elements
                    for i, element in enumerate(elements[:3]):
                        print(f"  Analyzing element {i+1}/{min(3, len(elements))}")
                        save_element_structure(element, output_dir, f"xpath_{i}")
                    
                    print(f"XPath {xpath} looks promising!")
                else:
                    print(f"❌ Only found {len(elements)} elements with XPath: {xpath}")
            except Exception as e:
                print(f"Error with XPath {xpath}: {e}")
        
        # Generate summary of findings
        with open(os.path.join(output_dir, "analysis_summary.txt"), "w", encoding="utf-8") as f:
            f.write("BIKE LISTING STRUCTURE ANALYSIS\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"URL: {url}\n")
            f.write(f"Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("Selectors tested:\n")
            
            for selector in selectors:
                try:
                    count = len(driver.find_elements(By.CSS_SELECTOR, selector))
                    f.write(f"- {selector}: {count} elements found\n")
                except:
                    f.write(f"- {selector}: Error\n")
            
            f.write("\nXPath expressions tested:\n")
            for xpath in xpath_expressions:
                try:
                    count = len(driver.find_elements(By.XPATH, xpath))
                    f.write(f"- {xpath}: {count} elements found\n")
                except:
                    f.write(f"- {xpath}: Error\n")
        
        print(f"\n✅ Analysis complete! Results saved to {output_dir}/")
        print(f"Check {output_dir}/analysis_summary.txt for a summary of findings.")
        
    finally:
        driver.quit()

def main():
    parser = argparse.ArgumentParser(description="Analyze the structure of bike listings on 99spokes.com")
    parser.add_argument("--url", default="https://99spokes.com/bikes?year=2024", 
                        help="URL to analyze (default: https://99spokes.com/bikes?year=2024)")
    parser.add_argument("--output", default="listing_analysis",
                        help="Output directory for analysis files (default: listing_analysis)")
    parser.add_argument("--brand", type=str, help="Add a brand filter to the URL")
    parser.add_argument("--family", type=str, help="Add a family filter to the URL")
    
    args = parser.parse_args()
    
    # Build URL with filters if provided
    url = args.url
    if args.brand:
        url += f"&makerId={args.brand}"
    if args.family:
        url += f"&family={args.family}"
    
    print("\n" + "=" * 80)
    print("BIKE LISTING STRUCTURE ANALYZER")
    print("=" * 80)
    print(f"Target URL: {url}")
    print(f"Output Dir: {args.output}")
    print("=" * 80 + "\n")
    
    analyze_bike_listings(url, args.output)

if __name__ == "__main__":
    main()
