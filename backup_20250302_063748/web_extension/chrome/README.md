# Craigslist to JSON Browser Extension

A Chrome extension that extracts structured data from Craigslist posts and converts it to JSON format.

## Features

- Extract title, price, description and other details from Craigslist posts
- Convert all data to structured JSON format
- Copy JSON to clipboard with one click
- Works on any Craigslist post page

## Installation

### Development Mode
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" at the top right
4. Click "Load unpacked" and select the `web_extension/chrome` directory

### From Chrome Web Store
*(Coming soon)*

## Usage

1. Navigate to any Craigslist post
2. Click the extension icon in your browser toolbar
3. Click "Convert to JSON"
4. Use the "Copy to Clipboard" button to copy the JSON data

## Development

### Project Structure
- `/web_extension/chrome/` - Chrome extension files
- `/__tests__/` - Test files

### Running Tests