#!/bin/bash

# Motorcycle Logo Acquisition System Setup Script

echo "🏍️  Motorcycle Logo Acquisition System Setup"
echo "==========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Create required directories
echo ""
echo "📁 Creating directory structure..."

directories=(
    "images"
    "images/raw" 
    "images/verified"
    "images/processed"
    "images/manual_uploads"
    "images/processed/web"
    "tools"
    "public"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "   Created: $dir"
    else
        echo "   Exists: $dir"
    fi
done

# Install Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
echo "   This may take a few minutes..."

npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check for motorcycle brands data
echo ""
echo "🔍 Checking for motorcycle brands data..."

brand_files=(
    "../database/data/motorcycle_brands.csv"
    "../all_motorcycle_brands.txt"
)

found_brands=false
for file in "${brand_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ Found: $file"
        found_brands=true
    else
        echo "   ❌ Missing: $file"
    fi
done

if [ "$found_brands" = false ]; then
    echo ""
    echo "⚠️  Warning: No motorcycle brands data found!"
    echo "   The system needs brand data to work properly."
    echo "   Please ensure you have either:"
    echo "   - ../database/data/motorcycle_brands.csv"
    echo "   - ../all_motorcycle_brands.txt"
    echo ""
fi

# Make CLI executable
chmod +x logo_cli.js

# Create a simple test to verify installation
echo ""
echo "🧪 Running installation test..."

node -e "
const fs = require('fs');
const path = require('path');

console.log('Testing required modules...');

try {
    require('sharp');
    console.log('   ✅ Sharp (image processing)');
} catch (e) {
    console.log('   ❌ Sharp failed:', e.message);
}

try {
    require('canvas');
    console.log('   ✅ Canvas (image generation)');
} catch (e) {
    console.log('   ❌ Canvas failed:', e.message);
}

try {
    require('express');
    console.log('   ✅ Express (web server)');
} catch (e) {
    console.log('   ❌ Express failed:', e.message);
}

console.log('Installation test complete!');
"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Start logo search:     node logo_cli.js search"
echo "2. Manual verification:   node logo_cli.js verify"
echo "3. Process final logos:   node logo_cli.js process"
echo "4. Check progress:        node logo_cli.js status"
echo ""
echo "📖 For full documentation: cat README.md"
echo "💡 For help: node logo_cli.js help"
echo ""

# Optionally run a quick search test
read -p "🤔 Would you like to run a test search for a single brand? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔍 Running test search for Honda..."
    node logo_cli.js search --single Honda
fi

echo ""
echo "✨ Ready to acquire motorcycle logos!"