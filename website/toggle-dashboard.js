#!/usr/bin/env node

// Script to toggle between dashboard v1 and v2
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'src', '_data', 'dashboardConfig.js');

// Read current config
const configContent = fs.readFileSync(configPath, 'utf8');

// Toggle version
const newContent = configContent.includes("version: 'v1'")
  ? configContent.replace("version: 'v1'", "version: 'v2'")
  : configContent.replace("version: 'v2'", "version: 'v1'");

// Write back
fs.writeFileSync(configPath, newContent);

// Determine new version
const newVersion = newContent.includes("version: 'v1'") ? 'v1' : 'v2';

console.log(`✅ Dashboard switched to ${newVersion}`);
console.log(`\nTo change versions:`);
console.log(`- Edit src/_data/dashboardConfig.js`);
console.log(`- Or run: node toggle-dashboard.js`);
console.log(`\nCurrent version: ${newVersion}`);