# Bicycle Brands Workflow Guide

## QUICK START - Just tell me "continue bicycle brands" and I will:

1. Check what's missing (`node find_missing_bicycle_brands.js`)
2. Look for any prepared batch files (`next_batch_brands.js`, etc.)
3. If a batch exists, add it to the main file
4. If no batch exists, research the next 15-20 missing brands
5. Create a new batch file and add it

**YOU DON'T NEED TO EXPLAIN ANYTHING - I WILL FOLLOW THIS WORKFLOW AUTOMATICALLY**

## Overview

The goal is to research and add all missing bicycle brands from `maker_ids.js` to `bicycle_brands.js` with comprehensive information for each brand.

## File Structure

- **Main Database**: `/scrapers/bicycle_brands.js` - The main brands database
- **Master List**: `/scrapers/maker_ids.js` - Contains all brand IDs that should exist
- **Template**: `/brand_research_template.js` - The structure for each brand entry
- **Missing Brands Checker**: `/find_missing_bicycle_brands.js` - Script to find missing brands
- **Checklist**: `/missing_bicycle_brands_checklist.md` - Auto-generated list of missing brands

## Workflow Steps

### 1. Check Current Status
```bash
node find_missing_bicycle_brands.js
```
This will:
- Show total brands in maker_ids.js
- Show total brands in bicycle_brands.js  
- List all missing brands
- Update the checklist file

### 2. Select Next Batch
- Review the missing brands list
- Select approximately 15-20 brands for the next batch
- Consider grouping by:
  - Alphabetical order (easiest)
  - Brand importance/size
  - Geographic region
  - Brand type (e.g., e-bikes, mountain bikes, etc.)

### 3. Research Each Brand
For each brand in your batch, research the following information:

#### Required Information:
- `brand_id` - From maker_ids.js (lowercase, no spaces)
- `brand_name` - Full official company name
- `description` - Brief company overview
- `industry` - Always "Bicycle industry"
- `industry_refined` - Usually "Sporting Goods Manufacturing"
- `industry_subcategory` - Specific category (e.g., "Electric Bicycles", "Mountain Bikes")

#### Research Sources:
1. **Wikipedia** - Check for company page
2. **Official Website** - Get favicon, about info, social media links
3. **LinkedIn** - Company page for employee count, description
4. **WebSearch** - For founding info, history, famous models
5. **News Articles** - For recent developments, acquisitions

#### Common Research Queries:
- `"[Brand Name] bicycle company founded year history"`
- `"[Brand Name] headquarters location address"`
- `"[Brand Name] famous bike models flagship"`
- `"[Brand Name] parent company acquisition"`
- `"[Brand Name] official website social media"`

### 4. Create Batch File
Create a new file following this naming pattern:
- `batch_7_brands.js` (increment the number)
- Or use descriptive names like `next_batch_brands.js`

Structure:
```javascript
const brandinfo = [
  {
    // Brand 1 data following template
  },
  {
    // Brand 2 data following template
  },
  // ... more brands
];

module.exports = brandinfo;
```

### 5. Add Brands to Main File
Once your batch is complete:

1. Open `/scrapers/bicycle_brands.js`
2. Find the end of the array (before `];`)
3. Add a comma after the last brand entry
4. Insert all new brand objects
5. Ensure proper formatting and no syntax errors

### 6. Verify Addition
Run the checker again to confirm brands were added:
```bash
node find_missing_bicycle_brands.js
```

## Data Quality Guidelines

### Essential Fields (Never leave null if possible):
- `brand_name`
- `description` 
- `founding.year`
- `founding.location.country`
- `website`
- `famous_models` (at least 1-2 if available)

### Acceptable to Leave Null:
- `wikipedia_url` (if no Wikipedia page exists)
- `linkedin_url` (if no LinkedIn page exists)
- `stock_exchange`/`stock_symbol` (for private companies)
- `annual_revenue` (often not public)
- `employee_headcount` (if not available)

### Special Cases:
- **Defunct Brands**: Note in `additional_notes` and set `company_type` to "defunct" or "acquired"
- **Limited Info Brands**: Add note "Limited information available for this brand" in `additional_notes`
- **Regional Brands**: Note the primary market/region in `additional_notes`

## Batch Processing Tips

1. **Check for Existing Entries**: Some brands might already be in the file (like Giant was)
2. **Use Templates**: Copy a similar brand's structure and modify
3. **Batch Similar Brands**: Group e-bike brands, kids' bike brands, etc.
4. **Save Progress**: Commit after each successful batch addition

## Common Brand Categories

- **Multi-Category Bikes**: Brands offering road, mountain, hybrid
- **Electric Bicycles**: E-bike specialists
- **Mountain Bikes**: MTB-focused brands
- **Road Bikes & Racing**: Performance road cycling
- **Children's Bicycles**: Kids' bike specialists
- **Urban/Commuter Bikes**: City and commuting focused
- **Gravel Bikes**: Gravel/adventure cycling

## Troubleshooting

- **File Too Large**: The bicycle_brands.js file may exceed read limits. Use offset/limit parameters or edit directly
- **Duplicate Brands**: Always check if a brand already exists before adding
- **JSON Syntax**: Validate JSON structure before saving
- **Missing Commas**: Ensure commas between brand objects

## Current Status Tracking

As of last update:
- Total brands in maker_ids.js: 381
- Total brands in bicycle_brands.js: 236
- Missing brands: 148

Next brands to add are in the checklist starting with:
- nordest
- ns  
- nukeproof
- obed
- ocoee
(etc...)

## AUTOMATED WORKFLOW STEPS WHEN YOU SAY "continue bicycle brands":

1. **I will run** `node find_missing_bicycle_brands.js` to check current status
2. **I will check** if `next_batch_brands.js` or any `batch_X_brands.js` files exist with prepared brands
3. **If batch file exists**: I will add those brands to `bicycle_brands.js`
4. **If no batch file**: I will:
   - Take the next 15-20 brands from the missing list
   - Research each one using WebSearch and WebFetch
   - Create a new batch file with all the researched data
   - Add the batch to the main file
5. **I will verify** the addition by running the checker script again

**You literally just need to say "continue bicycle brands" and I'll handle everything!**