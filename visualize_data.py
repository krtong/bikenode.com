#!/usr/bin/env python3
"""
Generate visualizations from the bike data
"""
import os
import sys
import json
import csv
import argparse
import re
from collections import Counter, defaultdict
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

def load_data(filename):
    """Load bike data from CSV or JSON file"""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.csv':
        bikes = []
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    bikes.append(row)
            return bikes
        except Exception as e:
            print(f"Error reading CSV file: {e}")
            return None
    elif ext == '.json':
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading JSON file: {e}")
            return None
    else:
        print(f"Unsupported file extension: {ext}")
        return None

def extract_price(price_str):
    """Extract numeric price from string with currency"""
    if not price_str or not isinstance(price_str, str):
        return None
        
    # Extract price using regex
    match = re.search(r'[$£€]?([\d,]+)(\.\d+)?', price_str)
    if match:
        try:
            # Convert to float, removing commas
            return float(match.group(1).replace(',', ''))
        except:
            pass
    return None

def prepare_dataframe(bikes):
    """Convert bike data to pandas DataFrame with cleaned columns"""
    df = pd.DataFrame(bikes)
    
    # Clean up the price column
    if 'price' in df.columns:
        # Convert price strings to float
        df['price_numeric'] = df['price'].apply(extract_price)
    
    # Convert year to numeric
    if 'year' in df.columns:
        df['year'] = pd.to_numeric(df['year'], errors='coerce')
    
    # Ensure brand column exists (could be 'make' in some datasets)
    if 'brand' not in df.columns and 'make' in df.columns:
        df['brand'] = df['make']
    
    # Get bike type (from various possible fields)
    if 'type' in df.columns:
        df['bike_type'] = df['type']
    elif 'spec_Type' in df.columns:
        df['bike_type'] = df['spec_Type']
    elif 'spec_Category' in df.columns:
        df['bike_type'] = df['spec_Category']
    else:
        # Try to extract type from model name
        def extract_type(model):
            if not model or not isinstance(model, str):
                return 'unknown'
            model = model.lower()
            types = ['road', 'mountain', 'mtb', 'gravel', 'city', 'electric', 'hybrid', 'bmx']
            for bike_type in types:
                if bike_type in model:
                    return bike_type
            return 'unknown'
            
        if 'model' in df.columns:
            df['bike_type'] = df['model'].apply(extract_type)
        else:
            df['bike_type'] = 'unknown'
    
    return df

def create_price_distribution(df, output_dir):
    """Create price distribution visualizations"""
    # Setup
    sns.set(style="whitegrid")
    plt.figure(figsize=(12, 8))
    
    # Basic price histogram
    price_data = df['price_numeric'].dropna()
    price_data = price_data[price_data < price_data.quantile(0.99)]  # Remove extreme outliers
    
    sns.histplot(price_data, kde=True, bins=30)
    plt.title('Bike Price Distribution', fontsize=16)
    plt.xlabel('Price ($)', fontsize=14)
    plt.ylabel('Count', fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'price_distribution.png'))
    plt.close()
    
    # Price ranges histogram
    plt.figure(figsize=(12, 8))
    price_ranges = [
        (0, 500, '<$500'),
        (500, 1000, '$500-1000'),
        (1000, 2000, '$1000-2000'),
        (2000, 3000, '$2000-3000'),
        (3000, 5000, '$3000-5000'),
        (5000, 10000, '$5000-10000'),
        (10000, float('inf'), '>$10000')
    ]
    
    # Create price range column
    def get_price_range(price):
        if pd.isna(price):
            return 'Unknown'
        for low, high, label in price_ranges:
            if low <= price < high:
                return label
        return 'Unknown'
        
    df['price_range'] = df['price_numeric'].apply(get_price_range)
    
    # Plot the price ranges
    range_counts = df['price_range'].value_counts().reset_index()
    range_counts.columns = ['Price Range', 'Count']
    
    # Order the ranges correctly
    range_order = [r[2] for r in price_ranges] + ['Unknown']
    range_counts['Price Range'] = pd.Categorical(
        range_counts['Price Range'], 
        categories=range_order, 
        ordered=True
    )
    range_counts = range_counts.sort_values('Price Range')
    
    sns.barplot(x='Price Range', y='Count', data=range_counts)
    plt.title('Bike Price Ranges', fontsize=16)
    plt.xlabel('Price Range', fontsize=14)
    plt.ylabel('Count', fontsize=14)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'price_ranges.png'))
    plt.close()
    
    return {
        'price_mean': price_data.mean(),
        'price_median': price_data.median(),
        'price_min': price_data.min(),
        'price_max': price_data.max()
    }

def create_brand_distribution(df, output_dir, top_n=20):
    """Create brand distribution visualizations"""
    plt.figure(figsize=(14, 10))
    
    # Get top brands
    top_brands = df['brand'].value_counts().head(top_n)
    
    # Plot horizontal bar chart
    ax = sns.barplot(x=top_brands.values, y=top_brands.index, palette='viridis')
    plt.title(f'Top {top_n} Bike Brands', fontsize=16)
    plt.xlabel('Number of Bikes', fontsize=14)
    plt.ylabel('Brand', fontsize=14)
    
    # Add count labels to the bars
    for i, v in enumerate(top_brands.values):
        ax.text(v + 0.5, i, str(v), color='black', va='center')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'top_brands.png'))
    plt.close()
    
    # Brand + Type breakdown (bubble chart)
    plt.figure(figsize=(14, 10))
    
    # Get top 10 brands and bike types
    top_10_brands = df['brand'].value_counts().head(10).index
    brand_type_counts = df[df['brand'].isin(top_10_brands)].groupby(['brand', 'bike_type']).size().reset_index()
    brand_type_counts.columns = ['Brand', 'Type', 'Count']
    
    # Create pivot table
    pivot_data = brand_type_counts.pivot_table(index='Brand', columns='Type', values='Count', fill_value=0)
    
    # Plot heatmap
    sns.heatmap(pivot_data, annot=True, fmt='g', cmap='viridis', linewidths=.5)
    plt.title('Bike Types by Brand', fontsize=16)
    plt.ylabel('Brand', fontsize=14)
    plt.xlabel('Bike Type', fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'brand_type_heatmap.png'))
    plt.close()
    
    return {
        'total_brands': df['brand'].nunique(),
        'top_brand': df['brand'].value_counts().index[0],
        'top_brand_count': df['brand'].value_counts().values[0]
    }

def create_bike_type_analysis(df, output_dir):
    """Create bike type distribution visualizations"""
    # Clean up bike types (normalize)
    def normalize_type(bike_type):
        if not bike_type or not isinstance(bike_type, str):
            return 'unknown'
            
        bike_type = bike_type.lower()
        
        # Map common variations
        type_mapping = {
            'mtb': 'mountain',
            'emtb': 'e-mountain',
            'e-mtb': 'e-mountain',
            'ebike': 'electric',
            'e-bike': 'electric',
            'urban': 'city',
            'commuter': 'city',
            'road': 'road',
            'gravel': 'gravel',
            'cross': 'cyclocross',
            'cx': 'cyclocross',
            'cruiser': 'cruiser',
            'kids': 'kids',
            'bmx': 'bmx'
        }
        
        # Look for keywords in the type
        for keyword, mapped_type in type_mapping.items():
            if keyword in bike_type:
                return mapped_type
                
        return bike_type
    
    df['normalized_type'] = df['bike_type'].apply(normalize_type)
    
    # Bike types pie chart
    plt.figure(figsize=(12, 12))
    type_counts = df['normalized_type'].value_counts()
    
    # Keep only top types, group others
    top_types = type_counts.head(8)
    if len(type_counts) > 8:
        top_types['Other'] = type_counts[8:].sum()
    
    plt.pie(top_types, labels=top_types.index, autopct='%1.1f%%', startangle=90,
            shadow=True, explode=[0.1 if i == 0 else 0 for i in range(len(top_types))],
            textprops={'fontsize': 14})
    plt.title('Bike Types Distribution', fontsize=16)
    plt.axis('equal')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'bike_types_pie.png'))
    plt.close()
    
    # Price by bike type (box plot)
    plt.figure(figsize=(14, 8))
    
    # Filter to top 8 types with significant data
    type_with_prices = df.dropna(subset=['price_numeric'])
    top_types_with_data = type_with_prices['normalized_type'].value_counts().head(8).index
    plot_data = type_with_prices[type_with_prices['normalized_type'].isin(top_types_with_data)]
    
    # Remove extreme outliers
    plot_data = plot_data[plot_data['price_numeric'] < plot_data['price_numeric'].quantile(0.95)]
    
    sns.boxplot(x='normalized_type', y='price_numeric', data=plot_data)
    plt.title('Price Distribution by Bike Type', fontsize=16)
    plt.xlabel('Bike Type', fontsize=14)
    plt.ylabel('Price ($)', fontsize=14)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'price_by_type.png'))
    plt.close()
    
    return {
        'top_type': type_counts.index[0],
        'type_counts': type_counts.to_dict()
    }

def create_year_analysis(df, output_dir):
    """Create year-based visualizations"""
    if 'year' not in df.columns or df['year'].isna().all():
        return {"error": "No year data available"}
    
    # Filter out extreme outliers and NaN years
    year_data = df.dropna(subset=['year'])
    year_data = year_data[year_data['year'] > 1990]  # Filter unrealistic years
    
    plt.figure(figsize=(12, 8))
    
    # Year distribution
    sns.countplot(x='year', data=year_data)
    plt.title('Bikes by Model Year', fontsize=16)
    plt.xlabel('Year', fontsize=14)
    plt.ylabel('Count', fontsize=14)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'bikes_by_year.png'))
    plt.close()
    
    # Price trends by year
    plt.figure(figsize=(12, 8))
    
    # Get average and median prices by year
    year_price = year_data.dropna(subset=['price_numeric']).groupby('year')['price_numeric'].agg(['mean', 'median']).reset_index()
    
    sns.lineplot(x='year', y='mean', data=year_price, marker='o', label='Mean Price')
    sns.lineplot(x='year', y='median', data=year_price, marker='s', label='Median Price')
    plt.title('Bike Price Trends by Year', fontsize=16)
    plt.xlabel('Year', fontsize=14)
    plt.ylabel('Price ($)', fontsize=14)
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'price_trends_by_year.png'))
    plt.close()
    
    return {
        'year_distribution': year_data['year'].value_counts().to_dict(),
        'newest_year': int(year_data['year'].max()),
        'oldest_year': int(year_data['year'].min())
    }

def generate_visualizations(df, output_dir):
    """Generate all visualizations"""
    print(f"Generating visualizations in {output_dir}...")
    os.makedirs(output_dir, exist_ok=True)
    
    # Create the visualizations
    price_stats = create_price_distribution(df, output_dir)
    brand_stats = create_brand_distribution(df, output_dir)
    type_stats = create_bike_type_analysis(df, output_dir)
    year_stats = create_year_analysis(df, output_dir)
    
    # Create summary
    summary = {
        "data_points": len(df),
        "price_stats": price_stats,
        "brand_stats": brand_stats,
        "type_stats": type_stats,
        "year_stats": year_stats
    }
    
    # Print key insights
    print("\n" + "=" * 80)
    print("DATA VISUALIZATION COMPLETE - KEY INSIGHTS")
    print("=" * 80)
    print(f"Total bikes analyzed: {len(df)}")
    print(f"Total brands: {brand_stats['total_brands']}")
    print(f"Most common brand: {brand_stats['top_brand']} ({brand_stats['top_brand_count']} bikes)")
    print(f"Most common type: {type_stats['top_type']}")
    print(f"Median price: ${price_stats['price_median']:.2f}")
    print(f"Year range: {year_stats.get('oldest_year', 'N/A')} - {year_stats.get('newest_year', 'N/A')}")
    print("=" * 80)
    
    print("\nVisualizations saved to:")
    for img in os.listdir(output_dir):
        if img.endswith('.png'):
            print(f"- {os.path.join(output_dir, img)}")
    
    # Save summary data
    with open(os.path.join(output_dir, 'visualization_summary.json'), 'w') as f:
        json.dump(summary, f, indent=2)
    
    return summary

def main():
    parser = argparse.ArgumentParser(description="Generate visualizations from bike data")
    parser.add_argument("file", help="CSV or JSON file containing bike data")
    parser.add_argument("--output", default="bike_visualizations", 
                        help="Output directory for visualizations")
    args = parser.parse_args()
    
    # Check if matplotlib is available
    try:
        import matplotlib
    except ImportError:
        print("Error: This script requires matplotlib. Install it with:")
        print("pip install matplotlib pandas seaborn")
        return 1
    
    # Load the data
    print(f"Loading data from {args.file}...")
    bikes = load_data(args.file)
    
    if not bikes:
        print("Error loading bike data")
        return 1
    
    # Convert to DataFrame and clean data
    print(f"Processing {len(bikes)} bike records...")
    df = prepare_dataframe(bikes)
    
    # Generate visualizations
    generate_visualizations(df, args.output)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
