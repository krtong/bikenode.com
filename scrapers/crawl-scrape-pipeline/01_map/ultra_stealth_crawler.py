#!/usr/bin/env python3
"""
Ultra-Advanced Stealth Crawler - Bypasses the toughest anti-bot measures
Uses curl-cffi, undetected-chromedriver, Playwright with stealth patches,
and advanced fingerprinting techniques.
"""

import sys
import csv
import json
import time
import random
import asyncio
from pathlib import Path
from typing import Dict, Set, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
from collections import deque
from datetime import datetime
import hashlib
import base64

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))
from orchestration.utils_minimal import normalize_url, is_valid_url, logger

# Advanced HTTP libraries
try:
    from curl_cffi import requests as curl_requests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False
    logger.warning("curl-cffi not installed - install with: pip install curl-cffi")

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException
    HAS_UNDETECTED = True
except ImportError:
    HAS_UNDETECTED = False
    logger.warning("undetected-chromedriver not installed - install with: pip install undetected-chromedriver")

try:
    from playwright.async_api import async_playwright
    from playwright_stealth import stealth_async
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    logger.warning("playwright not installed - install with: pip install playwright playwright-stealth && playwright install")

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False
    logger.warning("cloudscraper not installed - install with: pip install cloudscraper")

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    logger.warning("httpx not installed - install with: pip install httpx[http2]")

# Standard imports
import requests
from bs4 import BeautifulSoup
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class UltraStealthCrawler:
    """The most advanced crawler that bypasses any anti-bot system."""
    
    def __init__(self, domain: str):
        self.domain = domain
        self.visited_urls: Set[str] = set()
        self.url_metadata: Dict[str, Dict] = {}
        self.to_visit = deque()
        self.output_file = Path(__file__).parent / 'dump.csv'
        self.session_cookies = {}
        
        # Statistics
        self.stats = {
            'total_attempts': 0,
            'success_200': 0,
            'failed_attempts': 0,
            'methods_used': {},
            'status_codes': {}
        }
        
        # Browser profiles for curl-cffi
        self.browser_profiles = [
            "chrome110", "chrome107", "chrome104", "chrome101", "chrome100",
            "chrome99", "firefox110", "firefox102", "safari15_5", "safari15_3",
            "edge101", "edge99"
        ]
        
        # Ultra-realistic user agents
        self.user_agents = [
            # Latest Chrome on Windows 11
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            # Chrome on macOS Sonoma
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            # Firefox on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
            # Safari on macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
            # Edge
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
        ]
        
        # Advanced headers with fingerprinting protection
        self.advanced_headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            # Advanced privacy headers
            'Sec-GPC': '1',  # Global Privacy Control
            'Permissions-Policy': 'interest-cohort=()',  # Reject FLoC
        }
    
    def get_advanced_headers(self, referer: Optional[str] = None) -> Dict[str, str]:
        """Generate ultra-realistic browser headers with perfect fingerprinting."""
        ua = random.choice(self.user_agents)
        headers = self.advanced_headers.copy()
        headers['User-Agent'] = ua
        
        # Add referer for navigation realism
        if referer:
            headers['Referer'] = referer
            headers['Sec-Fetch-Site'] = 'same-origin'
        
        # Chrome-specific headers
        if 'Chrome' in ua:
            version = ua.split('Chrome/')[1].split(' ')[0].split('.')[0]
            headers['sec-ch-ua'] = f'"Not_A Brand";v="8", "Chromium";v="{version}", "Google Chrome";v="{version}"'
            headers['sec-ch-ua-mobile'] = '?0'
            headers['sec-ch-ua-platform'] = '"Windows"' if 'Windows' in ua else '"macOS"'
            
            # Random Chrome client hints
            if random.random() > 0.5:
                headers['sec-ch-ua-full-version-list'] = f'"Not_A Brand";v="8.0.0.0", "Chromium";v="{version}.0.0.0", "Google Chrome";v="{version}.0.0.0"'
                headers['sec-ch-ua-arch'] = '"x86"'
                headers['sec-ch-ua-bitness'] = '"64"'
                headers['sec-ch-ua-model'] = '""'
        
        # Randomize accept-language
        lang_variants = [
            'en-US,en;q=0.9',
            'en-US,en;q=0.9,es;q=0.8',
            'en-GB,en;q=0.9',
            'en-US,en;q=0.9,fr;q=0.8',
            'en-US,en;q=0.9,de;q=0.8,es;q=0.7',
        ]
        headers['Accept-Language'] = random.choice(lang_variants)
        
        return headers
    
    async def method_1_curl_cffi(self, url: str) -> Optional[Dict]:
        """Method 1: curl-cffi with browser impersonation (beats Cloudflare)."""
        if not HAS_CURL_CFFI:
            return None
            
        try:
            # Rotate browser profiles
            impersonate = random.choice(self.browser_profiles)
            
            # Create session with cookies
            session = curl_requests.Session()
            if self.session_cookies:
                session.cookies.update(self.session_cookies)
            
            # Advanced request options
            response = session.get(
                url,
                impersonate=impersonate,
                headers=self.get_advanced_headers(referer=f'https://{self.domain}/'),
                timeout=30,
                allow_redirects=True,
                verify=False,  # Skip SSL verification for difficult sites
                proxies=None,  # Add proxy support if needed
            )
            
            # Store cookies for session persistence
            self.session_cookies.update(dict(response.cookies))
            
            return {
                'url': url,
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', '').split(';')[0].strip(),
                'size': len(response.content),
                'last_modified': response.headers.get('last-modified', ''),
                'method': f'curl_cffi_{impersonate}'
            }
        except Exception as e:
            logger.debug(f"curl-cffi failed for {url}: {e}")
            return None
    
    async def method_2_playwright_ultra_stealth(self, url: str) -> Optional[Dict]:
        """Method 2: Playwright with ultra stealth patches."""
        if not HAS_PLAYWRIGHT:
            return None
            
        try:
            async with async_playwright() as p:
                # Launch with advanced anti-detection
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--disable-site-isolation-trials',
                        '--disable-web-security',
                        '--disable-features=CrossSiteDocumentBlockingAlways,CrossSiteDocumentBlockingIfIsolating',
                        '--disable-features=ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls,DestroyProfileOnBrowserClose',
                        '--disable-features=AudioServiceOutOfProcess,AudioServiceSandbox',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu',
                        '--window-size=1920,1080',
                        '--start-maximized',
                    ],
                )
                
                # Create context with perfect fingerprinting
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    screen={'width': 1920, 'height': 1080},
                    user_agent=random.choice(self.user_agents),
                    locale='en-US',
                    timezone_id='America/New_York',
                    permissions=['geolocation', 'notifications'],
                    geolocation={'latitude': 40.7128, 'longitude': -74.0060},
                    color_scheme='light',
                    device_scale_factor=1,
                    has_touch=False,
                    java_script_enabled=True,
                    bypass_csp=True,
                    ignore_https_errors=True,
                )
                
                # Add advanced stealth scripts
                await context.add_init_script("""
                    // Advanced webdriver detection bypass
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    
                    // Chrome object with all properties
                    window.chrome = {
                        runtime: {
                            connect: () => {},
                            sendMessage: () => {},
                            onMessage: { addListener: () => {} }
                        },
                        loadTimes: function() {
                            return {
                                commitLoadTime: Date.now() / 1000 - Math.random() * 10,
                                connectionInfo: 'http/1.1',
                                finishDocumentLoadTime: Date.now() / 1000,
                                finishLoadTime: Date.now() / 1000,
                                firstPaintAfterLoadTime: 0,
                                firstPaintTime: Date.now() / 1000 - Math.random() * 0.5,
                                navigationType: 'Other',
                                npnNegotiatedProtocol: 'http/1.1',
                                requestTime: Date.now() / 1000 - Math.random() * 20,
                                startLoadTime: Date.now() / 1000 - Math.random() * 15,
                                wasAlternateProtocolAvailable: false,
                                wasFetchedViaSpdy: false,
                                wasNpnNegotiated: true
                            };
                        },
                        csi: function() { return { onloadT: Date.now(), pageT: Date.now() - 500, startE: Date.now() - 1000, tran: 15 }; },
                        app: {
                            isInstalled: false,
                            getDetails: () => null,
                            getIsInstalled: () => false,
                            runningState: () => 'running'
                        }
                    };
                    
                    // Perfect plugins array
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => {
                            return [
                                {
                                    0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
                                    description: "Portable Document Format",
                                    filename: "internal-pdf-viewer",
                                    length: 1,
                                    name: "Chrome PDF Plugin"
                                },
                                {
                                    0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
                                    description: "",
                                    filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                                    length: 1,
                                    name: "Chrome PDF Viewer"
                                },
                                {
                                    0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin},
                                    1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin},
                                    description: "",
                                    filename: "internal-nacl-plugin",
                                    length: 2,
                                    name: "Native Client"
                                }
                            ];
                        }
                    });
                    
                    // Canvas fingerprinting protection
                    const originalGetContext = HTMLCanvasElement.prototype.getContext;
                    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
                        if (type === '2d') {
                            const context = originalGetContext.call(this, type, attributes);
                            const originalGetImageData = context.getImageData;
                            context.getImageData = function(x, y, width, height) {
                                const imageData = originalGetImageData.call(this, x, y, width, height);
                                for (let i = 0; i < imageData.data.length; i += 4) {
                                    imageData.data[i] = imageData.data[i] ^ (Math.random() * 0.1);
                                    imageData.data[i + 1] = imageData.data[i + 1] ^ (Math.random() * 0.1);
                                    imageData.data[i + 2] = imageData.data[i + 2] ^ (Math.random() * 0.1);
                                }
                                return imageData;
                            };
                            return context;
                        }
                        return originalGetContext.call(this, type, attributes);
                    };
                    
                    // WebGL fingerprinting protection
                    const getParameter = WebGLRenderingContext.prototype.getParameter;
                    WebGLRenderingContext.prototype.getParameter = function(parameter) {
                        if (parameter === 37445) {
                            return 'Intel Inc.';
                        }
                        if (parameter === 37446) {
                            return 'Intel Iris OpenGL Engine';
                        }
                        return getParameter.call(this, parameter);
                    };
                    
                    // Battery API protection
                    if (navigator.getBattery) {
                        navigator.getBattery = () => Promise.resolve({
                            charging: true,
                            chargingTime: 0,
                            dischargingTime: Infinity,
                            level: 1
                        });
                    }
                    
                    // Remove automation indicators
                    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
                    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
                    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
                    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;
                    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Proxy;
                    
                    // Notification permission
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                            Promise.resolve({ state: 'prompt' }) :
                            originalQuery(parameters)
                    );
                    
                    // Languages perfect match
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en']
                    });
                    
                    // Hardware concurrency
                    Object.defineProperty(navigator, 'hardwareConcurrency', {
                        get: () => 8
                    });
                    
                    // Device memory
                    Object.defineProperty(navigator, 'deviceMemory', {
                        get: () => 8
                    });
                    
                    // Platform
                    Object.defineProperty(navigator, 'platform', {
                        get: () => 'Win32'
                    });
                """)
                
                # Apply stealth patches if available
                try:
                    page = await context.new_page()
                    if 'stealth_async' in globals():
                        await stealth_async(page)
                except:
                    page = await context.new_page()
                
                # Human-like behavior before navigation
                await page.mouse.move(random.randint(100, 800), random.randint(100, 600))
                await asyncio.sleep(random.uniform(0.1, 0.3))
                
                # Set extra headers
                await page.set_extra_http_headers(self.get_advanced_headers())
                
                # Navigate with realistic options
                response = await page.goto(
                    url,
                    wait_until='networkidle',
                    timeout=45000,
                    referer=f'https://{self.domain}/'
                )
                
                # Human-like interactions
                await asyncio.sleep(random.uniform(1, 2))
                
                # Random scroll
                await page.evaluate("""
                    async () => {
                        const totalHeight = document.body.scrollHeight;
                        const viewportHeight = window.innerHeight;
                        const scrollDistance = Math.random() * (totalHeight - viewportHeight);
                        
                        window.scrollTo({
                            top: scrollDistance,
                            behavior: 'smooth'
                        });
                        
                        await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
                    }
                """)
                
                # Get content
                content = await page.content()
                
                # Extract cookies for session persistence
                cookies = await context.cookies()
                for cookie in cookies:
                    self.session_cookies[cookie['name']] = cookie['value']
                
                await browser.close()
                
                return {
                    'url': url,
                    'status_code': response.status if response else 0,
                    'content_type': 'text/html',
                    'size': len(content),
                    'last_modified': '',
                    'method': 'playwright_ultra_stealth'
                }
        except Exception as e:
            logger.debug(f"Playwright ultra stealth failed for {url}: {e}")
            return None
    
    async def method_3_undetected_chrome_advanced(self, url: str) -> Optional[Dict]:
        """Method 3: Undetected ChromeDriver with advanced configurations."""
        if not HAS_UNDETECTED:
            return None
            
        try:
            # Advanced Chrome options
            options = uc.ChromeOptions()
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_argument('--disable-features=UserAgentClientHint')
            options.add_argument(f'--user-agent={random.choice(self.user_agents)}')
            
            # Window size for realistic rendering
            options.add_argument('--window-size=1920,1080')
            options.add_argument('--start-maximized')
            
            # Performance and stealth options
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            options.add_experimental_option('prefs', {
                'credentials_enable_service': False,
                'profile.password_manager_enabled': False,
                'profile.default_content_setting_values.notifications': 2,
                'profile.default_content_settings.popups': 0,
                'profile.managed_default_content_settings.images': 1,
            })
            
            # Create driver with version management
            driver = uc.Chrome(options=options, version_main=None)  # Auto-detect version
            
            # Advanced stealth JavaScript
            driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                'source': '''
                    // Remove webdriver property
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    
                    // Mock permissions
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                            Promise.resolve({ state: Notification.permission }) :
                            originalQuery(parameters)
                    );
                    
                    // Mock plugins
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5]
                    });
                    
                    // Mock languages
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en']
                    });
                '''
            })
            
            # Set cookies if available
            if self.session_cookies:
                driver.get(f'https://{self.domain}/')
                for name, value in self.session_cookies.items():
                    driver.add_cookie({'name': name, 'value': value})
            
            # Navigate with retries
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    driver.get(url)
                    
                    # Human-like wait
                    time.sleep(random.uniform(2, 4))
                    
                    # Random mouse movement
                    action = uc.ActionChains(driver)
                    action.move_by_offset(random.randint(100, 500), random.randint(100, 500))
                    action.perform()
                    
                    # Random scroll
                    scroll_height = driver.execute_script("return document.body.scrollHeight")
                    scroll_position = random.randint(0, scroll_height // 2)
                    driver.execute_script(f"window.scrollTo(0, {scroll_position});")
                    time.sleep(random.uniform(0.5, 1.5))
                    
                    break
                except TimeoutException:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(2 ** attempt)
            
            # Get page source and metadata
            content = driver.page_source
            current_url = driver.current_url
            
            # Extract cookies
            for cookie in driver.get_cookies():
                self.session_cookies[cookie['name']] = cookie['value']
            
            driver.quit()
            
            return {
                'url': current_url,
                'status_code': 200,  # If we got here, it's successful
                'content_type': 'text/html',
                'size': len(content),
                'last_modified': '',
                'method': 'undetected_chrome_advanced'
            }
        except Exception as e:
            logger.debug(f"Undetected Chrome advanced failed for {url}: {e}")
            if 'driver' in locals():
                try:
                    driver.quit()
                except:
                    pass
            return None
    
    async def method_4_cloudscraper_advanced(self, url: str) -> Optional[Dict]:
        """Method 4: CloudScraper with advanced configuration."""
        if not HAS_CLOUDSCRAPER:
            return None
            
        try:
            # Create scraper with advanced options
            scraper = cloudscraper.create_scraper(
                browser={
                    'browser': 'chrome',
                    'platform': 'windows',
                    'desktop': True,
                    'mobile': False,
                },
                delay=random.uniform(1, 3),
                interpreter='native',
                captcha={'provider': 'return_response'},
                debug=False,
            )
            
            # Set advanced headers
            scraper.headers.update(self.get_advanced_headers(referer=f'https://{self.domain}/'))
            
            # Add cookies
            if self.session_cookies:
                for name, value in self.session_cookies.items():
                    scraper.cookies.set(name, value)
            
            # Make request with retries
            response = scraper.get(url, timeout=30, allow_redirects=True)
            
            # Store new cookies
            self.session_cookies.update(dict(response.cookies))
            
            return {
                'url': url,
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', '').split(';')[0].strip(),
                'size': len(response.content),
                'last_modified': response.headers.get('last-modified', ''),
                'method': 'cloudscraper_advanced'
            }
        except Exception as e:
            logger.debug(f"CloudScraper advanced failed for {url}: {e}")
            return None
    
    async def method_5_httpx_http2_advanced(self, url: str) -> Optional[Dict]:
        """Method 5: HTTPX with HTTP/2 and advanced TLS."""
        if not HAS_HTTPX:
            return None
            
        try:
            # Create client with HTTP/2 and custom TLS
            async with httpx.AsyncClient(
                http2=True,
                follow_redirects=True,
                verify=False,
                timeout=30.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=100),
                headers=self.get_advanced_headers(referer=f'https://{self.domain}/'),
            ) as client:
                
                # Add cookies
                if self.session_cookies:
                    client.cookies.update(self.session_cookies)
                
                # Make request
                response = await client.get(url)
                
                # Store cookies
                for cookie in response.cookies:
                    self.session_cookies[str(cookie.name)] = str(cookie.value)
                
                return {
                    'url': str(response.url),
                    'status_code': response.status_code,
                    'content_type': response.headers.get('content-type', '').split(';')[0].strip(),
                    'size': len(response.content),
                    'last_modified': response.headers.get('last-modified', ''),
                    'method': 'httpx_http2_advanced'
                }
        except Exception as e:
            logger.debug(f"HTTPX HTTP/2 advanced failed for {url}: {e}")
            return None
    
    async def fetch_url_ultra_stealth(self, url: str) -> Dict:
        """Try all ultra-stealth methods until one succeeds."""
        self.stats['total_attempts'] += 1
        
        # Ordered by effectiveness against anti-bot systems
        methods = [
            ('curl_cffi', self.method_1_curl_cffi),
            ('playwright_ultra_stealth', self.method_2_playwright_ultra_stealth),
            ('cloudscraper_advanced', self.method_4_cloudscraper_advanced),
            ('httpx_http2_advanced', self.method_5_httpx_http2_advanced),
        ]
        
        # Try async methods first
        for method_name, method_func in methods:
            logger.info(f"Trying {method_name} for {url}")
            
            result = await method_func(url)
            
            if result and result['status_code'] == 200:
                self.stats['success_200'] += 1
                self.stats['methods_used'][method_name] = self.stats['methods_used'].get(method_name, 0) + 1
                logger.info(f"✓ SUCCESS: {method_name} got 200 for {url}")
                return result
            elif result:
                status = result['status_code']
                self.stats['status_codes'][status] = self.stats['status_codes'].get(status, 0) + 1
                logger.warning(f"✗ {method_name} got {status} for {url}")
        
        # Last resort: undetected chrome (synchronous)
        if HAS_UNDETECTED:
            logger.info(f"Trying undetected_chrome_advanced for {url}")
            result = await self.method_3_undetected_chrome_advanced(url)
            if result and result['status_code'] == 200:
                self.stats['success_200'] += 1
                self.stats['methods_used']['undetected_chrome_advanced'] = self.stats['methods_used'].get('undetected_chrome_advanced', 0) + 1
                logger.info(f"✓ SUCCESS: undetected_chrome_advanced got 200 for {url}")
                return result
        
        # All methods failed
        self.stats['failed_attempts'] += 1
        logger.error(f"✗✗ ALL METHODS FAILED for {url}")
        return {
            'url': url,
            'status_code': 0,
            'content_type': 'failed',
            'size': 0,
            'last_modified': '',
            'method': 'all_failed'
        }
    
    async def crawl(self, max_pages: int = 10):
        """Main ultra-stealth crawling loop."""
        logger.info(f"Starting ULTRA STEALTH crawl of {self.domain}")
        logger.info(f"Available methods:")
        logger.info(f"  curl-cffi: {'✓' if HAS_CURL_CFFI else '✗ (pip install curl-cffi)'}")
        logger.info(f"  playwright: {'✓' if HAS_PLAYWRIGHT else '✗ (pip install playwright playwright-stealth && playwright install)'}")
        logger.info(f"  undetected-chromedriver: {'✓' if HAS_UNDETECTED else '✗ (pip install undetected-chromedriver)'}")
        logger.info(f"  cloudscraper: {'✓' if HAS_CLOUDSCRAPER else '✗ (pip install cloudscraper)'}")
        logger.info(f"  httpx: {'✓' if HAS_HTTPX else '✗ (pip install httpx[http2])'}")
        
        # Initialize with domain URLs
        test_urls = [
            f'https://{self.domain}/',
            f'https://www.{self.domain}/',
        ]
        
        for url in test_urls:
            self.to_visit.append(url)
        
        pages_crawled = 0
        start_time = time.time()
        
        while self.to_visit and pages_crawled < max_pages:
            url = self.to_visit.popleft()
            
            if url in self.visited_urls:
                continue
            
            self.visited_urls.add(url)
            
            # Fetch with ultra stealth methods
            metadata = await self.fetch_url_ultra_stealth(url)
            self.url_metadata[url] = metadata
            pages_crawled += 1
            
            # Extract links if successful (only for simple methods)
            if metadata['status_code'] == 200 and pages_crawled < max_pages:
                # For methods that return content, extract links
                if metadata.get('method') in ['curl_cffi', 'cloudscraper_advanced', 'httpx_http2_advanced']:
                    try:
                        # Use appropriate session for content fetch
                        if 'curl_cffi' in metadata.get('method', ''):
                            response = curl_requests.get(url, impersonate="chrome110")
                            content = response.content
                        else:
                            response = requests.get(url, headers=self.get_advanced_headers())
                            content = response.content
                        
                        soup = BeautifulSoup(content, 'html.parser')
                        
                        for link in soup.find_all('a', href=True):
                            absolute_url = normalize_url(urljoin(url, link['href']))
                            parsed = urlparse(absolute_url)
                            
                            if self.is_same_domain(parsed.netloc) and absolute_url not in self.visited_urls:
                                self.to_visit.append(absolute_url)
                                
                    except Exception as e:
                        logger.warning(f"Error extracting links from {url}: {e}")
            
            # Ultra-respectful delay with randomization
            delay = random.uniform(1.5, 3.5)
            logger.info(f"Waiting {delay:.1f}s before next request...")
            await asyncio.sleep(delay)
        
        # Save results
        self.save_results()
        
        # Print comprehensive statistics
        elapsed = time.time() - start_time
        success_rate = (self.stats['success_200']/self.stats['total_attempts']*100) if self.stats['total_attempts'] > 0 else 0
        
        logger.info(f"\n{'='*60}")
        logger.info(f"ULTRA STEALTH CRAWL COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"Domain: {self.domain}")
        logger.info(f"Total attempts: {self.stats['total_attempts']}")
        logger.info(f"Successful 200s: {self.stats['success_200']}")
        logger.info(f"Failed attempts: {self.stats['failed_attempts']}")
        logger.info(f"Success rate: {success_rate:.1f}%")
        logger.info(f"Time elapsed: {elapsed:.1f} seconds")
        logger.info(f"Pages/second: {pages_crawled/elapsed:.2f}")
        
        logger.info(f"\nMethods used successfully:")
        for method, count in sorted(self.stats['methods_used'].items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {method}: {count} successes")
        
        if self.stats['status_codes']:
            logger.info(f"\nStatus codes encountered:")
            for status, count in sorted(self.stats['status_codes'].items()):
                logger.info(f"  {status}: {count} times")
        
        logger.info(f"\nResults saved to: {self.output_file}")
        logger.info(f"{'='*60}")
    
    def is_same_domain(self, netloc: str) -> bool:
        """Check if URL belongs to same domain."""
        return (netloc == self.domain or 
                netloc == f'www.{self.domain}' or 
                netloc.endswith(f'.{self.domain}'))
    
    def save_results(self):
        """Save crawl results to CSV."""
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['url', 'status_code', 'content_type', 'size', 'last_modified', 'method']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for url in sorted(self.url_metadata.keys()):
                writer.writerow(self.url_metadata[url])
        
        logger.info(f"Saved {len(self.url_metadata)} URLs to {self.output_file}")


async def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python ultra_stealth_crawler.py <domain> [max_pages]")
        print("\nExample: python ultra_stealth_crawler.py cloudflare.com 5")
        print("\nThis crawler uses the most advanced anti-bot bypass techniques available.")
        sys.exit(1)
    
    domain = sys.argv[1].replace('https://', '').replace('http://', '').rstrip('/')
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    print(f"\n🛡️  ULTRA STEALTH CRAWLER 🛡️")
    print(f"Target: {domain}")
    print(f"Max pages: {max_pages}")
    print(f"\nThis crawler will bypass even the toughest anti-bot systems!")
    print(f"{'='*60}\n")
    
    crawler = UltraStealthCrawler(domain)
    await crawler.crawl(max_pages)


if __name__ == "__main__":
    asyncio.run(main())