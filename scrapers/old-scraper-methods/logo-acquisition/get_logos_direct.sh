#!/bin/bash

cd /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands

echo "🏍️ Getting Priority Logos - Direct Download"
echo "=========================================="
echo ""

# Function to download with fallback
download_logo() {
    local brand=$1
    local filename=$2
    shift 2
    local urls=("$@")
    
    echo "🔍 $brand..."
    
    # Check if already exists
    if [ -f "$filename" ]; then
        size=$(identify -format "%wx%h" "$filename" 2>/dev/null || echo "unknown")
        echo "  ✓ Already exists ($size)"
        return 0
    fi
    
    # Try each URL
    for url in "${urls[@]}"; do
        echo "  Trying: $url"
        if curl -L -s -o "${filename}.temp" "$url"; then
            # Check if it's an image
            if file "${filename}.temp" | grep -q "image data"; then
                mv "${filename}.temp" "$filename"
                size=$(identify -format "%wx%h" "$filename" 2>/dev/null || echo "unknown")
                echo "  ✅ Success! ($size)"
                return 0
            else
                rm -f "${filename}.temp"
            fi
        fi
    done
    
    echo "  ❌ All attempts failed"
    return 1
}

# Ducati - multiple attempts
download_logo "Ducati" "ducati.png" \
    "https://www.pngmart.com/files/22/Ducati-Logo-PNG-File.png" \
    "https://www.kindpng.com/picc/m/252-2525574_ducati-logo-png-transparent-png.png" \
    "https://www.vhv.rs/dpng/d/427-4270172_ducati-logo-png-transparent-png.png"

# Norton
download_logo "Norton" "norton.png" \
    "https://www.kindpng.com/picc/m/495-4955960_norton-motorcycles-logo-hd-png-download.png" \
    "https://www.vhv.rs/dpng/d/528-5284490_norton-motorcycle-logo-hd-png-download.png"

# Indian Motorcycle
download_logo "Indian" "indian.png" \
    "https://www.kindpng.com/picc/m/236-2361639_indian-motorcycle-logo-png-transparent-png.png" \
    "https://www.vhv.rs/dpng/d/425-4255458_indian-motorcycle-logo-png-transparent-png.png"

# MV Agusta
download_logo "MV Agusta" "mv_agusta.png" \
    "https://www.kindpng.com/picc/m/474-4743093_mv-agusta-logo-png-transparent-png.png" \
    "https://www.vhv.rs/dpng/d/453-4531421_mv-agusta-logo-png-transparent-png.png"

# Zero Motorcycles
download_logo "Zero" "zero.png" \
    "https://www.kindpng.com/picc/m/779-7792657_zero-motorcycles-logo-hd-png-download.png" \
    "https://seeklogo.com/images/Z/zero-motorcycles-logo-5E0C4B6E6A-seeklogo.com.png"

# Can-Am (if not exists)
download_logo "Can-Am" "can_am.png" \
    "https://upload.wikimedia.org/wikipedia/en/e/e7/Can-Am_Logo.png" \
    "https://seeklogo.com/images/C/can-am-logo-C89E97A356-seeklogo.com.png"

# Bimota
download_logo "Bimota" "bimota.png" \
    "https://seeklogo.com/images/B/bimota-logo-A7B9A0F074-seeklogo.com.png" \
    "https://www.kindpng.com/picc/m/720-7208524_bimota-logo-png-transparent-png.png"

# Cagiva
download_logo "Cagiva" "cagiva.png" \
    "https://seeklogo.com/images/C/cagiva-logo-1A4834E4CC-seeklogo.com.png" \
    "https://www.kindpng.com/picc/m/776-7768731_cagiva-logo-hd-png-download.png"

# Sherco
download_logo "Sherco" "sherco.png" \
    "https://seeklogo.com/images/S/sherco-logo-7A4C4E8F4B-seeklogo.com.png" \
    "https://www.sherco.com/img/logo-sherco.png"

# Jawa
download_logo "Jawa" "jawa.png" \
    "https://seeklogo.com/images/J/jawa-logo-D6DAD6B4F3-seeklogo.com.png" \
    "https://www.kindpng.com/picc/m/775-7758644_jawa-motorcycles-logo-hd-png-download.png"

# GasGas (if not exists)
download_logo "GasGas" "gasgas.png" \
    "https://seeklogo.com/images/G/gas-gas-logo-9C9F9C8F1C-seeklogo.com.png" \
    "https://www.kindpng.com/picc/m/779-7799441_gas-gas-logo-png-transparent-png.png"

# Polaris
download_logo "Polaris" "polaris.png" \
    "https://seeklogo.com/images/P/polaris-logo-8F8E913F8C-seeklogo.com.png" \
    "https://www.kindpng.com/picc/m/229-2297438_polaris-industries-logo-hd-png-download.png"

# Bajaj
download_logo "Bajaj" "bajaj.png" \
    "https://seeklogo.com/images/B/bajaj-logo-01E6B7A6C0-seeklogo.com.png" \
    "https://www.kindpng.com/picc/m/237-2376906_bajaj-auto-logo-png-transparent-png.png"

# Hero
download_logo "Hero" "hero.png" \
    "https://seeklogo.com/images/H/hero-motocorp-logo-7CB2A2FD0B-seeklogo.com.png" \
    "https://www.kindpng.com/picc/m/237-2377316_hero-motocorp-logo-png-transparent-png.png"

# TVS
download_logo "TVS" "tvs.png" \
    "https://seeklogo.com/images/T/tvs-motor-logo-97DB543C4E-seeklogo.com.png" \
    "https://www.kindpng.com/picc/m/237-2377736_tvs-motor-company-logo-hd-png-download.png"

echo ""
echo "=========================================="
echo "📊 Final Status:"
echo ""

# Count high-res logos
total=$(ls *.png 2>/dev/null | wc -l)
highres=$(for f in *.png; do if [ -f "$f" ]; then width=$(identify -format "%w" "$f" 2>/dev/null); if [ "$width" -ge 512 ] 2>/dev/null; then echo 1; fi; fi; done | wc -l)

echo "Total logos: $total"
echo "High-resolution (512px+): $highres"
echo "Coverage: $(echo "scale=1; $highres*100/40" | bc)%"

# List recent additions
echo ""
echo "Recent additions:"
ls -lt *.png | head -5 | awk '{print "  - " $9}'