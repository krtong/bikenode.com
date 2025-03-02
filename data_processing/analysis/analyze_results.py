#!/usr/bin/env python3
"""
Analyze and summarize scraped bike data
"""
import os
import sys
import argparse
import json
import csv
import re
from collections import Counter, defaultdict

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

def analyze_data(bikes):
    """Analyze bike data and return statistics"""
    if not bikes:
        return {"error": "No bike data found"}
    
    stats = {
        "total_bikes": len(bikes),
        "years": Counter(),
        "brands": Counter(),
        "types": Counter(),
        "price_ranges": {
            "<500": 0,
            "500-1000": 0,
            "1000-2000": 0,
            "2000-3000": 0,
            "3000-5000": 0,
            "5000-10000": 0,
            ">10000": 0,
            "unknown": 0
        },
        "brands_by_year": defaultdict(Counter),
        "models_by_brand": defaultdict(list),
        "median_price": 0
    }
    
    prices = []
    
    for bike in bikes:
        # Count years
        year = bike.get("year", "unknown")
        stats["years"][year] += 1
        
        # Count brands
        brand = bike.get("brand", bike.get("make", "unknown")).lower()
        stats["brands"][brand] += 1
        
        # Add to brands by year
        stats["brands_by_year"][year][brand] += 1
        
        # Add to models by brand
        model = bike.get("model", "unknown")
        if model != "unknown":
            stats["models_by_brand"][brand].append(model)
        
        # Determine bike type
        bike_type = "unknown"
        
        # Try different fields that might contain type information
        type_fields = ["type", "spec_Type", "spec_Category", "spec_class", "category"]
        for field in type_fields:
            if field in bike and bike[field]:
                bike_type = bike[field].lower()
                break
                
        # Check title or description for common bike types if not found
        if bike_type == "unknown" and "title" in bike:
            title = bike["title"].lower()
            for keyword in ["road", "mountain", "mtb", "gravel", "city", "urban", 
                           "hybrid", "electric", "e-bike", "cruiser", "commuter"]:
                if keyword in title:
                    bike_type = keyword
                    break
                    
        # Try to extract bike type from model name as last resort
        if bike_type == "unknown" and model != "unknown":
            model_lower = model.lower()
            for keyword in ["road", "gravel", "mountain", "mtb", "hybrid", "e-", "electric"]:
                if keyword in model_lower:
                    bike_type = keyword
                    break
        
        stats["types"][bike_type] += 1
        
        # Determine price range
        price = bike.get("price", "")
        if price:
            # Extract numeric price
            price_match = re.search(r'[$£€]?([\d,]+)(\.\d+)?', price)
            if price_match:
                try:
                    # Convert to int, removing commas
                    price_value = int(price_match.group(1).replace(',', ''))
                    prices.append(price_value)
                    
                    # Increment appropriate price range
                    if price_value < 500:
                        stats["price_ranges"]["<500"] += 1
                    elif price_value < 1000:
                        stats["price_ranges"]["500-1000"] += 1
                    elif price_value < 2000:
                        stats["price_ranges"]["1000-2000"] += 1
                    elif price_value < 3000:
                        stats["price_ranges"]["2000-3000"] += 1
                    elif price_value < 5000:
                        stats["price_ranges"]["3000-5000"] += 1
                    elif price_value < 10000:
                        stats["price_ranges"]["5000-10000"] += 1
                    else:
                        stats["price_ranges"][">10000"] += 1
                except:
                    stats["price_ranges"]["unknown"] += 1
            else:
                stats["price_ranges"]["unknown"] += 1
        else:
            stats["price_ranges"]["unknown"] += 1
    
    # Calculate median price if we have prices
    if prices:
        prices.sort()
        mid = len(prices) // 2
        if len(prices) % 2 == 0:
            stats["median_price"] = (prices[mid - 1] + prices[mid]) / 2
        else:
            stats["median_price"] = prices[mid]
    
    # Get top brands
    stats["top_brands"] = stats["brands"].most_common(15)
    
    # Get top types
    stats["top_types"] = stats["types"].most_common(10)
    
    # Calculate models per brand for top brands
    stats["models_per_brand"] = {brand: len(models) for brand, models 
                                in stats["models_by_brand"].items() 
                                if len(models) > 5}
    
    # Get brands with most variety
    stats["brands_by_variety"] = sorted(stats["models_per_brand"].items(), 
                                       key=lambda x: x[1], reverse=True)[:10]
    
    return stats

def print_report(stats):
    """Print a formatted report of the statistics"""
    print("\n" + "=" * 70)
    print(" " * 25 + "BIKE DATA ANALYSIS")
    print("=" * 70)
    
    print(f"\nTotal bikes found: {stats['total_bikes']}")
    
    print("\n--- By Year ---")
    for year, count in sorted(stats["years"].items()):
        print(f"{year}: {count} bikes")
    
    print("\n--- Top 15 Brands ---")
    for brand, count in stats["top_brands"]:
        print(f"{brand.title()}: {count} bikes")
    
    print("\n--- Top 10 Bike Types ---")
    for bike_type, count in stats["top_types"]:
        print(f"{bike_type.title()}: {count} bikes")
    
    print("\n--- Price Distribution ---")
    total_with_price = sum(stats["price_ranges"].values()) - stats["price_ranges"]["unknown"]
    for price_range, count in stats["price_ranges"].items():
        if price_range != "unknown":
            percentage = (count / stats["total_bikes"]) * 100
            print(f"{price_range}: {count} bikes ({percentage:.1f}%)")
    
    print(f"\nBikes without price: {stats['price_ranges']['unknown']} ({(stats['price_ranges']['unknown'] / stats['total_bikes']) * 100:.1f}%)")
    
    if stats["median_price"] > 0:
        print(f"\nMedian price: ${stats['median_price']:.2f}")
    
    print("\n--- Top 10 Brands by Model Variety ---")
    for brand, model_count in stats["brands_by_variety"]:
        print(f"{brand.title()}: {model_count} different models")
    
    print("\n" + "=" * 70)

def main():
    parser = argparse.ArgumentParser(description="Analyze scraped bike data")
    parser.add_argument("filename", help="CSV or JSON file with bike data")
    parser.add_argument("--output", help="Save analysis to JSON file")
    args = parser.parse_args()
    
    if not os.path.exists(args.filename):
        print(f"Error: File {args.filename} not found")
        return 1
    
    print(f"Loading data from {args.filename}...")
    bikes = load_data(args.filename)
    
    if not bikes:
        print("Error loading bike data")
        return 1
    
    print(f"Analyzing {len(bikes)} bikes...")
    stats = analyze_data(bikes)
    
    print_report(stats)
    
    if args.output:
        try:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=2)
            print(f"\nSaved analysis to {args.output}")
        except Exception as e:
            print(f"Error saving analysis: {e}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
