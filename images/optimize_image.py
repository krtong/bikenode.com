from PIL import Image
import os
import sys
import shutil
import argparse

def create_image_assets(source_image_path, output_dir="./assets"):
    """
    Generate favicon and other image assets from a source image.
    
    Args:
        source_image_path: Path to the source image
        output_dir: Directory to save generated assets
    """
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    try:
        # Open the source image
        img = Image.open(source_image_path)
        
        print(f"\nOriginal image: {source_image_path}")
        print(f"Generating image assets...")
        
        # Define favicon sizes
        favicon_sizes = {
            "favicon.ico": [(16, 16), (32, 32)],
            "favicon-16x16.png": (16, 16),
            "favicon-32x32.png": (32, 32),
            "favicon-48x48.png": (48, 48),
            "favicon-64x64.png": (64, 64),
            "favicon-96x96.png": (96, 96),
            "favicon-128x128.png": (128, 128),
            "apple-touch-icon.png": (180, 180),
            "android-chrome-192x192.png": (192, 192),
            "android-chrome-512x512.png": (512, 512),
            "mstile-150x150.png": (150, 150)
        }
        
        # Generate each size
        results = []
        
        for filename, size in favicon_sizes.items():
            if filename == "favicon.ico":
                # Special handling for ICO file with multiple sizes
                ico_sizes = size
                ico_images = []
                
                for ico_size in ico_sizes:
                    # Create a copy of the image to resize
                    resized_img = img.copy()
                    
                    # Create a square version of the image
                    min_dimension = min(resized_img.width, resized_img.height)
                    left = (resized_img.width - min_dimension) // 2
                    top = (resized_img.height - min_dimension) // 2
                    right = left + min_dimension
                    bottom = top + min_dimension
                    
                    square_img = resized_img.crop((left, top, right, bottom))
                    resized_img = square_img.resize(ico_size, Image.LANCZOS)
                    ico_images.append(resized_img)
                
                # Save as ICO
                output_path = os.path.join(output_dir, filename)
                ico_images[0].save(
                    output_path,
                    format="ICO",
                    sizes=ico_sizes
                )
                
                # Get file size
                file_size = os.path.getsize(output_path) / 1024  # KB
                
                results.append({
                    "filename": filename,
                    "size": ", ".join([f"{s[0]}x{s[1]}" for s in ico_sizes]),
                    "file_size": f"{file_size:.2f} KB"
                })
                
            else:
                # Regular PNG files
                # Create a copy of the image to resize
                resized_img = img.copy()
                
                # Create a square version of the image
                min_dimension = min(resized_img.width, resized_img.height)
                left = (resized_img.width - min_dimension) // 2
                top = (resized_img.height - min_dimension) // 2
                right = left + min_dimension
                bottom = top + min_dimension
                
                square_img = resized_img.crop((left, top, right, bottom))
                resized_img = square_img.resize(size, Image.LANCZOS)
                
                # Save optimized PNG
                output_path = os.path.join(output_dir, filename)
                resized_img.save(
                    output_path,
                    optimize=True,
                    quality=90,
                    progressive=True
                )
                
                # Get file size
                file_size = os.path.getsize(output_path) / 1024  # KB
                
                results.append({
                    "filename": filename,
                    "size": f"{size[0]}x{size[1]}",
                    "file_size": f"{file_size:.2f} KB"
                })
        
        # Print results
        print("\n✅ Generated Image Assets:")
        print("{:<30} {:<15} {:<12}".format("FILENAME", "DIMENSIONS", "FILE SIZE"))
        print("-" * 57)
        for result in results:
            print("{:<30} {:<15} {:<12}".format(
                result["filename"], 
                result["size"], 
                result["file_size"]
            ))
        
        print(f"\n➡️ All assets have been saved to '{output_dir}'")
        
        return True
    
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

def create_chrome_extension_icons(source_image_path, output_dir="./web_extension/chrome/images"):
    """Generate proper Chrome extension icons while maintaining aspect ratio"""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    try:
        img = Image.open(source_image_path)
        print(f"\nOriginal image: {source_image_path}")
        print(f"Generating Chrome extension icons...")
        
        # Chrome extension standard icon sizes
        extension_icons = {
            "icon16.png": 16,
            "icon32.png": 32,
            "icon48.png": 48,
            "icon128.png": 128
        }
        
        results = []
        
        for filename, size in extension_icons.items():
            # Create a square version by cropping to maintain aspect ratio
            img_copy = img.copy()
            min_dimension = min(img_copy.width, img_copy.height)
            
            # Calculate crop box
            left = (img_copy.width - min_dimension) // 2
            top = (img_copy.height - min_dimension) // 2
            right = left + min_dimension
            bottom = top + min_dimension
            
            # Crop to square and resize
            square_img = img_copy.crop((left, top, right, bottom))
            resized_img = square_img.resize((size, size), Image.LANCZOS)
            
            output_path = os.path.join(output_dir, filename)
            resized_img.save(output_path, optimize=True, quality=90)
            
            file_size = os.path.getsize(output_path) / 1024
            results.append({
                "filename": filename,
                "size": f"{size}x{size}",
                "file_size": f"{file_size:.2f} KB"
            })
        
        # Print results
        print("\n✅ Generated Chrome Extension Icons:")
        print("{:<20} {:<15} {:<12}".format("FILENAME", "DIMENSIONS", "FILE SIZE"))
        print("-" * 47)
        for result in results:
            print("{:<20} {:<15} {:<12}".format(
                result["filename"], result["size"], result["file_size"]
            ))
        
        print(f"\n➡️ All icons have been saved to '{output_dir}'")
        return True
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate image assets")
    parser.add_argument("--chrome-ext", action="store_true", help="Generate Chrome extension icons")
    parser.add_argument("--output", default=None, help="Output directory")
    parser.add_argument("--source", default=None, help="Source image path")
    args = parser.parse_args()
    
    # Get the directory of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Path to image.png (in the same directory as the script)
    image_path = args.source if args.source else os.path.join(script_dir, "image.png")
    
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found!")
        sys.exit(1)
        
    if args.chrome_ext:
        # Generate Chrome extension icons
        ext_output_dir = args.output if args.output else os.path.join(os.path.dirname(script_dir), "web_extension", "chrome", "images")
        create_chrome_extension_icons(image_path, ext_output_dir)
    else:
        # Generate regular assets
        output_directory = args.output if args.output else os.path.join(script_dir, "assets")
        create_image_assets(image_path, output_directory)