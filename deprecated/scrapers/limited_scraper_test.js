#!/usr/bin/env node

// Run the actual database_aware_scraper.js but with a limit of 3 variants for testing
import fs from "fs/promises";
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

console.log("🧪 TESTING ACTUAL database_aware_scraper.js WITH LIMITED BATCH");
console.log("="*60);

// Create a backup of the original scraper
try {
  await fs.copyFile('database_aware_scraper.js', 'database_aware_scraper_backup.js');
  console.log("📄 Created backup: database_aware_scraper_backup.js");
} catch (err) {
  console.log("⚠️  Could not create backup:", err.message);
}

// Read the original scraper
const originalContent = await fs.readFile('database_aware_scraper.js', 'utf8');

// Modify it to only process 3 variants for testing
const modifiedContent = originalContent.replace(
  'for (const variant of variantsToProcess) {',
  'for (const variant of variantsToProcess.slice(0, 3)) { // TESTING: Only process first 3 variants'
);

// Also add a console log to show which variants will be processed
const finalContent = modifiedContent.replace(
  'console.log(`📊 Found ${totalToProcess} variants needing comprehensive extraction`);',
  `console.log(\`📊 Found \${totalToProcess} variants needing comprehensive extraction\`);
console.log(\`🧪 TESTING MODE: Only processing first 3 variants\`);
console.log(\`   Test variants:\`);
variantsToProcess.slice(0, 3).forEach((v, i) => {
  console.log(\`   \${i+1}. \${v.name} (ID: \${v.variantId})\`);
});`
);

// Write the modified scraper
await fs.writeFile('database_aware_scraper_test.js', finalContent);
console.log("📝 Created test version: database_aware_scraper_test.js");

console.log("\n🚀 Running limited database-aware scraper test...\n");

try {
  const { stdout, stderr } = await execAsync('node database_aware_scraper_test.js', {
    timeout: 300000 // 5 minute timeout
  });
  
  console.log("STDOUT:");
  console.log(stdout);
  
  if (stderr) {
    console.log("\nSTDERR:");
    console.log(stderr);
  }
  
  console.log("\n✅ SCRAPER TEST COMPLETED");
  
} catch (error) {
  console.log("\n❌ SCRAPER TEST FAILED:");
  console.log("Error:", error.message);
  
  if (error.stdout) {
    console.log("\nPartial Output:");
    console.log(error.stdout);
  }
  
  if (error.stderr) {
    console.log("\nError Output:");
    console.log(error.stderr);
  }
}

// Clean up test file
try {
  await fs.unlink('database_aware_scraper_test.js');
  console.log("🧹 Cleaned up test file");
} catch (err) {
  console.log("⚠️  Could not clean up test file:", err.message);
}

console.log("\n🎯 Test complete! Check output above for results.");