#!/usr/bin/env python3
"""
Quick fix for the indentation error in scrape.py
"""
import os
import sys
import re
import shutil
from datetime import datetime

def fix_indentation_error():
    """Fix the indentation error in the scraper file"""
    scraper_path = "data/bicycles/scrape.py"
    
    if not os.path.exists(scraper_path):
        print(f"❌ Scraper file not found at {scraper_path}")
        return False
    
    # Create backup with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{scraper_path}.bak_indent_{timestamp}"
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
            content = f.readlines()
        
        # Fix the indentation issue
        fixed_content = []
        in_method = False
        for line in content:
            if "def is_bot_challenge_page(self):" in line:
                # Found the problematic method, fix its indentation
                fixed_line = "    def is_bot_challenge_page(self):\n"  # Proper indentation (4 spaces)
                fixed_content.append(fixed_line)
                in_method = True
            elif in_method and line.strip() and line.startswith("        "):
                # Inside the method, but the line has too much indentation
                # This assumes the class methods should have 4 spaces indentation,
                # and their content should have 8 spaces indentation
                fixed_content.append(line)
            elif in_method and not line.strip():
                # Empty line within the method
                fixed_content.append(line)
            elif in_method and not line.startswith(" " * 8):
                # This line doesn't have the method's indentation,
                # we're probably out of the method now
                in_method = False
                fixed_content.append(line)
            else:
                # Normal line outside of the problematic method
                fixed_content.append(line)
                
        # Write the fixed content back to the file
        with open(scraper_path, 'w') as f:
            f.writelines(fixed_content)
            
        print("✅ Successfully fixed the indentation error!")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing indentation: {e}")
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
    print("Fixing indentation error in scrape.py...")
    if fix_indentation_error():
        print("\nFix completed successfully! You can now run the scraper again.")
        print("Try: python run_scraper.py --year 2024 --output bikes_2024.csv")
    else:
        print("\nFailed to apply the fix. Please check the error messages above.")
