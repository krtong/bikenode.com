#!/bin/bash

# Script to remove motorcycle images below 600x600 resolution
# Author: Generated for bikenode.com image cleanup

IMAGES_DIR="/Users/kevintong/Documents/Code/bikenode.com/images/motorcycles"
MIN_WIDTH=600
MIN_HEIGHT=600
DELETED_COUNT=0
KEPT_COUNT=0
LOG_FILE="/Users/kevintong/Documents/Code/bikenode.com/scripts/deleted_images.log"

# Create log file
echo "Image cleanup started at $(date)" > "$LOG_FILE"
echo "Minimum resolution required: ${MIN_WIDTH}x${MIN_HEIGHT}" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"

# Function to check if imagemagick is installed
check_dependencies() {
    if ! command -v identify &> /dev/null; then
        echo "Error: ImageMagick is not installed. Please install it first:"
        echo "brew install imagemagick"
        exit 1
    fi
}

# Function to get image dimensions
get_dimensions() {
    local file="$1"
    identify -format "%wx%h" "$file" 2>/dev/null
}

# Function to check if image meets minimum resolution
is_low_resolution() {
    local file="$1"
    local dimensions=$(get_dimensions "$file")
    
    if [[ -z "$dimensions" ]]; then
        echo "Warning: Could not read dimensions for $file" >&2
        return 1
    fi
    
    local width=$(echo "$dimensions" | cut -d'x' -f1)
    local height=$(echo "$dimensions" | cut -d'x' -f2)
    
    if [[ "$width" -lt "$MIN_WIDTH" ]] || [[ "$height" -lt "$MIN_HEIGHT" ]]; then
        echo "LOW_RES: $file (${width}x${height})" >> "$LOG_FILE"
        return 0  # True - is low resolution
    else
        echo "KEPT: $file (${width}x${height})" >> "$LOG_FILE"
        return 1  # False - meets minimum resolution
    fi
}

# Main cleanup function
cleanup_images() {
    echo "Starting image cleanup..."
    echo "Scanning directory: $IMAGES_DIR"
    
    # Find all image files
    find "$IMAGES_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" \) | while read -r image_file; do
        if is_low_resolution "$image_file"; then
            echo "Deleting low-res image: $image_file"
            rm "$image_file"
            ((DELETED_COUNT++))
        else
            ((KEPT_COUNT++))
        fi
        
        # Progress indicator
        if (( (DELETED_COUNT + KEPT_COUNT) % 50 == 0 )); then
            echo "Processed $((DELETED_COUNT + KEPT_COUNT)) images..."
        fi
    done
}

# Main execution
echo "Motorcycle Image Cleanup Tool"
echo "============================="
echo "This will delete all images smaller than ${MIN_WIDTH}x${MIN_HEIGHT} pixels"
echo "Directory: $IMAGES_DIR"
echo ""

# Check dependencies
check_dependencies

# Confirm before proceeding
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Run cleanup
cleanup_images

echo ""
echo "Cleanup completed!"
echo "Log file: $LOG_FILE"
echo ""
echo "Summary:"
echo "- Images deleted: Files logged in $LOG_FILE"
echo "- Images kept: Files logged in $LOG_FILE"
echo ""
echo "Cleanup finished at $(date)" >> "$LOG_FILE"
