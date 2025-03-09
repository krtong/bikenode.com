# Stage Hands Demo Project

This project demonstrates how to use Stage Hands, a browser controlling AI agent built on Playwright, to automate web scraping tasks.

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
