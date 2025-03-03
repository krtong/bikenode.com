#!/usr/bin/env python3
import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time

def analyze_bike_elements(url="https://99spokes.com/bikes?year=2024", output_dir="debug_output"):
    """Analyze bike elements on the page and save detailed information about them"""
    print(f"Analyzing bike elements on: {url}")
    
    # Setup browser
    options = Options()
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    driver = webdriver.Chrome(options=options)
    try:
        # Hide webdriver flag
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """
        })
        
        # Navigate to URL
        driver.get(url)
        time.sleep(5)  # Wait for page to load
        
        # Take a screenshot for reference
        driver.save_screenshot(os.path.join(output_dir, "page_state.png"))
        
        # Save the HTML source
        with open(os.path.join(output_dir, "page_source.html"), "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        
        print("Finding bike elements...")
        
        # Try multiple selectors to find bike cards
        selectors = [
            ".bike-card", 
            ".bike-listing", 
            ".grid-item", 
            "a[href*='/bikes/']",
            "a[href^='/bikes/']",
            "a.product-card",
            ".product",
            "div[data-bike-id]",
            "div.card",
            "[data-testid='bike-card']"
        ]
        
        found_elements = []
        for selector in selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    print(f"Found {len(elements)} elements with selector: {selector}")
                    found_elements.extend(elements)
            except Exception as e:
                print(f"Error with selector {selector}: {e}")
        
        # Also try our XPath approach
        try:
            xpath_elements = driver.find_elements(By.XPATH, "//div[.//img and string-length(normalize-space(.)) > 10]")
            print(f"Found {len(xpath_elements)} elements with XPath content pattern")
            found_elements.extend(xpath_elements)
        except Exception as e:
            print(f"Error with XPath: {e}")
        
        # Deduplicate elements
        unique_elements = []
        ids_seen = set()
        for element in found_elements:
            try:
                element_id = element.id
                if element_id not in ids_seen:
                    ids_seen.add(element_id)
                    unique_elements.append(element)
            except:
                continue
        
        print(f"Found {len(unique_elements)} unique elements")
        
        # Analyze each element
        elements_data = []
        for i, element in enumerate(unique_elements[:20]):  # Limit to 20 for analysis
            try:
                element_data = {
                    "index": i,
                    "tag_name": element.tag_name,
                    "href": element.get_attribute("href") if element.tag_name == "a" else None,
                    "class": element.get_attribute("class"),
                    "id": element.get_attribute("id"),
                    "text_content": element.text,
                    "has_image": len(element.find_elements(By.TAG_NAME, "img")) > 0,
                    "image_src": [img.get_attribute("src") for img in element.find_elements(By.TAG_NAME, "img")],
                    "element_size": {"width": element.size["width"], "height": element.size["height"]},
                }
                
                # Take screenshot of this element
                try:
                    element.screenshot(os.path.join(output_dir, f"element_{i}.png"))
                except:
                    pass
                
                # Save element HTML
                element_html = element.get_attribute("outerHTML")
                with open(os.path.join(output_dir, f"element_{i}.html"), "w", encoding="utf-8") as f:
                    f.write(element_html)
                
                elements_data.append(element_data)
            except Exception as e:
                print(f"Error analyzing element {i}: {e}")
        
        # Save analysis to JSON
        with open(os.path.join(output_dir, "element_analysis.json"), "w", encoding="utf-8") as f:
            json.dump(elements_data, f, indent=2)
        
        print(f"\nAnalysis completed and saved to {output_dir}/element_analysis.json")
        print("Element screenshots and HTML have also been saved.")
        
        # Return the first few examples to console
        print("\nExample elements found:")
        for i, data in enumerate(elements_data[:5]):
            print(f"\nElement {i}:")
            print(f"  Tag: {data['tag_name']}")
            print(f"  Class: {data['class']}")
            print(f"  Has image: {data['has_image']}")
            print(f"  Text: {data['text_content'][:100]}...")
    
    finally:
        driver.quit()

if __name__ == "__main__":
    analyze_bike_elements()
