#!/bin/bash

echo "==================================================================="
echo "🔍 Running 99Spokes scraper tests with manual CAPTCHA intervention"
echo "==================================================================="
echo "A browser window will open. If you see a CAPTCHA or security challenge,"
echo "please complete it manually. The tests will continue automatically."
echo "==================================================================="

# Run the tests with the manual flag
python3 /Users/kevintong/Documents/Code/bikenode.com/tests/test_99spokes_scraper.py --manual

# Make the script executable after creation
chmod +x "$0"
