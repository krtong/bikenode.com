import os
from bs4 import BeautifulSoup
import re
import argparse
import json

def analyze_html(html_path):
    """Analyze an HTML file to find potential bike listing elements"""
    print(f"Analyzing {html_path}")
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract the page title
    title = soup.title.string if soup.title else "No title found"
    print(f"Page title: {title}")
    
    # Look for common bike-related classes
    bike_related_patterns = ['bike', 'product', 'listing', 'card', 'item', 'result']
    potential_elements = {}
    
    for pattern in bike_related_patterns:
        # Find elements with class names containing the pattern
        elements = soup.find_all(class_=re.compile(pattern, re.IGNORECASE))
        if elements:
            print(f"Found {len(elements)} elements with class containing '{pattern}'")
            # Store the first few examples
            examples = []
            for i, el in enumerate(elements[:3]):
                if el.name:
                    class_attr = el.get('class', [])
                    class_str = ' '.join(class_attr) if class_attr else ""
                    examples.append({
                        "tag": el.name,
                        "class": class_str,
                        "id": el.get('id', ''),
                        "text_preview": el.get_text()[:50].strip()
                    })
            potential_elements[pattern] = examples
    
    # Look for potential list/grid containers
    containers = soup.find_all(['ul', 'div', 'section'], class_=re.compile('(list|grid|results|container)'))
    if containers:
        print(f"Found {len(containers)} potential container elements")
        for i, container in enumerate(containers[:3]):
            child_count = len(container.find_all(recursive=False))
            print(f"  Container {i+1}: {container.name}.{' '.join(container.get('class', []))} with {child_count} direct children")
    
    # Output some stats
    tag_counts = {}
    for tag in soup.find_all():
        tag_name = tag.name
        tag_counts[tag_name] = tag_counts.get(tag_name, 0) + 1
    
    print("\nTag statistics:")
    for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {tag}: {count}")
    
    # Save analysis results
    output_path = html_path.replace('.html', '_analysis.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "title": title,
            "potential_bike_elements": potential_elements,
            "tag_counts": tag_counts
        }, f, indent=2)
    
    print(f"Analysis saved to {output_path}")
    return potential_elements

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analyze saved HTML files to identify bike listing elements')
    parser.add_argument('html_file', nargs='?', help='HTML file to analyze')
    parser.add_argument('--dir', help='Directory containing HTML files to analyze')
    
    args = parser.parse_args()
    
    if args.html_file:
        analyze_html(args.html_file)
    elif args.dir:
        for file in os.listdir(args.dir):
            if file.endswith('.html'):
                analyze_html(os.path.join(args.dir, file))
    else:
        # Default to debug_output directory
        debug_dir = "debug_output"
        if os.path.exists(debug_dir):
            for file in os.listdir(debug_dir):
                if file.endswith('.html'):
                    analyze_html(os.path.join(debug_dir, file))
        else:
            print(f"Error: {debug_dir} directory not found")
