"""
Minimal utility functions for the crawl-scrape pipeline.
"""
import json
import logging
import logging.config
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Generator
from urllib.parse import urlparse, urljoin
import re

from .config import LOGGING_CONFIG

# Configure logging
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)


def read_ndjson(file_path: Path) -> Generator[Dict[str, Any], None, None]:
    """Read NDJSON file and yield each line as a dictionary."""
    if not file_path.exists():
        logger.warning(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing line {line_num} in {file_path}: {e}")


def write_ndjson(data: List[Dict[str, Any]], file_path: Path) -> None:
    """Write list of dictionaries to NDJSON file."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    logger.info(f"Wrote {len(data)} items to {file_path}")


def append_ndjson(item: Dict[str, Any], file_path: Path) -> None:
    """Append a single item to NDJSON file."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, 'a', encoding='utf-8') as f:
        f.write(json.dumps(item, ensure_ascii=False) + '\n')


def read_lines(file_path: Path) -> List[str]:
    """Read lines from a text file."""
    if not file_path.exists():
        logger.warning(f"File not found: {file_path}")
        return []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip()]


def write_lines(lines: List[str], file_path: Path) -> None:
    """Write lines to a text file."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        for line in lines:
            f.write(line + '\n')
    
    logger.info(f"Wrote {len(lines)} lines to {file_path}")


def normalize_url(url: str) -> str:
    """Normalize URL for consistent comparison."""
    # Remove trailing slash
    url = url.rstrip('/')
    
    # Remove fragment
    parsed = urlparse(url)
    url = parsed._replace(fragment='').geturl()
    
    # Sort query parameters
    if parsed.query:
        params = sorted(parsed.query.split('&'))
        url = parsed._replace(query='&'.join(params)).geturl()
    
    return url.lower()


def extract_domain(url: str) -> str:
    """Extract domain from URL."""
    parsed = urlparse(url)
    return parsed.netloc.lower()


def is_valid_url(url: str) -> bool:
    """Check if URL is valid."""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False


def get_url_pattern(url: str) -> str:
    """Extract URL pattern for grouping similar URLs."""
    parsed = urlparse(url)
    path = parsed.path
    
    # Replace numeric IDs with placeholder
    path = re.sub(r'/\d+', '/{id}', path)
    
    # Replace UUIDs with placeholder
    path = re.sub(r'/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', '/{uuid}', path)
    
    # Replace slugs with placeholder (keep first part)
    path = re.sub(r'/([a-z0-9]+)(-[a-z0-9-]+)+', r'/\1-{slug}', path)
    
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def retry_with_backoff(func, max_retries: int = 3, initial_delay: float = 1.0):
    """Retry function with exponential backoff."""
    def wrapper(*args, **kwargs):
        delay = initial_delay
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < max_retries - 1:
                    logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                    time.sleep(delay)
                    delay *= 2
                else:
                    logger.error(f"All {max_retries} attempts failed.")
        
        raise last_exception
    
    return wrapper


def chunk_list(lst: List[Any], chunk_size: int) -> Generator[List[Any], None, None]:
    """Split list into chunks of specified size."""
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]


def safe_get(data: Dict[str, Any], path: str, default: Any = None) -> Any:
    """Safely get nested value from dictionary using dot notation."""
    keys = path.split('.')
    value = data
    
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return default
    
    return value


def ensure_list(value: Any) -> List[Any]:
    """Ensure value is a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def clean_text(text: str) -> str:
    """Clean text by removing extra whitespace and special characters."""
    if not text:
        return ""
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    # Remove control characters
    text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
    
    return text.strip()


def format_timestamp(timestamp: Optional[float] = None) -> str:
    """Format timestamp as ISO 8601 string."""
    if timestamp is None:
        timestamp = time.time()
    
    from datetime import datetime
    return datetime.fromtimestamp(timestamp).isoformat()


def parse_timestamp(timestamp_str: str) -> float:
    """Parse ISO 8601 timestamp string to Unix timestamp."""
    from datetime import datetime
    dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    return dt.timestamp()


def calculate_checksum(data: str) -> str:
    """Calculate MD5 checksum of string."""
    import hashlib
    return hashlib.md5(data.encode('utf-8')).hexdigest()


def format_size(size_bytes: int) -> str:
    """Format bytes as human-readable string."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"