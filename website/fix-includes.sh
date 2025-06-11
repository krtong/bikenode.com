#!/bin/bash

echo "Fixing include paths in reorganized files..."

# Fix all reorganized files to use relative component paths
find /Users/kevintong/Documents/Code/bikenode.com/website/src -name "index.njk" | while read file; do
    # Get the directory name
    dir=$(dirname "$file")
    folder_name=$(basename "$dir")
    
    # Check if file contains the problematic pattern
    if grep -q "{% include \"./${folder_name}/components/" "$file" 2>/dev/null; then
        echo "Fixing: $file"
        # Replace the pattern
        sed -i '' "s|{% include \"./${folder_name}/components/|{% include \"./components/|g" "$file"
    fi
done

echo "Include paths fixed!"