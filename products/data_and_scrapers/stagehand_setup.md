# Stage Hands Project Setup Guide

This guide provides step-by-step instructions for setting up and using a Stage Hands project for browser automation.

## Installation

### Step 1: Install Stage Hands
Open your terminal and run the quick start command:
```bash
npx create-browser-app
```

### Step 2: Configure Your Project
You'll be prompted to:
1. Name your project (choose any name)
2. Select default configurations (press Enter for defaults)
3. Enter your OpenAI API key (required for GPT-4 functionality)
4. Choose between running locally or using browser sessions
   - For local: select "Run on my computer"
   - Browser sessions: you get 10 free sessions from browser.base

### Step 3: Complete Installation
Navigate to your project directory:
```bash
cd 'your-project-name'
npm install
```
This will install dependencies and download the local Chromium browser.

### Step 4: Open in Editor
```bash
cursor .
```

## Example Scripts

### Example 1: Extract Movie Names from IMDb
```typescript
import { Browser } from "browser";

async function main() {
  const browser = new Browser();
  
  // Navigate to IMDb
  await browser.goto("https://www.imdb.com/calendar/");
  
  // Extract movie names for January
  const movieData = await browser.extract({
    movies: ["string"]
  });
  
  console.log("January Movie Releases:", movieData.movies);
  
  await browser.close();
}

main();
```

### Example 2: Extract GitHub Repository Description
```typescript
import { Browser } from "browser";

async function main() {
  const browser = new Browser();
  
  // Navigate to browser.base repo
  await browser.goto("https://github.com/browser-base/stage-hands");
  
  // Extract repository description
  const repoInfo = await browser.extract({
    description: "string"
  });
  
  console.log("Repository Description:", repoInfo.description);
  
  await browser.close();
}

main();
```

### Example 3: Simple Browser Test (JavaScript)
```javascript
// Set dummy API key before requiring Stagehand
process.env.OPENAI_API_KEY = 'your-api-key';

const stagehand = require('@browserbasehq/stagehand');

// Simple logging function
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Test function
async function testBrowserOpen() {
  log('Attempting to open Chromium browser...');
  const browser = await stagehand.act('open chromium');
  log('Browser opened successfully');
  await stagehand.act('close browser', { browser });
  log('Browser closed');
}

// Run with error handling
testBrowserOpen().catch(err => {
  log(`Error: ${err.message}`);
  process.exit(1);
});
```

## Running Your Script
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
