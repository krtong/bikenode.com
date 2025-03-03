#!/bin/bash

INDEX_FILE="/Users/kevintong/Documents/Code/bikenode.com/website/index.html"
OUTPUT_FILE="/Users/kevintong/Documents/Code/bikenode.com/dependencies.txt"

echo "Analyzing dependencies for index.html..."
echo "Dependencies for index.html:" > "$OUTPUT_FILE"
echo "=========================" >> "$OUTPUT_FILE"

# Extract CSS files
echo -e "\nCSS Files:" >> "$OUTPUT_FILE"
grep -o '<link[^>]*href=['"'"'"][^"'"'"']*['"'"'"]' "$INDEX_FILE" | \
  grep '\.css' | \
  sed -e 's/.*href=["'"'"']//' -e 's/["'"'"'].*//' >> "$OUTPUT_FILE"

# Extract JavaScript files
echo -e "\nJavaScript Files:" >> "$OUTPUT_FILE"
grep -o '<script[^>]*src=['"'"'"][^"'"'"']*['"'"'"]' "$INDEX_FILE" | \
  sed -e 's/.*src=["'"'"']//' -e 's/["'"'"'].*//' >> "$OUTPUT_FILE"

# Extract Images
echo -e "\nImages:" >> "$OUTPUT_FILE"
grep -o '<img[^>]*src=['"'"'"][^"'"'"']*['"'"'"]' "$INDEX_FILE" | \
  sed -e 's/.*src=["'"'"']//' -e 's/["'"'"'].*//' >> "$OUTPUT_FILE"

# Extract other potential assets (backgrounds in style attributes, etc.)
echo -e "\nOther Assets:" >> "$OUTPUT_FILE"
grep -o 'url(['"'"'"][^"'"'"']*['"'"'"])' "$INDEX_FILE" | \
  sed -e 's/url(["'"'"']//' -e 's/["'"'"']).*//' >> "$OUTPUT_FILE"

echo "Analysis complete. Dependencies listed in $OUTPUT_FILE"
echo "You can review this file to identify which files need to be moved to the splash-page directory."
