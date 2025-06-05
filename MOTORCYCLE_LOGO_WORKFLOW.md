# 🏍️ Motorcycle Logo Collection - Workflow & To-Do Guide

*Last Updated: 2025-06-05*

## 📋 Table of Contents
1. [Current Status](#current-status)
2. [What We've Done](#what-weve-done)
3. [Workflow Process](#workflow-process)
4. [To-Do List](#to-do-list)
5. [Quality Standards](#quality-standards)
6. [Tools & Resources](#tools--resources)
7. [Verification Process](#verification-process)
8. [Future Improvements](#future-improvements)

---

## 📊 Current Status

### Collection Overview
- **Total Brands Identified**: 682
- **Total Logos Collected**: 44
- **High-Resolution Logos**: 18 (512px+)
- **Priority Brand Coverage**: 45%
- **Quality Threshold**: 512px minimum (upgraded from 200px)

### High-Resolution Logos We Have
| Brand | Resolution | Quality | Status |
|-------|------------|---------|---------|
| Benelli | 3840x2160 | ⭐⭐⭐⭐⭐ | Verified |
| BMW | 2048x2048 | ⭐⭐⭐⭐⭐ | Verified |
| Honda | 2048x1644 | ⭐⭐⭐⭐⭐ | Verified |
| Harley-Davidson | 1200x973 | ⭐⭐⭐⭐⭐ | Verified |
| Aprilia | 800x400 | ⭐⭐⭐⭐ | Verified |
| Kawasaki | 800x85 | ⭐⭐⭐⭐ | Verified |
| KTM | 800x419 | ⭐⭐⭐⭐ | Verified |
| Suzuki | 800x156 | ⭐⭐⭐⭐ | Verified |
| Yamaha | 800x164 | ⭐⭐⭐⭐ | Verified |
| + 9 more... | 800px+ | ⭐⭐⭐⭐ | Verified |

---

## ✅ What We've Done

### 1. **System Configuration Updates**
- [x] Updated minimum logo size from 200px to 512px
- [x] Set preferred size to 1024px+
- [x] Increased file size limit to 10MB
- [x] Added output sizes: 32px, 64px, 128px, 256px, 512px, 1024px, 2048px

### 2. **Tool Development**
- [x] Created automated download scripts (`download_verified_logos_v2.sh`)
- [x] Built Wikipedia search tool (`search_wikipedia_logos.py`)
- [x] Developed quality check script (`check_logo_quality.py`)
- [x] Set up manual verification server (port 3000)
- [x] Created web upload interface

### 3. **Logo Acquisition**
- [x] Downloaded Japanese Big 4 (Honda, Yamaha, Suzuki, Kawasaki)
- [x] Acquired major European brands (BMW, KTM, Triumph, Husqvarna)
- [x] Collected Italian brands (Aprilia, Benelli, Moto Guzzi, Piaggio, Vespa)
- [x] Removed invalid/corrupted logos
- [x] Upgraded existing logos to higher resolution

### 4. **Documentation**
- [x] Created progress reports
- [x] Documented quality standards
- [x] Built manual download guides
- [x] Tracked collection status

---

## 🔄 Workflow Process

### Step 1: Identify Target Brands
```bash
# Check what we're missing
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers/logo-acquisition
python3 check_logo_quality.py
```

### Step 2: Automated Download Attempt
```bash
# Try SVG first (infinitely scalable!)
python3 get_svg_logos.py

# Then try PNG downloads
./download_verified_logos_v2.sh

# Or use Python scripts
python3 get_logos_now.py
python3 upgrade_to_high_res.py
```

#### 🌟 **NEW: SVG Priority**
Always search for SVG files first! They're vector format and scale perfectly:
- Check Wikipedia/Wikimedia for `.svg` files
- Convert SVG to any size PNG: `convert -background none logo.svg -resize 2048x2048 logo.png`
- Keep both SVG and PNG versions

### Step 3: Manual Download (if automated fails)
1. Visit Wikipedia page for brand
2. Click on logo in infobox
3. Navigate to "Original file" or highest resolution
4. Right-click → Save Image As
5. Name as: `brandname.png` (lowercase, underscores for spaces)

### Step 4: Quality Validation
```bash
# Check downloaded logo
identify -format "%wx%h" brandname.png

# Verify it's a real image
file brandname.png | grep "image data"
```

### Step 5: Process & Optimize
```bash
# If using manual verification server
node manual_verification_server.js
# Visit http://localhost:3000

# Or use batch processor
node batch_logo_processor.js
```

### Step 6: Verify Accuracy
- Compare with official brand guidelines
- Check for correct version (current vs old logos)
- Ensure it's the motorcycle division logo
- Verify transparent background (PNG)

---

## 📝 To-Do List

### 🔴 High Priority - Missing Critical Brands
- [ ] **Ducati** - Italian premium (most requested)
  - Try: Wikipedia, official Ducati media kit
  - Fallback: ducati.com/media
- [ ] **Norton** - British revival brand
  - Try: Norton Motorcycles Wikipedia
  - Fallback: nortonmotorcycles.com
- [ ] **Indian** - American heritage
  - Try: Indian Motorcycle Wikipedia
  - Fallback: indianmotorcycle.com/media
- [ ] **MV Agusta** - Italian exotic
  - Try: MV Agusta Wikipedia
  - Fallback: mvagusta.com
- [ ] **Zero Motorcycles** - Electric pioneer
  - Try: Zero Motorcycles Wikipedia
  - Fallback: zeromotorcycles.com

### 🟡 Medium Priority - Regional Coverage
- [ ] **BSA** - British heritage
- [ ] **Buell** - American sport
- [ ] **Victory** - American cruiser
- [ ] **Bimota** - Italian exotic
- [ ] **Cagiva** - Italian sport

### 🟢 Low Priority - Completeness
- [ ] **Can-Am** - Three-wheelers
- [ ] **Polaris** - American off-road
- [ ] **Ural** - Russian with sidecar
- [ ] **Bajaj** - Indian manufacturer
- [ ] **Hero** - Indian volume leader
- [ ] **TVS** - Indian manufacturer
- [ ] **KYMCO** - Taiwanese scooters
- [ ] **SYM** - Taiwanese manufacturer
- [ ] **CFMoto** - Chinese manufacturer

### 🔧 System Improvements
- [ ] Create automated verification script
- [ ] Build brand guideline database
- [ ] Implement version control for logos
- [ ] Add metadata tracking (source, date, version)
- [ ] Create logo usage guidelines

---

## 📏 Quality Standards

### Minimum Requirements
- **Resolution**: 512x512px absolute minimum
- **Preferred**: 1024x1024px or larger
- **Format**: PNG with transparent background
- **File Size**: Up to 10MB acceptable
- **Color**: Original brand colors (no modifications)

### Rejection Criteria
- ❌ Below 512px in any dimension
- ❌ JPEG with white background (unless no PNG exists)
- ❌ Watermarked or copyrighted versions
- ❌ Old/outdated logo versions
- ❌ Non-motorcycle division logos
- ❌ Poor quality/pixelated images

### Quality Tiers
- ⭐⭐⭐⭐⭐ **Excellent**: 1024px+ from official source
- ⭐⭐⭐⭐ **Good**: 800px+ from Wikipedia/verified source
- ⭐⭐⭐ **Acceptable**: 512px-799px (minimum standard)
- ⭐⭐ **Poor**: Below 512px (must replace)
- ⭐ **Invalid**: Not a logo/corrupted

---

## 🛠️ Tools & Resources

### Command Line Tools
```bash
# Check image dimensions
identify -format "%wx%h" logo.png

# Verify file type
file logo.png

# Convert to PNG if needed
convert logo.jpg logo.png

# Resize while maintaining quality
convert logo.png -resize 1024x1024 logo_1024.png

# Check all logos at once
for f in *.png; do echo "$f: $(identify -format "%wx%h" "$f")"; done
```

### Python Scripts
- `check_logo_quality.py` - Quality assessment
- `get_logos_now.py` - Automated Wikipedia scraper
- `upgrade_to_high_res.py` - Resolution upgrader
- `search_wikipedia_logos.py` - URL finder

### Web Tools
- **Manual Verification Server**: `http://localhost:3000`
- **Wikipedia Commons**: Best source for free logos
- **BrandsOfTheWorld**: Alternative logo source
- **SeekLogo**: Commercial logo database

### Download Sources (Ranked)
1. **Wikipedia/Wikimedia Commons** - Free, usually high quality
2. **Official manufacturer media/press pages** - Highest quality
3. **BrandsOfTheWorld.com** - Good selection
4. **SeekLogo.com** - Commercial logos
5. **1000Logos.net** - Use carefully, verify quality

---

## ✔️ Verification Process

### 1. **Visual Verification**
- Is it the current logo version?
- Is it the motorcycle division (not corporate)?
- Are colors accurate?
- Is background transparent?

### 2. **Technical Verification**
```bash
# Check it's a real motorcycle brand logo
identify -verbose logo.png | grep -E "Geometry|Format|Colorspace"

# Verify transparency
identify -format "%[opaque]" logo.png
```

### 3. **Brand Accuracy Checklist**
- [ ] Correct brand name spelling
- [ ] Current logo version (not vintage unless specified)
- [ ] Motorcycle division specific (not car/marine/etc)
- [ ] No modifications or filters applied
- [ ] Official brand colors

### 4. **Common Issues to Check**
- **Ducati**: Red logo, not black/white versions
- **Harley-Davidson**: Bar & shield, not just text
- **BMW**: Motorcycle division may differ from car logo
- **Yamaha**: Tuning fork symbol with text
- **Honda**: Wing logo or Honda text

---

## 🚀 Future Improvements

### Phase 1: Complete Priority Collection (Current)
- [ ] Reach 80% coverage of priority brands (32/40)
- [ ] All logos minimum 512px resolution
- [ ] Verified accuracy for top 20 brands

### Phase 2: Enhanced Metadata
- [ ] Add JSON metadata for each logo
  ```json
  {
    "brand": "Ducati",
    "resolution": "1024x1024",
    "source": "Wikipedia",
    "date_acquired": "2025-06-05",
    "version": "2023-current",
    "verified": true
  }
  ```
- [ ] Track logo versions and history
- [ ] Add usage rights information

### Phase 3: Automation & API
- [ ] Build API endpoint for logo serving
- [ ] Automated daily checks for new/updated logos
- [ ] Version control system for logo updates
- [ ] Automated quality reports

### Phase 4: Extended Collection
- [ ] Add vintage/historical logos
- [ ] Include racing team variations
- [ ] Add electric motorcycle startups
- [ ] Include regional brands (Asia, South America)

---

## 📊 Progress Tracking

### Weekly Goals
- [ ] Week 1: Complete missing priority brands (5)
- [ ] Week 2: Upgrade any remaining <512px logos
- [ ] Week 3: Add metadata system
- [ ] Week 4: Reach 80% priority coverage

### Monthly Targets
- Month 1: 50% coverage → 80% coverage
- Month 2: Metadata implementation
- Month 3: API development
- Month 4: Extended collection

---

## 💡 Tips & Best Practices

### For Manual Downloads
1. Always check Wikipedia first - it's usually the easiest
2. Click through to the highest resolution available
3. If Wikipedia fails, try the official website's media/press section
4. Save with consistent naming: `brandname.png` (lowercase)
5. Immediately verify the download with `identify` command

### For Verification
1. Compare with official website header/footer logos
2. Check motorcycle news sites for current branding
3. Verify against actual motorcycles (Google Images)
4. When in doubt, check multiple sources

### For Processing
1. Always keep original downloads as backup
2. Generate multiple sizes but keep the original
3. Use PNG format for transparency
4. Document the source for future reference

---

## 📞 Quick Commands Reference

```bash
# Check current status
ls *.png | wc -l  # Total count
for f in *.png; do identify -format "%f: %wx%h\n" "$f"; done | grep -E "[0-9]{3,}x"  # High-res only

# Start manual server
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers/logo-acquisition
node manual_verification_server.js

# Run quality check
python3 check_logo_quality.py

# Batch download attempt
./download_verified_logos_v2.sh
```

---

*This workflow document should be updated as we progress through the collection process.*