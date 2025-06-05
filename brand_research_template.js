// Template for bicycle brand research
const brand_template = {
  "brand_id": "",              // lowercase, no spaces (from maker_ids.js)
  "brand_name": "",            // Full official name
  "wikipedia_url": null,       // Wikipedia page if exists
  "linkedin_url": null,        // LinkedIn company page
  
  "logo": {
    "logo_url": null,          // Official logo image URL
    "icon_url": null           // Favicon from website
  },
  
  "description": "",           // Brief company description
  
  "founders": [],              // Array of founder names
  "founding": {
    "year": null,              // Founding year
    "full_date": null,         // Specific date if known
    "location": {
      "city": "",
      "state_province": "",
      "country": ""
    }
  },
  
  "history": "",               // Company history narrative
  
  "parent_company": null,      // Parent company if applicable
  "subsidiaries": [],          // Array of subsidiary companies
  
  "headquarters": {
    "address": "",             // Full street address
    "city": "",
    "state_province": "",
    "country": ""
  },
  
  "headquarters_image_url": null,  // Photo of HQ building
  
  "company_type": "",          // "private", "public", etc.
  "stock_exchange": null,      // If public
  "stock_symbol": null,        // If public
  
  "employee_headcount": {
    "number": null,
    "as_of": ""                // Date of data
  },
  
  "annual_revenue": {
    "amount": null,
    "currency": "",
    "as_of": ""
  },
  
  "industry": "",              // General industry
  "industry_refined": "",      // More specific
  "industry_subcategory": "",  // Most specific
  
  "famous_models": [],         // Array of model names
  
  "brand_hero_image_url": null,  // Brand hero/banner image
  
  "flagship_models": [         // Array of detailed models
    {
      "name": "",
      "year": null,
      "image_url": null,
      "hero_image_url": null
    }
  ],
  
  "website": "",               // Official website
  
  "social_media": {
    "facebook": null,
    "twitter": null,
    "instagram": null,
    "linkedin": null,
    "youtube": null,
    "pinterest": null
  },
  
  "additional_notes": null     // Any other relevant info
};