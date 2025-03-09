# Motorcycle Data System

This directory contains the motorcycle database and related utilities for the Discord bot.

## File Structure

- `motorcycles.csv` - Raw motorcycle data in CSV format
- `index.js` - Main interface for accessing motorcycle data
- `motorcycleUtils.js` - Utility functions for advanced operations
- `schema.js` - Schema validation for motorcycle data

## Data Format

The motorcycle data is stored in CSV format with the following columns:

- Year: Production year of the motorcycle
- Make: Manufacturer name
- Model: Model name
- Package: Package/trim level (optional)
- Category: Type of motorcycle
- Engine: Engine displacement information

## Usage Examples

### Basic Data Access

```javascript
const motorcycleData = require('./data/bikenode');

// Get all available years
const years = motorcycleData.getYears();

// Get all makes for a specific year
const makes2010 = motorcycleData.getMakes(2010);

// Get all models for a specific year and make
const hondaModels2010 = motorcycleData.getModels(2010, 'Honda');
```

### Searching

```javascript
const motorcycleData = require('./data/bikenode');

// Search by specific criteria
const results = motorcycleData.searchMotorcycles({
  year: 2010,
  make: 'BMW',
  category: 'Sport'
});

// Find all sport bikes
const sportBikes = motorcycleData.searchMotorcycles({
  category: 'Sport'
});
```

### Using Utilities

```javascript
const motorcycleUtils = require('./data/bikenode/motorcycleUtils');

// Get all categories
const categories = motorcycleUtils.getAllCategories();

// Find motorcycles with similar engine size
const similar = motorcycleUtils.findSimilarEngineSize(600, 50);

// Format motorcycle for Discord message
const formatted = motorcycleUtils.formatMotorcycleForDiscord(motorcycle);
```

## Extending the Dataset

To add new motorcycles to the dataset, append entries to the `motorcycles.csv` file following the established format.
