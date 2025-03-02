#!/usr/bin/env python3
"""
Script to update the bike scraping code to use makerId for brand selection
instead of incorrectly using the 'family' parameter
"""
import os
import sys
import json
import re

def update_file(file_path, replacement_patterns):
    """Update file contents with the specified replacements"""
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return False
    
    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Apply each replacement pattern
    original_content = content
    for pattern, replacement in replacement_patterns:
        content = re.sub(pattern, replacement, content)
    
    # Check if any replacements were made
    if content == original_content:
        print(f"No changes needed in {file_path}")
        return False
    
    # Create backup
    backup_path = file_path + '.bak'
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(original_content)
    
    # Write the updated content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated {file_path} (backup saved as {backup_path})")
    return True

def update_extract_all_bikes_py():
    """Update the extract_all_bikes.py file to use makerId"""
    file_path = "extract_all_bikes.py"
    
    replacements = [
        # Update URLs for brand filtering
        (
            r'url\s*=\s*f"https://99spokes.com/bikes\?year={year}&brand={brand\[\'slug\'\]}"',
            'url = f"https://99spokes.com/bikes?year={year}&makerId={brand[\'slug\']}"'
        ),
        # Update family URL handling 
        (
            r'family_url\s*=\s*f"https://99spokes.com/bikes\?year={year}&family={brand\[\'slug\'\]}-',
            'family_url = f"https://99spokes.com/bikes?year={year}&family={brand[\'slug\']}-'
        ),
        # Update comment about the URL structure
        (
            r'# Construct URL with brand and year filters',
            '# Construct URL with makerId (brand) and year filters'
        ),
        # Update the function docstring
        (
            r'"""Get all bikes for a specific brand and year"""',
            '"""Get all bikes for a specific brand and year using makerId"""'
        )
    ]
    
    return update_file(file_path, replacements)

def update_brand_by_brand_scraper():
    """Update the brand_by_brand_scraper.py file to use makerId"""
    file_path = "brand_by_brand_scraper.py"
    
    replacements = [
        # Update URL construction
        (
            r'url\s*=\s*f"https://99spokes.com/bikes\?year={year}&brand={brand\[\'slug\'\]}"',
            'url = f"https://99spokes.com/bikes?year={year}&makerId={brand[\'slug\']}"'
        ),
        # Update brand extraction logic
        (
            r'brand_slug = brand_url\.split\("/brands/"\)\[-1\]',
            'brand_slug = brand_url.split("/brands/")[-1]  # This slug will be used as the makerId'
        ),
        # Update comment about brand URL
        (
            r'"url": f"https://99spokes.com/brands/{brand_slug}"',
            '"url": f"https://99spokes.com/bikes?makerId={brand_slug}"  # Use makerId for filtering'
        ),
        # Add comment about the correct approach
        (
            r'# Get bikes for this brand and year',
            '# Get bikes for this brand and year using makerId filter'
        )
    ]
    
    return update_file(file_path, replacements)

def update_comprehensive_scraper():
    """Update the comprehensive_scraper.py file to use makerId"""
    file_path = "comprehensive_scraper.py"
    
    replacements = [
        # Update URL structure for filter
        (
            r'base_url \+= f"&{category}={filter_value}"',
            'base_url += f"&{category}={filter_value}"  # For brand category, this becomes makerId=value'
        ),
        # Update comment about filters
        (
            r'# Apply filters to the bike search URL',
            '# Apply filters to the bike search URL (for brands, uses makerId parameter)'
        ),
        # Update filter definition for brands
        (
            r'"brand": None,  # Will be populated dynamically',
            '"makerId": None,  # Will be populated with brand IDs dynamically'
        )
    ]
    
    return update_file(file_path, replacements)

def main():
    """Update all scraper scripts to use makerId instead of incorrect family parameter"""
    print("\n=== Updating Scraper Scripts to Use makerId ===")
    print("This script will update your scrapers to correctly use makerId for brand filtering\n")
    
    changes_made = []
    
    # Update the main extraction script
    if os.path.exists("extract_all_bikes.py"):
        if update_extract_all_bikes_py():
            changes_made.append("extract_all_bikes.py")
    else:
        print("Info: extract_all_bikes.py not found, skipping")
    
    # Update brand-by-brand scraper
    if os.path.exists("brand_by_brand_scraper.py"):
        if update_brand_by_brand_scraper():
            changes_made.append("brand_by_brand_scraper.py")
    else:
        print("Info: brand_by_brand_scraper.py not found, skipping")
    
    # Update comprehensive scraper
    if os.path.exists("comprehensive_scraper.py"):
        if update_comprehensive_scraper():
            changes_made.append("comprehensive_scraper.py")
    else:
        print("Info: comprehensive_scraper.py not found, skipping")
    
    # Summary
    if changes_made:
        print("\n✅ Updates completed!")
        print(f"Modified files: {', '.join(changes_made)}")
        print("\nYour scripts now correctly use makerId for brand filtering.")
        print("This will provide more accurate and complete results.")
    else:
        print("\nℹ️ No changes were made to any files.")
        print("Either the files don't exist or they already use the correct approach.")
    
    print("\nNote: To get the most accurate list of brand IDs, run:")
    print("   python fix_brand_selection.py")
    
if __name__ == "__main__":
    main()
