from PIL import Image
import os
import sys
import shutil

def create_image_assets(source_image_path, output_dir="./assets"):
    """
    Generate all necessary image assets for a website from a source image.
    
    Args:
        source_image_path: Path to the source image
        output_dir: Directory to save generated assets
    """
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        os.makedirs(os.path.join(output_dir, "favicons"))
        os.makedirs(os.path.join(output_dir, "social"))
        os.makedirs(os.path.join(output_dir, "thumbnails"))
    
    try:
        # Open the source image
        img = Image.open(source_image_path)
        
        # Print original image info
        original_size = os.path.getsize(source_image_path) / 1024  # KB
        print(f"\nOriginal image: {source_image_path}")
        print(f"Dimensions: {img.width}x{img.height} pixels")
        print(f"File size: {original_size:.2f} KB")
        print(f"Format: {img.format}")
        print("\nGenerating assets...")
        
        # Define image sizes to generate
        sizes = {
            # Favicons
            "favicons/favicon-16x16.png": (16, 16),
            "favicons/favicon-32x32.png": (32, 32),
            "favicons/favicon-48x48.png": (48, 48),
            "favicons/favicon-64x64.png": (64, 64),
            "favicons/favicon-96x96.png": (96, 96),
            
            # iOS/Apple icons
            "apple-touch-icon.png": (180, 180),
            "apple-touch-icon-precomposed.png": (180, 180),
            
            # Android icons
            "favicons/android-chrome-192x192.png": (192, 192),
            "favicons/android-chrome-512x512.png": (512, 512),
            
            # Microsoft icons
            "favicons/mstile-150x150.png": (150, 150),
            
            # Social media images
            "social/og-image.png": (1200, 630),  # Facebook/Open Graph
            "social/twitter-card.png": (1200, 600),  # Twitter
            
            # Thumbnails
            "thumbnails/thumb-150x150.png": (150, 150),
            "thumbnails/thumb-300x300.png": (300, 300),
            "thumbnails/thumb-600x600.png": (600, 600),
            
            # Website logo
            "logo.png": (512, 512),
        }
        
        # Generate each size
        results = []
        
        for filename, size in sizes.items():
            # Create a copy of the image to resize
            resized_img = img.copy()
            
            # Resize with high quality
            resized_img = resized_img.resize(size, Image.LANCZOS)
            
            # Create full output path
            output_path = os.path.join(output_dir, filename)
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Save optimized version
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
            
            # Special case for favicon.ico (multi-size ICO file)
            if filename == "favicons/favicon-64x64.png":
                ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
                ico_images = []
                
                for ico_size in ico_sizes:
                    ico_img = img.copy()
                    ico_img = ico_img.resize(ico_size, Image.LANCZOS)
                    ico_images.append(ico_img)
                
                # Save as ICO file with multiple sizes
                ico_path = os.path.join(output_dir, "favicon.ico")
                ico_images[0].save(
                    ico_path,
                    format="ICO",
                    sizes=[(ico_images[i].width, ico_images[i].height) for i in range(len(ico_images))]
                )
                
                ico_size = os.path.getsize(ico_path) / 1024
                results.append({
                    "filename": "favicon.ico",
                    "size": "16x16, 32x32, 48x48, 64x64",
                    "file_size": f"{ico_size:.2f} KB"
                })
        
        # Create webmanifest file
        manifest = {
            "name": "bikenode",
            "short_name": "bikenode",
            "icons": [
                {
                    "src": "/favicons/android-chrome-192x192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "/favicons/android-chrome-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ],
            "theme_color": "#5865F2",
            "background_color": "#1a1c1f",
            "display": "standalone"
        }
        
        import json
        with open(os.path.join(output_dir, "site.webmanifest"), "w") as f:
            json.dump(manifest, f, indent=2)
        
        # Copy favicon.png to root
        shutil.copy2(os.path.join(output_dir, "favicons/favicon-32x32.png"), os.path.join(output_dir, "favicon.png"))
        
        # Print results
        print("\n✅ Generated Assets:")
        print("{:<40} {:<15} {:<12}".format("FILENAME", "DIMENSIONS", "FILE SIZE"))
        print("-" * 67)
        for result in results:
            print("{:<40} {:<15} {:<12}".format(
                result["filename"], 
                result["size"], 
                result["file_size"]
            ))
        
        print("\n➡️ All assets have been saved to the '{}' directory".format(output_dir))
        print("➡️ Don't forget to update your HTML with the appropriate image references")
        
        # Generate HTML snippet for inclusion
        html_snippet = """
<!-- Favicon -->
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">

<!-- Social Media Meta Tags -->
<meta property="og:image" content="https://bikenode.com/social/og-image.png">
<meta name="twitter:image" content="https://bikenode.com/social/twitter-card.png">
"""
        
        with open(os.path.join(output_dir, "html-snippet.txt"), "w") as f:
            f.write(html_snippet)
        
        print("\n➡️ HTML snippet saved to '{}/html-snippet.txt'".format(output_dir))
        
        return True
    
    except Exception as e:
        print(f"Error processing image: {e}")
        return False


if __name__ == "__main__":
    # Get the directory of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Path to image.png (in the same directory as the script)
    image_path = os.path.join(script_dir, "image.png")
    
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found!")
        sys.exit(1)
    
    # Create assets directory
    output_directory = os.path.join(script_dir, "assets")
    
    # Generate all assets
    create_image_assets(image_path, output_directory)