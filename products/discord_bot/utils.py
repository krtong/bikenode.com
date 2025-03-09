import pandas as pd
import re
from typing import List, Dict, Any, Optional, Tuple
from config import MOTORCYCLES_CSV_PATH, MAX_SEARCH_RESULTS

def load_motorcycle_data() -> Optional[pd.DataFrame]:
    """Load motorcycle data from CSV file."""
    try:
        df = pd.read_csv(MOTORCYCLES_CSV_PATH)
        # Clean column names
        df.columns = [col.strip() for col in df.columns]
        return df
    except Exception as e:
        print(f"Error loading motorcycle data: {e}")
        return None

def search_motorcycles(query: str, df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Search for motorcycles matching the query."""
    query = query.lower()
    
    # Try to parse year from query
    year_match = re.search(r'\b(1[8-9]\d{2}|20\d{2})\b', query)
    year = int(year_match.group(0)) if year_match else None
    
    # Remove year from query if found
    if year:
        query = query.replace(year_match.group(0), '').strip()
    
    results = []
    
    # Filter by year if specified
    if year:
        df = df[df['Year'] == year]
    
    # Search in Make and Model columns
    for _, row in df.iterrows():
        make = str(row['Make']).lower() if not pd.isna(row['Make']) else ""
        model = str(row['Model']).lower() if not pd.isna(row['Model']) else ""
        
        # Skip if no query or neither make nor model contains query
        if not query or query in make or query in model:
            results.append({
                'Year': row['Year'],
                'Make': row['Make'],
                'Model': row['Model'],
                'Package': row['Package'] if not pd.isna(row['Package']) else "",
                'Category': row['Category'] if not pd.isna(row['Category']) else "",
                'Engine': row['Engine'] if not pd.isna(row['Engine']) else "",
            })
    
    # Sort by Year (newest first), then Make, then Model
    results.sort(key=lambda x: (-x['Year'], x['Make'], x['Model']))
    
    return results[:MAX_SEARCH_RESULTS]

def format_motorcycle_info(motorcycle: Dict[str, Any]) -> str:
    """Format motorcycle information for display."""
    package_str = f" {motorcycle['Package']}" if motorcycle['Package'] else ""
    info = [
        f"**{motorcycle['Year']} {motorcycle['Make']} {motorcycle['Model']}{package_str}**",
        f"**Category:** {motorcycle['Category']}" if motorcycle['Category'] else "",
        f"**Engine:** {motorcycle['Engine']}" if motorcycle['Engine'] else "",
    ]
    return "\n".join(filter(None, info))  # Remove empty lines

def get_motorcycle_stats(df: pd.DataFrame) -> Dict[str, int]:
    """Get statistics about the motorcycle database."""
    return {
        "total": len(df),
        "makes": df['Make'].nunique(),
        "years": df['Year'].nunique(),
        "oldest": df['Year'].min(),
        "newest": df['Year'].max(),
        "categories": df['Category'].nunique(),
    }
