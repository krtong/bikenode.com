# Bikenode Chrome Extension

This directory contains the Chrome extension that aggregates listings for bikes (motorcycles and bicycles) and bike components from various sources.

## Features

- Monitors new and used bike listings from multiple websites
- Provides price comparisons and availability alerts
- Integrates with the Bikenode.com ecosystem

## Development

### Prerequisites

- Node.js 14+
- Chrome browser

### Setup

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory

### Testing

Run automated tests:
```bash
npm test
```

## Project Structure

- `manifest.json`: Extension configuration
- `background.js`: Background service worker
- `content.js`: Content scripts for page interaction
- `popup.js`: Extension popup UI logic
- `extractors/`: Site-specific data extraction modules
- `util/`: Utility functions

## Deployment

To package the extension for the Chrome Web Store:

```bash
npm run package
```

This will generate a ZIP file ready for submission to the Chrome Web Store.
