#!/bin/bash

# Fix all remaining issues in BikeNode website

cd /Users/kevintong/Documents/Code/bikenode.com/website

echo "1. Fixing double layout references..."
find src -name "*.njk" -type f -exec sed -i '' 's/layout: bikenode-main-layout-01\/bikenode-main-layout-01/layout: bikenode-main-layout-01/g' {} \;

echo "2. Finding pages with external CSS references..."
PAGES_WITH_CSS=$(grep -r "customCSS:" src --include="*.njk" | grep -v "^src/_layouts" | cut -d: -f1)

echo "3. Removing customCSS frontmatter from pages..."
for page in $PAGES_WITH_CSS; do
    # Remove customCSS block from frontmatter
    sed -i '' '/^customCSS:/,/^[^[:space:]]/{ /^customCSS:/d; /^[[:space:]]/d; }' "$page"
done

echo "4. Finding and fixing pages with external script references..."
# Find pages with external JS references (not in _layouts)
PAGES_WITH_JS=$(grep -r '<script.*src="/' src --include="*.njk" | grep -v "^src/_layouts" | cut -d: -f1 | sort -u)

echo "Found pages with external JS: $PAGES_WITH_JS"

echo "Done! Please manually review pages to ensure CSS/JS is properly embedded inline."
echo ""
echo "Pages that had customCSS references:"
echo "$PAGES_WITH_CSS" | sort -u
echo ""
echo "Pages that have external script references:"
echo "$PAGES_WITH_JS" | sort -u