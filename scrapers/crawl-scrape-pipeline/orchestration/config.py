"""
Configuration settings for the crawl-scrape pipeline.
"""
import os
from pathlib import Path
from typing import Dict, Any

# Base directories
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
OUTPUT_DIR = BASE_DIR / "output"

# Create directories if they don't exist
for dir_path in [DATA_DIR, LOGS_DIR, OUTPUT_DIR]:
    dir_path.mkdir(exist_ok=True)

# Pipeline step directories
STEPS = {
    "00_env": BASE_DIR / "00_env",
    "01_map": BASE_DIR / "01_map",
    "02_filter": BASE_DIR / "02_filter",
    "03_group": BASE_DIR / "03_group",
    "04_probe": BASE_DIR / "04_probe",
    "05_decide": BASE_DIR / "05_decide",
    "06_plan": BASE_DIR / "06_plan",
    "07_sample": BASE_DIR / "07_sample",
    "08_fetch": BASE_DIR / "08_fetch",
    "09_scrape": BASE_DIR / "09_scrape",
    "10_dedupe": BASE_DIR / "10_dedupe",
    "11_clean": BASE_DIR / "11_clean",
    "12_load": BASE_DIR / "12_load",
    "13_qc": BASE_DIR / "13_qc",
    "14_refresh": BASE_DIR / "14_refresh",
}

# Crawler settings
CRAWLER_CONFIG = {
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "concurrent_requests": 8,
    "download_delay": 1,
    "autothrottle_enabled": True,
    "autothrottle_target_concurrency": 4.0,
    "robotstxt_obey": True,
    "cookies_enabled": False,
}

# Database settings
DATABASE_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "bikenode"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
}

# Data processing settings
PROCESSING_CONFIG = {
    "batch_size": 100,
    "max_retries": 3,
    "timeout": 30,
    "chunk_size": 1000,
}

# Quality control settings
QC_CONFIG = {
    "min_data_freshness_days": 7,
    "required_fields": ["title", "url", "timestamp"],
    "price_stability_threshold": 0.5,
    "min_completeness_ratio": 0.8,
}

# Logging settings
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stdout"
        },
        "file": {
            "class": "logging.FileHandler",
            "formatter": "default",
            "filename": str(LOGS_DIR / "pipeline.log")
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"]
    }
}

def get_step_config(step_name: str) -> Dict[str, Any]:
    """Get configuration for a specific pipeline step."""
    step_configs = {
        "01_map": {
            "output_file": STEPS["01_map"] / "sitemap.txt",
            "max_depth": 3,
            "follow_external": False,
        },
        "02_filter": {
            "input_file": STEPS["01_map"] / "sitemap.txt",
            "output_file": STEPS["02_filter"] / "all_urls.txt",
            "exclude_patterns": ["login", "logout", "admin"],
        },
        "03_group": {
            "input_file": STEPS["02_filter"] / "all_urls.txt",
            "output_dir": STEPS["03_group"] / "by_template",
        },
        "07_sample": {
            "output_file": STEPS["07_sample"] / "output.ndjson",
            "sample_size": 10,
        },
        "08_fetch": {
            "output_dir": STEPS["08_fetch"] / "html",
            "batch_dir": STEPS["08_fetch"],
        },
        "09_scrape": {
            "input_dir": STEPS["08_fetch"] / "html",
            "output_file": STEPS["09_scrape"] / "parsed.ndjson",
        },
        "12_load": {
            "input_file": STEPS["11_clean"] / "cleaned.ndjson",
            "database": DATABASE_CONFIG,
        },
    }
    
    return step_configs.get(step_name, {})