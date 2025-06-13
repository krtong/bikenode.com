#!/usr/bin/env python3
"""
Minimal utilities for the crawl-scrape pipeline without heavy dependencies.
"""

import json
import logging
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse, urljoin
# import yaml  # Commented out to avoid dependency issues
import re


def setup_logging(name: str, log_file: Optional[Path] = None, level: str = 'INFO') -> logging.Logger:
    """Set up logging for a pipeline step."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level))
    
    # Remove existing handlers
    logger.handlers = []
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(
        logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    )
    logger.addHandler(console_handler)
    
    # File handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(
            logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        )
        logger.addHandler(file_handler)
    
    return logger


def ensure_dir(path: Path) -> Path:
    """Ensure directory exists."""
    path.mkdir(parents=True, exist_ok=True)
    return path


def create_timestamp() -> str:
    """Create ISO timestamp."""
    return datetime.utcnow().isoformat() + 'Z'


def save_json(data: Any, filepath: Path, indent: int = 2) -> None:
    """Save data as JSON."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


def load_json(filepath: Path) -> Any:
    """Load JSON data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_yaml(data: Any, filepath: Path) -> None:
    """Save data as YAML."""
    # For now, save as JSON instead
    save_json(data, filepath.with_suffix('.json'))


def load_yaml(filepath: Path) -> Any:
    """Load YAML data."""
    # For now, try to load JSON instead
    json_path = filepath.with_suffix('.json')
    if json_path.exists():
        return load_json(json_path)
    # Return empty dict if not found
    return {}


def append_ndjson(data: Dict[str, Any], filepath: Path) -> None:
    """Append a record to NDJSON file."""
    with open(filepath, 'a', encoding='utf-8') as f:
        f.write(json.dumps(data, ensure_ascii=False) + '\n')


def load_ndjson(filepath: Path) -> List[Dict[str, Any]]:
    """Load all records from NDJSON file."""
    records = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def read_urls_file(filepath: Path) -> List[str]:
    """Read URLs from text file (one per line)."""
    urls = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            url = line.strip()
            if url and not url.startswith('#'):
                urls.append(url)
    return urls


def write_urls_file(urls: List[str], filepath: Path) -> None:
    """Write URLs to text file (one per line)."""
    with open(filepath, 'w', encoding='utf-8') as f:
        for url in urls:
            f.write(url + '\n')


def normalize_url(url: str) -> str:
    """Normalize URL for consistency."""
    # Remove fragment
    parsed = urlparse(url)
    normalized = parsed._replace(fragment='').geturl()
    
    # Remove trailing slash from path
    if normalized.endswith('/') and normalized.count('/') > 3:
        normalized = normalized[:-1]
    
    return normalized


def is_valid_url(url: str, domain: Optional[str] = None) -> bool:
    """Check if URL is valid and optionally from specific domain."""
    try:
        parsed = urlparse(url)
        
        # Check basic validity
        if not parsed.scheme or not parsed.netloc:
            return False
        
        # Check domain if specified
        if domain and parsed.netloc != domain and not parsed.netloc.endswith(f'.{domain}'):
            return False
        
        return True
    except:
        return False


def clean_text(text: str) -> str:
    """Clean text by removing extra whitespace."""
    if not text:
        return ''
    
    # Replace multiple spaces with single space
    text = ' '.join(text.split())
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    return text


def extract_price(text: str) -> Optional[float]:
    """Extract price from text."""
    if not text:
        return None
    
    # Remove currency symbols and commas
    text = text.replace('$', '').replace(',', '').replace('£', '').replace('€', '')
    
    # Find first number
    match = re.search(r'(\d+\.?\d*)', text)
    if match:
        try:
            return float(match.group(1))
        except:
            pass
    
    return None


def create_hash(data: Any) -> str:
    """Create hash of data."""
    if isinstance(data, dict):
        data = json.dumps(data, sort_keys=True)
    elif not isinstance(data, str):
        data = str(data)
    
    return hashlib.sha256(data.encode()).hexdigest()


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """Split list into chunks."""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]