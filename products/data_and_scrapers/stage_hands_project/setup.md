# Stage Hands Project Setup

This guide walks you through setting up Stage Hands, a browser controlling AI agent built on Playwright.

## Quick Start Installation

1. Run the quick start command:
```bash
npx create-browser-app
```

2. Follow the prompts:
   - Name your project (e.g., "movie-scraper")
   - Accept default configurations (press Enter)
   - Enter your OpenAI API key when prompted
   - Choose where to run:
     - "Run on my computer" for local execution
     - Use browser.base sessions (10 free sessions included)

3. Navigate to your project directory (note: use single quotes as shown):
```bash
cd 'your-project-name'
npm install
```

4. Open the project in Cursor (or your preferred editor):
```bash
cursor .
```

5. Run your script:
```bash
npm start
```

## Key APIs

1. **do API**: Performs actions on the current page
```typescript
await browser.do("Click the login button");
```

2. **goto API**: Navigates to a URL
```typescript
await browser.goto("https://example.com");
```

3. **extract API**: Extracts content using Zod schema
```typescript
const data = await browser.extract({
  title: "string",
  items: ["string"]
});
```
