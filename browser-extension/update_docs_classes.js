#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// List of documentation files to update
const files = [
  'src/documentation/about/index.njk',
  'src/documentation/advocacy/index.njk',
  'src/documentation/blog/index.njk',
  'src/documentation/bot-documentation/index.njk',
  'src/documentation/bot-setup-guide/index.njk',
  'src/documentation/bot-setup/index.njk',
  'src/documentation/community-tools-docs/index.njk',
  'src/documentation/community/adventure-riders/index.njk',
  'src/documentation/community/cruiser-nation/index.njk',
  'src/documentation/community/cruiser-nation/manage/index.njk',
  'src/documentation/community/e-bike-enthusiasts/index.njk',
  'src/documentation/community/index.njk',
  'src/documentation/community/mountain-bike-central/index.njk',
  'src/documentation/community/road-cycling-pro/index.njk',
  'src/documentation/community/sport-bike-riders/index.njk',
  'src/documentation/community/sport-bike-riders/manage/index.njk',
  'src/documentation/contact/index.njk',
  'src/documentation/discord-bot/index.njk',
  'src/documentation/features/index.njk',
  'src/documentation/privacy/index.njk',
  'src/documentation/support/index.njk',
  'src/documentation/systems-architecture/index.njk',
  'src/documentation/terms/index.njk',
  'src/documentation/virtual-garage-docs/index.njk',
  'src/documentation/web-extension/index.njk'
];

// Class mappings
const classMappings = {
  'content-header': 'docs-content-header',
  'content-subtitle': 'docs-content-subtitle',
  'content-body': 'docs-content-body',
  'content-section': 'docs-content-section',
  'feature-list': 'docs-feature-list',
  'feature-item': 'docs-feature-item',
  'steps': 'docs-steps',
  'step': 'docs-step',
  'cta-section': 'docs-cta-section',
  'stats-grid': 'docs-stats-grid',
  'stat-item': 'docs-stat-item'
};

// Base path for website
const basePath = '/Users/kevintong/Documents/Code/bikenode.com/website';

files.forEach(file => {
  const filePath = path.join(basePath, file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Replace each class
    Object.entries(classMappings).forEach(([oldClass, newClass]) => {
      // Match class attribute with the old class name
      // This regex handles cases where the class might be alone or with other classes
      const regex = new RegExp(`(class="[^"]*)\\b${oldClass}\\b([^"]*")`, 'g');
      const newContent = content.replace(regex, `$1${newClass}$2`);
      
      if (newContent !== content) {
        content = newContent;
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${file}`);
    } else {
      console.log(`No changes needed: ${file}`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
});

console.log('\nDone!');