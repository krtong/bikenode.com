# Motorcycle Brand Logo Acquisition Status

> **⚠️ Logo Acquisition Principles**
> - Track only actual downloaded and verified logo files
> - Don't assume logo availability - verify through actual acquisition
> - Document real acquisition challenges and successes
> - Leave room for discovering new logo sources and methods
> - See core principles in [README_BEFORE_MAKING_ANY_PAGE.md]

## Current Progress
- **Total Brands**: 684
- **Logos Acquired**: 3 (BMW, Harley-Davidson, Honda)
- **Progress**: 0.4%

## Successfully Downloaded Logos
1. BMW - `bmw.png` - 500KB - High quality from Wikipedia
2. Harley-Davidson - `harley_davidson.png` - 67KB - High quality from Wikipedia  
3. Honda - `honda.png` - 98KB - High quality from Wikipedia

## Tools Created

### 1. Logo Tracker (`motorcycle_logo_tracker.py`)
- Tracks acquisition progress
- Auto-detects valid PNG files
- Generates reports
- Maintains JSON database of logo status

### 2. Search Guide (`search_guide.html`)
- Click-through links for 336 active brands
- Multiple search sources per brand
- Prioritizes active manufacturers

### 3. Logo Sources Documentation (`all_logo_sources.json`)
- Comprehensive search URLs for all 684 brands
- Multiple search engines and databases
- Official websites when available

### 4. Download Scripts
- `download_major_brands.sh` - Initial attempt for major brands
- `download_verified_logos.sh` - Improved URLs
- `download_wikipedia_logos.sh` - Wikipedia-specific sources

## Challenges Encountered

1. **URL Availability**: Many Wikipedia URLs return 404 errors or have changed
2. **File Format**: Some downloads return HTML error pages instead of images
3. **Naming Conventions**: Need to match various naming patterns
4. **Source Reliability**: Different sources have different URL structures

## Recommended Approach

### For Manual Acquisition:
1. Start with active brands that have official websites
2. Use the search guide HTML file to click through sources
3. Priority sources:
   - Official brand websites (/media or /press pages)
   - Wikipedia/Wikimedia Commons
   - Seeklogo.com
   - Brands of the World

### Quality Guidelines:
- Minimum 500px width
- PNG format with transparent background
- Full color (not monochrome unless official)
- Current/latest version of logo

### File Naming:
- Use lowercase
- Replace spaces with underscores
- Example: `harley_davidson.png`, `mv_agusta.png`

## Next Steps

1. **Priority Brands** - Focus on top 50 active manufacturers:
   - Yamaha, Kawasaki, Suzuki (Japanese Big 4)
   - Ducati, Aprilia, MV Agusta (Italian)
   - KTM, Husqvarna (Austrian)
   - Triumph, Norton (British)
   - Indian, Victory (American)
   - Royal Enfield (Indian)

2. **Automation Options**:
   - Web scraping official websites
   - GitHub repositories with logo collections
   - Partnership with logo databases

3. **Alternative Sources**:
   - Motorcycle news websites
   - Manufacturer press kits
   - Trade association resources
   - Owner forums and wikis

## Commands

### Check Progress:
```bash
python logo-acquisition/motorcycle_logo_tracker.py
```

### View Search Guide:
```bash
open logo-acquisition/search_guide.html
```

### Clean Invalid Files:
```bash
cd logos/motorcycle-brands
file *.png | grep -v "PNG image" | cut -d: -f1 | xargs rm -f
```

## Statistics
- Active brands: 336
- Defunct brands: 348
- Priority brands (active with websites): ~200

The systematic approach with tracking ensures no duplicate effort and maintains quality standards across all logo acquisitions.