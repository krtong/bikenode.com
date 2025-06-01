import os
import sys
import time
from datetime import datetime

# Import our scraper and analyzer
sys.path.append(os.path.dirname(__file__))
from analyze_bike_data import BikeDataAnalyzer

def run_scraper():
    """Run the specific bikes scraper"""
    print("Running 99spokes.com specific bikes scraper...")
    os.system('python 99spokes_specific_bikes.py')

def run_analyzer(data_file=None):
    """Run the bike data analyzer"""
    print("Running bike data analyzer...")
    
    if data_file:
        analyzer = BikeDataAnalyzer(data_file)
    else:
        # Find the most recent data file
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        data_files = [f for f in os.listdir(data_dir) if f.startswith('99spokes_specific_bikes_')]
        
        if data_files:
            # Sort by timestamp (newest first)
            latest_file = sorted(data_files, reverse=True)[0]
            data_file_path = os.path.join(data_dir, latest_file)
            analyzer = BikeDataAnalyzer(data_file_path)
        else:
            print("No bike data files found. Please run a scraper first.")
            return
    
    # Run analysis
    analyzer.run_analysis()

def generate_report():
    """Generate a final HTML report"""
    print("Generating final report...")
    
    # Create report directory if it doesn't exist
    report_dir = os.path.join(os.path.dirname(__file__), 'report')
    if not os.path.exists(report_dir):
        os.makedirs(report_dir)
    
    # Get the latest data file
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    data_files = [f for f in os.listdir(data_dir) if f.startswith('99spokes_specific_bikes_')]
    
    if not data_files:
        print("No bike data files found. Please run a scraper first.")
        return
    
    # Sort by timestamp (newest first)
    latest_file = sorted(data_files, reverse=True)[0]
    data_file_path = os.path.join(data_dir, latest_file)
    
    # Get the latest summary file
    analysis_dir = os.path.join(os.path.dirname(__file__), 'analysis')
    summary_file = os.path.join(analysis_dir, 'bike_data_summary.json')
    
    # Get visualization files
    brand_dist_file = os.path.join(analysis_dir, 'brand_distribution.png')
    suspension_dist_file = os.path.join(analysis_dir, 'suspension_distribution.png')
    weight_dist_file = os.path.join(analysis_dir, 'weight_distribution.png')
    price_weight_file = os.path.join(analysis_dir, 'price_vs_weight.png')
    
    # Create HTML report
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>99Spokes.com Bike Data Analysis</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                color: #333;
            }}
            h1, h2, h3 {{
                color: #2c3e50;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
            }}
            .header {{
                background-color: #f8f9fa;
                padding: 20px;
                margin-bottom: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }}
            .section {{
                margin-bottom: 30px;
                padding: 20px;
                background-color: #fff;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }}
            .visualization {{
                text-align: center;
                margin: 20px 0;
            }}
            .visualization img {{
                max-width: 100%;
                height: auto;
                border: 1px solid #ddd;
                border-radius: 5px;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            table, th, td {{
                border: 1px solid #ddd;
            }}
            th, td {{
                padding: 12px;
                text-align: left;
            }}
            th {{
                background-color: #f2f2f2;
            }}
            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>99Spokes.com Bike Data Analysis</h1>
                <p>Report generated on: {timestamp}</p>
                <p>Data source: {latest_file}</p>
            </div>
            
            <div class="section">
                <h2>Visualizations</h2>
                
                <div class="visualization">
                    <h3>Brand Distribution</h3>
                    <img src="../analysis/brand_distribution.png" alt="Brand Distribution">
                </div>
                
                <div class="visualization">
                    <h3>Suspension Type Distribution</h3>
                    <img src="../analysis/suspension_distribution.png" alt="Suspension Type Distribution">
                </div>
                
                <div class="visualization">
                    <h3>Weight Distribution</h3>
                    <img src="../analysis/weight_distribution.png" alt="Weight Distribution">
                </div>
                
                <div class="visualization">
                    <h3>Price vs Weight</h3>
                    <img src="../analysis/price_vs_weight.png" alt="Price vs Weight">
                </div>
            </div>
            
            <div class="section">
                <h2>Data Collection Process</h2>
                <p>The data was collected using a Python-based web scraper that extracts bike information from 99spokes.com. The scraper uses the following approach:</p>
                <ol>
                    <li>Uses cloudscraper library to bypass Cloudflare protection</li>
                    <li>Accesses specific bike URLs directly</li>
                    <li>Extracts detailed specifications for each bike</li>
                    <li>Saves the data in JSON format for analysis</li>
                </ol>
                <p>The analysis was performed using pandas and matplotlib to generate statistics and visualizations.</p>
            </div>
            
            <div class="footer">
                <p>&copy; 2025 BikeNode.com - All Rights Reserved</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Save HTML report
    report_file = os.path.join(report_dir, 'bike_analysis_report.html')
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"Report generated: {report_file}")

def run_pipeline():
    """Run the complete pipeline: scraping, analysis, and reporting"""
    print("Starting 99spokes.com data pipeline...")
    
    # Step 1: Run the scraper
    run_scraper()
    
    # Step 2: Run the analyzer
    run_analyzer()
    
    # Step 3: Generate the report
    generate_report()
    
    print("Pipeline completed successfully!")

if __name__ == "__main__":
    run_pipeline()