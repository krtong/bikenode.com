#!/usr/bin/env python3
"""
Shared utilities for the crawl-scrape pipeline.
"""

import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse, urljoin

import pandas as pd
import yaml


def setup_logging(name: str, log_file: Optional[Path] = None, level: str = 'INFO') -> logging.Logger:
    """Set up logging for a pipeline step."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # File handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    
    return logger


def load_json(file_path: Union[str, Path]) -> Any:
    """Load JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(data: Any, file_path: Union[str, Path], indent: int = 2) -> None:
    """Save data to JSON file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


def load_yaml(file_path: Union[str, Path]) -> Any:
    """Load YAML file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def save_yaml(data: Any, file_path: Union[str, Path]) -> None:
    """Save data to YAML file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True)


def load_ndjson(file_path: Union[str, Path]) -> List[Dict[str, Any]]:
    """Load newline-delimited JSON file."""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                data.append(json.loads(line))
    return data


def save_ndjson(data: List[Dict[str, Any]], file_path: Union[str, Path]) -> None:
    """Save data to newline-delimited JSON file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')


def append_ndjson(item: Dict[str, Any], file_path: Union[str, Path]) -> None:
    """Append a single item to newline-delimited JSON file."""
    with open(file_path, 'a', encoding='utf-8') as f:
        f.write(json.dumps(item, ensure_ascii=False) + '\n')


def normalize_url(url: str, base_url: Optional[str] = None) -> str:
    """Normalize URL by removing fragments and resolving relative paths."""
    if base_url:
        url = urljoin(base_url, url)
    
    parsed = urlparse(url)
    # Remove fragment and normalize
    normalized = parsed._replace(fragment='').geturl()
    
    # Remove trailing slash for consistency (except for root path)
    if normalized.endswith('/') and parsed.path != '/':
        normalized = normalized.rstrip('/')
    
    return normalized


def extract_domain(url: str) -> str:
    """Extract domain from URL."""
    parsed = urlparse(url)
    return parsed.netloc


def is_valid_url(url: str) -> bool:
    """Check if URL is valid."""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def create_timestamp() -> str:
    """Create ISO format timestamp."""
    return datetime.utcnow().isoformat() + 'Z'


def clean_text(text: str) -> str:
    """Clean text by removing extra whitespace and normalizing."""
    if not text:
        return ''
    
    # Replace multiple whitespace with single space
    text = ' '.join(text.split())
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def extract_numbers(text: str) -> List[float]:
    """Extract all numbers from text."""
    import re
    
    # Pattern for numbers including decimals and thousands separators
    pattern = r'[\d,]+\.?\d*'
    matches = re.findall(pattern, text)
    
    numbers = []
    for match in matches:
        try:
            # Remove commas and convert to float
            num = float(match.replace(',', ''))
            numbers.append(num)
        except ValueError:
            continue
    
    return numbers


def extract_price(text: str) -> Optional[float]:
    """Extract price from text."""
    import re
    
    # Common price patterns
    patterns = [
        r'\$\s*([\d,]+\.?\d*)',  # $123.45
        r'USD\s*([\d,]+\.?\d*)',  # USD 123.45
        r'([\d,]+\.?\d*)\s*(?:dollars?|bucks?)',  # 123.45 dollars
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                price = float(match.group(1).replace(',', ''))
                return price
            except ValueError:
                continue
    
    # Try to find any number that looks like a price
    numbers = extract_numbers(text)
    if numbers:
        # Return the first reasonable price-like number
        for num in numbers:
            if 0.01 <= num <= 1000000:  # Reasonable price range
                return num
    
    return None


def create_hash(data: Union[str, Dict[str, Any]]) -> str:
    """Create a hash of data for deduplication."""
    import hashlib
    
    if isinstance(data, dict):
        # Sort keys for consistent hashing
        data = json.dumps(data, sort_keys=True, ensure_ascii=False)
    
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """Split list into chunks of specified size."""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def read_urls_file(file_path: Union[str, Path]) -> List[str]:
    """Read URLs from a text file (one per line)."""
    urls = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            url = line.strip()
            if url and not url.startswith('#'):  # Skip empty lines and comments
                urls.append(url)
    return urls


def write_urls_file(urls: List[str], file_path: Union[str, Path]) -> None:
    """Write URLs to a text file (one per line)."""
    with open(file_path, 'w', encoding='utf-8') as f:
        for url in urls:
            f.write(url + '\n')


def ensure_dir(path: Union[str, Path]) -> Path:
    """Ensure directory exists, create if necessary."""
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_file_size(file_path: Union[str, Path]) -> int:
    """Get file size in bytes."""
    return Path(file_path).stat().st_size


def format_bytes(size: int) -> str:
    """Format bytes to human readable string."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"


def safe_filename(filename: str) -> str:
    """Create a safe filename by removing/replacing invalid characters."""
    import re
    
    # Replace invalid characters with underscore
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Remove control characters
    filename = ''.join(char for char in filename if ord(char) >= 32)
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        max_name_len = 255 - len(ext) - 1 if ext else 255
        filename = name[:max_name_len] + ('.' + ext if ext else '')
    
    return filename