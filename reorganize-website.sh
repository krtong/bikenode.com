#!/bin/bash

# Navigate to the website directory
cd /Users/kevintong/Documents/Code/bikenode.com/website

# Create the two new directories
mkdir -p splash-page
mkdir -p misc-content

# Move index.html to splash-page
cp index.html splash-page/

# Also move common dependencies that are likely needed for the splash page
# Assuming typical web structure - adjust as needed based on actual dependencies
cp -r *.css splash-page/ 2>/dev/null || true
cp -r css splash-page/ 2>/dev/null || true
cp -r js splash-page/ 2>/dev/null || true
cp -r images splash-page/ 2>/dev/null || true
cp -r assets splash-page/ 2>/dev/null || true
cp -r fonts splash-page/ 2>/dev/null || true

# Move everything else to misc-content
# We'll exclude the directories we've just created
find . -maxdepth 1 -not -name "." -not -name "splash-page" -not -name "misc-content" -not -name "index.html" -not -name "*.css" | xargs -I {} cp -r {} misc-content/

echo "Files have been reorganized into splash-page and misc-content directories."
echo "Please review the contents of both directories to ensure proper organization."
