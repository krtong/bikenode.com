#!/usr/bin/env python3
"""
Analysis tool for bike data scraped with hierarchical_bike_scraper.py
"""
import os
import sys
import json
import argparse
import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter
from datetime import datetime

def load_data(file_path):
    """Load bike data from CSV or JSON file"""
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    elif file_path.endswith('.json'):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return pd.json_normalize(data)
    else:
        raise ValueError(f"Unsupported file format: {file_path}")

def analyze_bikes(df):
    """Analyze bike data and return statistics"""
    stats = {
        "total_bikes": len(df),
        "brands": len(df['brand'].unique()),
        "families": len(df['family'].unique()),
        "by_year": df.groupby('year').size().to_dict(),
        "by_brand": df.groupby('brand').size().to_dict(),
        "by_type": {},
        "price_stats": {
            "min": None,
            "max": None,
            "avg": None,
            "median": None
        },
        "material_distribution": {},
        "ebike_count": 0
    }
    
    # Extract bike types if available
    if 'type' in df.columns:
        stats["by_type"] = df.groupby('type').size().to_dict()
    
    # Process price data
    if 'price' in df.columns:
        # Clean price strings and convert to float
        df['clean_price'] = df['price'].astype(str).str.replace('$', '').str.replace(',', '').astype(float)
        stats["price_stats"]["min"] = df['clean_price'].min()
        stats["price_stats"]["max"] = df['clean_price'].max()
        stats["price_stats"]["avg"] = df['clean_price'].mean()
        stats["price_stats"]["median"] = df['clean_price'].median()
    
    # Extract material distribution
    if 'material' in df.columns:
        stats["material_distribution"] = df.groupby('material').size().to_dict()
    
    # Count e-bikes
    ebike_columns = [col for col in df.columns if 'motor' in col.lower() or 'battery' in col.lower() or 'e_' in col.lower()]
    if ebike_columns:
        stats["ebike_count"] = df[df[ebike_columns[0]].notna()].shape[0] if len(ebike_columns) > 0 else 0
    
    return stats

def plot_statistics(stats, output_dir):
    """Generate plots from bike statistics"""
    os.makedirs(output_dir, exist_ok=True)
    
    # Plot bikes by year
    plt.figure(figsize=(12, 6))
    years = sorted(stats["by_year"].keys())
    counts = [stats["by_year"][year] for year in years]
    plt.bar(years, counts)
    plt.title('Bikes by Year')
    plt.xlabel('Year')
    plt.ylabel('Number of Bikes')
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'bikes_by_year.png'))
    
    # Plot top brands
    plt.figure(figsize=(12, 8))
    top_brands = sorted(stats["by_brand"].items(), key=lambda x: x[1], reverse=True)[:20]
    brands = [b[0] for b in top_brands]
    counts = [b[1] for b in top_brands]
    plt.barh(brands, counts)
    plt.title('Top 20 Brands by Bike Count')
    plt.xlabel('Number of Bikes')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'top_brands.png'))
    
    # Plot bike types if available
    if stats["by_type"]:
        plt.figure(figsize=(12, 8))
        top_types = sorted(stats["by_type"].items(), key=lambda x: x[1], reverse=True)[:15]
        types = [t[0] for t in top_types]
        counts = [t[1] for t in top_types]
        plt.barh(types, counts)
        plt.title('Bike Types Distribution')
        plt.xlabel('Number of Bikes')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'bike_types.png'))
    
    # Plot material distribution if available
    if stats["material_distribution"]:
        plt.figure(figsize=(10, 6))
        materials = stats["material_distribution"]
        labels = list(materials.keys())
        sizes = list(materials.values())
        plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140)
        plt.axis('equal')
        plt.title('Frame Material Distribution')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'materials.png'))

def generate_report(stats, output_file):
    """Generate a text report of bike statistics"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Bike Data Analysis Report\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write(f"## Overall Statistics\n")
        f.write(f"Total bikes: {stats['total_bikes']}\n")
        f.write(f"Total brands: {stats['brands']}\n")
        f.write(f"Total families: {stats['families']}\n")
        f.write(f"E-bikes count: {stats['ebike_count']}\n\n")
        
        f.write("## Price Information\n")
        if stats["price_stats"]["min"] is not None:
            f.write(f"Minimum price: ${stats['price_stats']['min']:.2f}\n")
            f.write(f"Maximum price: ${stats['price_stats']['max']:.2f}\n")
            f.write(f"Average price: ${stats['price_stats']['avg']:.2f}\n")
            f.write(f"Median price: ${stats['price_stats']['median']:.2f}\n\n")
        else:
            f.write("No price information available\n\n")
        
        f.write("## Top 10 Brands\n")
        top_brands = sorted(stats["by_brand"].items(), key=lambda x: x[1], reverse=True)[:10]
        for brand, count in top_brands:
            f.write(f"{brand}: {count} bikes\n")
        f.write("\n")
        
        if stats["by_type"]:
            f.write("## Top Bike Types\n")
            top_types = sorted(stats["by_type"].items(), key=lambda x: x[1], reverse=True)[:10]
            for type_name, count in top_types:
                f.write(f"{type_name}: {count} bikes\n")
            f.write("\n")
        
        if stats["material_distribution"]:
            f.write("## Frame Materials\n")
            for material, count in sorted(stats["material_distribution"].items(), key=lambda x: x[1], reverse=True):
                percentage = (count / stats['total_bikes']) * 100
                f.write(f"{material}: {count} bikes ({percentage:.1f}%)\n")
            f.write("\n")
        
        f.write("## Bikes by Year\n")
        for year in sorted(stats["by_year"].keys()):
            f.write(f"{year}: {stats['by_year'][year]} bikes\n")

def main():
    """Main function to analyze bike data"""
    parser = argparse.ArgumentParser(description="Analyze bike data from CSV or JSON files")
    parser.add_argument("file", help="Path to bike data file (CSV or JSON)")
    parser.add_argument("--output-dir", default="analysis_output", help="Output directory for analysis files")
    parser.add_argument("--report", default="bike_report.md", help="Output filename for text report")
    args = parser.parse_args()
    
    try:
        print(f"Loading data from {args.file}...")
        df = load_data(args.file)
        print(f"Loaded {len(df)} bikes")
        
        print("Analyzing data...")
        stats = analyze_bikes(df)
        
        print("Generating plots...")
        plot_statistics(stats, args.output_dir)
        
        print("Generating report...")
        report_path = os.path.join(args.output_dir, args.report)
        generate_report(stats, report_path)
        
        print(f"Analysis complete! Check {args.output_dir} for results.")
        print(f"Report saved to {report_path}")
        
    except Exception as e:
        print(f"Error during analysis: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
