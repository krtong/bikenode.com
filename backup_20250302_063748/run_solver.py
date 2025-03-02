#!/usr/bin/env python3
"""
Standalone script to solve Cloudflare challenges and save cookies
for later use with the scraper.
"""

import os
import sys
import traceback

def main():
    print("=" * 80)
    print("🛡️  CLOUDFLARE CHALLENGE SOLVER  🛡️")
    print("=" * 80)
    print("This tool will help you solve Cloudflare challenges and save cookies")
    print("that can be used with the scraper to avoid future challenges.")
    print("=" * 80)
    
    # Check if tkinter is available (required for the GUI)
    try:
        import tkinter
    except ImportError:
        print("\n❌ ERROR: The tkinter module is required but not installed.")
        print("This is needed for the graphical interface to solve the challenge.")
        print("\nOn Ubuntu/Debian, you can install it with:")
        print("  sudo apt-get install python3-tk")
        print("\nOn macOS with Homebrew:")
        print("  brew install python-tk")
        return 1
    
    # Try to import the cloudflare helper module
    try:
        from cloudflare_helper import solve_cloudflare_challenge
    except ImportError as e:
        print(f"\n❌ ERROR: Failed to import cloudflare_helper module: {e}")
        print("Make sure the cloudflare_helper.py file is in the same directory.")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: An unexpected error occurred when importing modules:")
        print(f"  {e}")
        traceback.print_exc()
        return 1
    
    # Check if webdriver_manager is installed
    try:
        import webdriver_manager
    except ImportError:
        print("\n❌ Missing dependency: webdriver_manager")
        print("Installing webdriver_manager package...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "webdriver-manager"])
            print("✅ Successfully installed webdriver_manager")
        except Exception as e:
            print(f"❌ Failed to install webdriver_manager: {e}")
            print("Please install it manually with: pip install webdriver-manager")
            return 1
    
    # Default URL
    default_url = "https://99spokes.com/bikes"
    
    # Get URL from command line or use default
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input(f"Enter URL to solve challenge for [default: {default_url}]: ")
        if not url:
            url = default_url
    
    # Create cookies directory if it doesn't exist
    os.makedirs("cookies", exist_ok=True)
    
    print(f"\nSolving challenge for: {url}")
    print("A browser window and GUI dialog will appear shortly.")
    print("Follow the instructions in the GUI window to complete the challenge.")
    
    try:
        result = solve_cloudflare_challenge(url)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        traceback.print_exc()
        return 1
    
    if result.get("success"):
        print("\n✅ Success! Challenge solved.")
        print(f"Cookies saved to: {result.get('file')}")
        print("\nYou can now run the scraper with reduced likelihood of challenges.")
        print("To update the scraper to automatically use these cookies, run:")
        print("  python update_scraper.py")
    else:
        print("\n❌ Failed to solve the challenge.")
        if "error" in result:
            print(f"Error: {result['error']}")
        print("Please try again or manually inspect the website.")
    
    return 0 if result.get("success", False) else 1

if __name__ == "__main__":
    sys.exit(main())
