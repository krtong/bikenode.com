#!/usr/bin/env python3
"""
Configuration loader for the crawl-scrape pipeline.
Loads environment variables and provides configuration access.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv


class Config:
    """Configuration management for the scraping pipeline."""
    
    def __init__(self, env_path: Optional[Path] = None):
        """Initialize configuration from environment variables."""
        if env_path is None:
            # First try root .env file
            root_env = Path(__file__).parent.parent.parent.parent / '.env'
            if root_env.exists():
                env_path = root_env
            else:
                # Fallback to 00_env/.env
                env_path = Path(__file__).parent.parent / '00_env' / '.env'
        
        # Load .env file if it exists
        if env_path.exists():
            load_dotenv(env_path)
        
        # Database configuration
        self.database_url = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/bikenode')
        
        # Proxy configuration
        self.proxy_host = os.getenv('PROXY_HOST', '')
        self.proxy_port = os.getenv('PROXY_PORT', '')
        self.proxy_user = os.getenv('PROXY_USER', '')
        self.proxy_password = os.getenv('PROXY_PASSWORD', '')
        
        # API configuration
        self.api_key = os.getenv('API_KEY', '')
        self.api_secret = os.getenv('API_SECRET', '')
        
        # Scraping configuration
        self.user_agent = os.getenv('USER_AGENT', 'Mozilla/5.0 (compatible; BikenodeBot/1.0)')
        self.concurrent_requests = int(os.getenv('CONCURRENT_REQUESTS', '16'))
        self.download_delay = float(os.getenv('DOWNLOAD_DELAY', '0.5'))
        
        # Screaming Frog configuration
        self.screaming_frog_path = os.getenv(
            'SCREAMING_FROG_PATH',
            '/Applications/Screaming Frog SEO Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher.jar'
        )
        
        # Pipeline directories
        self.base_dir = Path(__file__).parent.parent
        self.dirs = {
            'env': self.base_dir / '00_env',
            'map': self.base_dir / '01_map',
            'filter': self.base_dir / '02_filter',
            'group': self.base_dir / '03_group',
            'probe': self.base_dir / '04_probe',
            'decide': self.base_dir / '05_decide',
            'plan': self.base_dir / '06_plan',
            'sample': self.base_dir / '07_sample',
            'fetch': self.base_dir / '08_fetch',
            'scrape': self.base_dir / '09_scrape',
            'dedupe': self.base_dir / '10_dedupe',
            'clean': self.base_dir / '11_clean',
            'load': self.base_dir / '12_load',
            'qc': self.base_dir / '13_qc',
            'refresh': self.base_dir / '14_refresh',
        }
    
    @property
    def proxy_url(self) -> Optional[str]:
        """Get formatted proxy URL if proxy is configured."""
        if not self.proxy_host:
            return None
        
        auth = ''
        if self.proxy_user:
            auth = f"{self.proxy_user}:{self.proxy_password}@"
        
        port = f":{self.proxy_port}" if self.proxy_port else ""
        return f"http://{auth}{self.proxy_host}{port}"
    
    def get_scrapy_settings(self) -> Dict[str, Any]:
        """Get Scrapy-specific settings."""
        settings = {
            'USER_AGENT': self.user_agent,
            'CONCURRENT_REQUESTS': self.concurrent_requests,
            'DOWNLOAD_DELAY': self.download_delay,
            'ROBOTSTXT_OBEY': True,
            'COOKIES_ENABLED': True,
            'TELNETCONSOLE_ENABLED': False,
            'LOG_LEVEL': 'INFO',
            'RETRY_TIMES': 3,
            'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
            'DOWNLOAD_TIMEOUT': 30,
        }
        
        if self.proxy_url:
            settings['DOWNLOADER_MIDDLEWARES'] = {
                'scrapy.downloadermiddlewares.httpproxy.HttpProxyMiddleware': 110,
            }
            settings['HTTP_PROXY'] = self.proxy_url
            settings['HTTPS_PROXY'] = self.proxy_url
        
        return settings
    
    def get_playwright_context(self) -> Dict[str, Any]:
        """Get Playwright browser context options."""
        context = {
            'user_agent': self.user_agent,
            'viewport': {'width': 1920, 'height': 1080},
            'ignore_https_errors': True,
        }
        
        if self.proxy_url:
            context['proxy'] = {'server': self.proxy_url}
        
        return context


# Global config instance
config = Config()