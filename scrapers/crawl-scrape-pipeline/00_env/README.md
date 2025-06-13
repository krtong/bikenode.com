# Environment Configuration

> **⚠️ READ BEFORE CONFIGURING**
> 
> **Required reading:**
> 1. [SCRAPING_DESIGN_PRINCIPLES.md](../../SCRAPING_DESIGN_PRINCIPLES.md)
> 
> **CONFIGURATION RULES:**
> - **NO PLACEHOLDERS** - No example values like "your-api-key-here"
> - **CHECK FIRST** - Verify .env doesn't already exist at another location
> - **REAL VALUES** - Only put actual, working configuration values
> - **NO DEFAULTS** - Never hardcode fallback values in code

The `.env` file for this project already exists in the root directory of the bikenode.com repository.

Please use the existing `.env` file at:
```
/Users/kevintong/Documents/Code/bikenode.com/.env
```

The scraping pipeline will automatically load environment variables from the root `.env` file.

## Available Environment Variables

The following environment variables can be configured in the root `.env` file:

- `DATABASE_URL` - PostgreSQL connection URL
- `PROXY_HOST`, `PROXY_PORT`, `PROXY_USER`, `PROXY_PASSWORD` - Proxy configuration (optional)
- `API_KEY`, `API_SECRET` - API credentials (optional)
- `USER_AGENT` - Custom user agent string
- `CONCURRENT_REQUESTS` - Number of concurrent requests
- `DOWNLOAD_DELAY` - Delay between requests in seconds
- `SCREAMING_FROG_PATH` - Path to Screaming Frog SEO Spider (optional)