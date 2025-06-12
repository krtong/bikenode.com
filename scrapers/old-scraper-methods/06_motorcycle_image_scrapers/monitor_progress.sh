#!/bin/bash
# Monitor the progress of motorcycle image scraping

echo "🏍️  Motorcycle Image Scraping Progress Monitor"
echo "=============================================="
echo ""

# Check if scrapers are running
GENERAL_SCRAPER_PID=$(pgrep -f "06_motorcycle_image_scraper.js")
DUCATI_SCRAPER_PID=$(pgrep -f "07_ducati_2025_image_scraper.js")

echo "📊 Scraper Status:"
if [ ! -z "$GENERAL_SCRAPER_PID" ]; then
    echo "✅ General motorcycle scraper running (PID: $GENERAL_SCRAPER_PID)"
else
    echo "❌ General motorcycle scraper not running"
fi

if [ ! -z "$DUCATI_SCRAPER_PID" ]; then
    echo "✅ 2025 Ducati scraper running (PID: $DUCATI_SCRAPER_PID)"
else
    echo "❌ 2025 Ducati scraper not running"
fi
echo ""

# Check progress files
echo "📈 Progress Statistics:"
if [ -f "motorcycle_scraper_progress.json" ]; then
    echo "General Scraper Progress:"
    cat motorcycle_scraper_progress.json | python3 -m json.tool 2>/dev/null || echo "  Progress file exists but unreadable"
    echo ""
fi

if [ -f "ducati_2025_progress.json" ]; then
    echo "2025 Ducati Progress:"
    cat ducati_2025_progress.json | python3 -m json.tool 2>/dev/null || echo "  Progress file exists but unreadable"
    echo ""
fi

# Check images directory
echo "📁 Images Directory Status:"
if [ -d "../images/motorcycles" ]; then
    TOTAL_DIRS=$(find ../images/motorcycles -type d | wc -l)
    TOTAL_FILES=$(find ../images/motorcycles -type f | wc -l)
    echo "  📂 Total directories: $((TOTAL_DIRS - 1))"
    echo "  🖼️  Total image files: $TOTAL_FILES"
    
    echo ""
    echo "🏍️  Brand breakdown:"
    find ../images/motorcycles -maxdepth 1 -type d | grep -v "motorcycles$" | while read dir; do
        if [ -d "$dir" ]; then
            brand=$(basename "$dir")
            files=$(find "$dir" -type f | wc -l)
            echo "  $brand: $files images"
        fi
    done
else
    echo "  ❌ Images directory not found"
fi
echo ""

echo "⏰ Last update: $(date)"
