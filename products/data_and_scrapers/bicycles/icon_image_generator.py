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