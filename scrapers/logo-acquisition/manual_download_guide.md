# High-Resolution Motorcycle Logo Download Guide

## Current Status
- Total brands: 682
- Valid logos: ~30 (after cleanup)
- High-res logos: 3 (BMW, Honda, Harley-Davidson)

## Priority Brands Still Needed (High-Res 800px+)

### Japanese Big 4
- [ ] **Yamaha** - Try: https://en.wikipedia.org/wiki/Yamaha_Motor_Company
- [ ] **Kawasaki** - Try: https://en.wikipedia.org/wiki/Kawasaki_Heavy_Industries
- [ ] **Suzuki** - Try: https://en.wikipedia.org/wiki/Suzuki

### Italian Brands
- [ ] **Ducati** - Try: https://en.wikipedia.org/wiki/Ducati
- [ ] **Aprilia** - Try: https://en.wikipedia.org/wiki/Aprilia
- [ ] **MV Agusta** - Try: https://en.wikipedia.org/wiki/MV_Agusta
- [ ] **Moto Guzzi** - Try: https://en.wikipedia.org/wiki/Moto_Guzzi

### European Brands
- [ ] **KTM** - Try: https://en.wikipedia.org/wiki/KTM
- [ ] **Triumph** - Try: https://en.wikipedia.org/wiki/Triumph_Motorcycles
- [ ] **BMW Motorrad** - ✅ Already have (2048px)

### American Brands
- [ ] **Harley-Davidson** - ✅ Already have (1200px)
- [ ] **Indian** - Try: https://en.wikipedia.org/wiki/Indian_Motocycle_Manufacturing_Company
- [ ] **Zero Motorcycles** - Try: https://en.wikipedia.org/wiki/Zero_Motorcycles

## Manual Download Process

1. **Visit Wikipedia page** for the brand
2. **Look for the logo** in the infobox (usually top-right)
3. **Click on the logo** to open the file page
4. **Find "Original file"** or largest resolution available
5. **Right-click and save** as `brandname.png` (all lowercase, underscores for spaces)

## Naming Convention
- Use lowercase: `yamaha.png`, not `Yamaha.png`
- Replace spaces with underscores: `mv_agusta.png`
- Remove special characters: `harley_davidson.png` not `harley-davidson.png`

## Quality Standards
- **Minimum**: 512x512px (will be rejected if smaller)
- **Preferred**: 1024x1024px or larger
- **Format**: PNG with transparent background preferred
- **File size**: Up to 10MB acceptable for high-res logos

## Alternative Sources
1. **Wikimedia Commons**: https://commons.wikimedia.org/
2. **Brands of the World**: https://www.brandsoftheworld.com/
3. **Seek Logo**: https://seeklogo.com/
4. **Official manufacturer websites** (press/media sections)

## Using the Manual Verification Server

```bash
cd /Users/kevintong/Documents/Code/bikenode.com/scrapers/logo-acquisition
node manual_verification_server.js
```

Then visit: http://localhost:3000

This provides a web interface to:
- Upload logos manually
- Review and approve logos
- Process logos to multiple sizes
- Validate quality standards