#!/bin/bash

# Navigate to the website directory
cd /Users/kevintong/Documents/Code/bikenode.com/website

# Create the two new directories if they don't exist yet
mkdir -p splash-page
mkdir -p misc-content

# First move index.html to splash-page
if [ -f index.html ]; then
  mv index.html splash-page/
  echo "Moved index.html to splash-page/"
fi

# Move common web assets to splash-page
echo "Moving common web assets to splash-page..."
for item in css js images assets fonts; do
  if [ -e "$item" ]; then
    mv "$item" splash-page/
    echo "Moved $item to splash-page/"
  fi
done

# Move specific CSS files
for file in *.css; do
  if [ -f "$file" ]; then
    mv "$file" splash-page/
    echo "Moved $file to splash-page/"
  fi
done

# Move everything else to misc-content, excluding the directories we just created
echo "Moving remaining content to misc-content..."
for item in *; do
  if [ "$item" != "splash-page" ] && [ "$item" != "misc-content" ]; then
    mv "$item" misc-content/
    echo "Moved $item to misc-content/"
  fi
done

echo "Files have been reorganized into splash-page and misc-content directories."
echo "Please review the contents of both directories to ensure proper organization."
