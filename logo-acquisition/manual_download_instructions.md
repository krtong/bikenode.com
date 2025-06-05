# Motorcycle Brand Logo Acquisition Guide

## Overview
This guide will help you systematically download high-quality PNG logos for all 684 motorcycle brands in our database.

## Tools Created
1. **search_guide.html** - Click-through links for searching each brand's logo
2. **naming_guide.txt** - Consistent file naming convention
3. **motorcycle_logo_tracker.py** - Track progress and mark completed logos

## Step-by-Step Process

### 1. Open the Search Guide
```bash
open /Users/kevintong/Documents/Code/bikenode.com/logo-acquisition/search_guide.html
```

### 2. For Each Brand:

#### Priority Sources (in order):
1. **Official Website** (green button) - Check /media, /press, or /about pages
2. **Wikipedia** - Often has SVG/PNG logos in the infobox
3. **Seeklogo** - Good for transparent PNGs
4. **Brands of the World** - Professional logo database
5. **Google Images** - Use Tools → Color → Transparent

#### Quality Criteria:
- **Format**: PNG with transparent background preferred
- **Resolution**: Minimum 500px width, ideally 1000px+
- **Aspect**: Original aspect ratio (don't use stretched logos)
- **Color**: Full color version (not monochrome unless that's the official logo)

### 3. Download Process:
1. Right-click → "Save Image As..."
2. Navigate to: `/Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands/`
3. Use the filename from naming_guide.txt (e.g., `harley_davidson.png`)

### 4. Track Your Progress:
After downloading a batch, run:
```bash
cd /Users/kevintong/Documents/Code/bikenode.com
python logo-acquisition/motorcycle_logo_tracker.py
```

This will:
- Auto-detect newly added logos
- Update the tracking database
- Generate a progress report

### 5. Manual Tracking (if needed):
If you need to manually mark a logo as acquired:
```python
from logo_acquisition.motorcycle_logo_tracker import LogoTracker
tracker = LogoTracker()
tracker.load_brands()
tracker.load_tracking_data()
tracker.mark_logo_acquired("Harley-Davidson", "harley_davidson.png", "Official website", "high")
```

## Tips for Efficiency:

### Batch Processing:
1. Open 10-20 search tabs at once
2. Download all logos to Downloads folder first
3. Batch rename and move to final directory
4. Run tracker to update progress

### Difficult Brands:
- **Defunct brands**: Try motorcycle museum sites, vintage motorcycle forums
- **Chinese brands**: May need to search with Chinese characters
- **Custom/Boutique**: Check Instagram, Facebook pages
- **No logo found**: Note in tracker as "No official logo available"

### Alternative Sources:
- Motorcycle manufacturer associations
- Trade show websites
- Motorcycle news sites (Motorcycle.com, Cycle World, etc.)
- Owner forums and clubs

## Common Issues:

### Low Quality Only Available:
- Use online upscaling tools (waifu2x, AI Image Enlarger)
- Vectorize with SVG trace tools if desperate
- Note as "low quality" in tracker

### Multiple Logo Versions:
- Prefer current/most recent version
- Download primary mark (not wordmarks or badges)
- If significantly different versions exist, download as brand_v2.png

### No Logo Exists:
- Some brands only have text names
- Mark as "Text only - no logo" in tracker
- Could create simple text-based placeholder

## Progress Monitoring:
Check your progress anytime:
```bash
cd /Users/kevintong/Documents/Code/bikenode.com
python logo-acquisition/motorcycle_logo_tracker.py
```

The report will show:
- Total progress percentage
- List of completed brands
- List of remaining brands
- Prioritized by active/defunct status

## Quality Control:
After completing batches, review:
1. Consistent sizing (resize to standard height if needed)
2. All backgrounds transparent
3. No watermarks or artifacts
4. Proper color representation

---

## Automation Note:
While this is a manual process, the tracking system will help you:
- Avoid duplicate work
- Prioritize important brands
- Track quality and sources
- Generate reports for review

Good luck with the logo acquisition! With systematic effort, you should be able to complete 50-100 logos per hour.