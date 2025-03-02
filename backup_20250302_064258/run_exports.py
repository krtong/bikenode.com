#!/usr/bin/env python3
"""
Utility to convert and export previously scraped bike data in different formats
"""
import os
import sys
import json
import argparse
import glob
from datetime import datetime
from pathlib import Path

def load_csv_data(filepath):
    """Load bike data from a CSV file"""
    try:
        import csv
        bikes = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                bikes.append(row)
        return bikes
    except Exception as e:
        print(f"Error loading CSV file: {e}")
        return None

def export_to_json(bikes, output_path):
    """Export bike data to JSON format"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(bikes, f, indent=2)
        return True
    except Exception as e:
        print(f"Error exporting to JSON: {e}")
        return False

def export_to_excel(bikes, output_path):
    """Export bike data to Excel format"""
    try:
        import pandas as pd
        df = pd.DataFrame(bikes)
        df.to_excel(output_path, index=False, engine='openpyxl')
        return True
    except ImportError:
        print("pandas and openpyxl packages are required for Excel export.")
        print("Install them with: pip install pandas openpyxl")
        return False
    except Exception as e:
        print(f"Error exporting to Excel: {e}")
        return False

def export_to_html(bikes, output_path, title="Bike Data"):
    """Export bike data to an HTML table"""
    try:
        if not bikes:
            print("No bike data to export")
            return False
            
        # Get column headers from the first bike
        headers = list(bikes[0].keys())
        
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
        }}
        h1 {{
            color: #333;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }}
        th {{
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
        }}
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        tr:hover {{
            background-color: #eaeaea;
        }}
        .info {{
            margin-bottom: 20px;
            color: #666;
        }}
        .export-date {{
            font-style: italic;
            color: #888;
            margin-top: 20px;
        }}
        @media print {{
            .no-print {{
                display: none;
            }}
        }}
        .search-box {{
            margin-bottom: 20px;
            padding: 8px;
            width: 300px;
            font-size: 16px;
        }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <div class="info">
        <p>Total bikes: {len(bikes)}</p>
    </div>
    
    <div class="no-print">
        <input type="text" id="searchBox" class="search-box" placeholder="Filter bikes...">
    </div>
    
    <table id="bikeTable">
        <thead>
            <tr>
"""
        
        # Add table headers
        for header in headers:
            html_content += f"                <th>{header}</th>\n"
        
        html_content += """            </tr>
        </thead>
        <tbody>
"""
        
        # Add rows for each bike
        for bike in bikes:
            html_content += "            <tr>\n"
            for header in headers:
                cell_value = bike.get(header, "")
                # Make URLs clickable
                if header.lower() in ["url", "link"] and cell_value.startswith("http"):
                    html_content += f'                <td><a href="{cell_value}" target="_blank">{cell_value}</a></td>\n'
                else:
                    html_content += f"                <td>{cell_value}</td>\n"
            html_content += "            </tr>\n"
        
        # Close the HTML
        html_content += f"""        </tbody>
    </table>
    
    <p class="export-date">Exported on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    
    <script>
        // Simple client-side filtering
        document.getElementById('searchBox').addEventListener('keyup', function() {{
            const searchTerm = this.value.toLowerCase();
            const rows = document.getElementById('bikeTable').getElementsByTagName('tbody')[0].getElementsByTagName('tr');
            
            for (let i = 0; i < rows.length; i++) {{
                const row = rows[i];
                const cells = row.getElementsByTagName('td');
                let found = false;
                
                for (let j = 0; j < cells.length; j++) {{
                    if (cells[j].textContent.toLowerCase().indexOf(searchTerm) > -1) {{
                        found = true;
                        break;
                    }}
                }}
                
                if (found) {{
                    row.style.display = '';
                }} else {{
                    row.style.display = 'none';
                }}
            }}
        }});
    </script>
</body>
</html>
"""
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        return True
    except Exception as e:
        print(f"Error exporting to HTML: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Convert and export bike data to various formats")
    parser.add_argument("input", help="Input CSV file with bike data")
    parser.add_argument("--format", choices=["json", "excel", "html", "all"], default="json", 
                       help="Output format (default: json)")
    parser.add_argument("--output", help="Output file path (default: auto-generated based on input)")
    
    args = parser.parse_args()
    
    # Check if input file exists
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' does not exist")
        return 1
    
    # Load the bike data
    print(f"Loading data from {args.input}...")
    bikes = load_csv_data(args.input)
    
    if not bikes:
        print("Failed to load bike data")
        return 1
    
    print(f"Loaded {len(bikes)} bikes")
    
    # Generate output path if not specified
    if not args.output:
        input_base = os.path.splitext(args.input)[0]
        if args.format == "all":
            output_json = f"{input_base}.json"
            output_excel = f"{input_base}.xlsx"
            output_html = f"{input_base}.html"
        else:
            extension = {"json": ".json", "excel": ".xlsx", "html": ".html"}[args.format]
            output_path = f"{input_base}{extension}"
    else:
        output_path = args.output
        if args.format == "all":
            base, _ = os.path.splitext(output_path)
            output_json = f"{base}.json"
            output_excel = f"{base}.xlsx"
            output_html = f"{base}.html"
    
    # Export the data in the specified format
    if args.format == "json" or args.format == "all":
        output = output_json if args.format == "all" else output_path
        print(f"Exporting to JSON: {output}")
        if export_to_json(bikes, output):
            print("✅ JSON export successful")
        else:
            print("❌ JSON export failed")
    
    if args.format == "excel" or args.format == "all":
        output = output_excel if args.format == "all" else output_path
        print(f"Exporting to Excel: {output}")
        if export_to_excel(bikes, output):
            print("✅ Excel export successful")
        else:
            print("❌ Excel export failed")
    
    if args.format == "html" or args.format == "all":
        output = output_html if args.format == "all" else output_path
        print(f"Exporting to HTML: {output}")
        title = f"Bike Data from {os.path.basename(args.input)}"
        if export_to_html(bikes, output, title):
            print("✅ HTML export successful")
        else:
            print("❌ HTML export failed")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
