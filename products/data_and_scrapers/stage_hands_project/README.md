# Stage Hands Demo Project

This project demonstrates how to use Stage Hands, a browser controlling AI agent built on Playwright, to automate web scraping tasks.

## Available Scrapers

1. **IMDb Movie Scraper** (`imdb_movie_scraper.ts`) - Extracts movie releases from IMDb's calendar page
2. **GitHub Repo Scraper** (`github_repo_scraper.ts`) - Extracts repository information from GitHub
3. **99Spokes Bike Scraper** (`99spokes_scraper.ts`) - Extracts comprehensive bicycle data from 99spokes.com
4. **99Spokes Direct Scraper** (`99spokes_direct_scraper.ts`) - Alternative approach to scraping 99spokes.com

## 99Spokes Bike Data Pipeline

We've implemented a complete data pipeline for scraping bicycle data from 99spokes.com:

1. **Data Collection** - Two different scrapers extract data from the website
2. **Data Combination** - Results from both scrapers are combined for maximum coverage
3. **Data Processing** - Raw data is cleaned, normalized, and analyzed
4. **Data Export** - Final data is available in JSON and CSV formats

For detailed information about the 99Spokes scrapers, see [99SPOKES_README.md](./99SPOKES_README.md).

## Running the Pipeline

To run the complete 99Spokes data pipeline:

```bash
npm run pipeline
```

This will execute all scrapers, combine their results, and process the data.

## Available Scripts

### IMDb Movie Scraper
Extracts names of movies releasing in January from IMDb:

```bash
npm start
```

### GitHub Repository Scraper
Extracts repository description from the Stage Hands GitHub repository:

```bash
npm run start:github
```

## Key Features of Stage Hands

- **AI-Powered**: Uses GPT-4 via API to understand and interact with web pages
- **Self-Healing**: Generates durable, repeatable automation scripts
- **Simple APIs**: Easy-to-use interfaces for browser control
  - `do` - Performs actions on the page
  - `goto` - Navigates to URLs
  - `extract` - Extracts structured data

## Setup Instructions

See the `setup.md` file for detailed setup instructions.
