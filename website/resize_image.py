#!/usr/bin/env python3
from PIL import Image
import sys
import os

def resize_image(input_path, output_path, size=(128, 128)):
    """
    Resize an image to the specified size while maintaining aspect ratio
    and preserving transparency.
    """
    try:
        # Open the image
        img = Image.open(input_path)
        
        # Convert to RGBA if not already (to preserve transparency)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Create a new image with transparent background
        new_img = Image.new('RGBA', size, (0, 0, 0, 0))
        
        # Calculate aspect ratio and resize
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Paste the resized image centered on the new image
        x = (size[0] - img.width) // 2
        y = (size[1] - img.height) // 2
        new_img.paste(img, (x, y), img)
        
        # Save the resized image
        new_img.save(output_path, 'PNG')
        print(f"Successfully resized image to {size[0]}x{size[1]}")
        print(f"Saved to: {output_path}")
        
    except Exception as e:
        print(f"Error resizing image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # You need to provide the input image path
    print("Please provide the path to the BikeNode logo image you want to resize.")
    print("Available image in assets: /Users/kevintong/Documents/Code/bikenode.com/website/assets/images/bikenode_logo.png")
    
    # Example usage:
    # resize_image('input.png', 'output_128x128.png')