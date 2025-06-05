#!/bin/bash

cd /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands

echo "🎯 Getting Final Missing Logos"
echo "=============================="
echo ""

# Function to download and check
get_logo() {
    local brand=$1
    local filename=$2
    local url=$3
    
    echo "🔍 $brand..."
    
    if [ -f "$filename" ]; then
        echo "  ✓ Already have $filename"
        return 0
    fi
    
    echo "  Downloading from: $url"
    if curl -L -s -o "${filename}.temp" "$url"; then
        if file "${filename}.temp" | grep -E "(image|SVG)" > /dev/null; then
            mv "${filename}.temp" "$filename"
            size=$(identify -format "%wx%h" "$filename" 2>/dev/null || echo "SVG")
            echo "  ✅ Success! ($size)"
            return 0
        else
            rm -f "${filename}.temp"
            echo "  ❌ Not a valid image"
        fi
    else
        echo "  ❌ Download failed"
    fi
    return 1
}

# Try WorldVectorLogo
echo "🌐 Trying WorldVectorLogo..."
echo "----------------------------"

get_logo "Zero Motorcycles" "zero.svg" "https://worldvectorlogo.com/download/zero-motorcycles.svg"
get_logo "Bajaj" "bajaj.svg" "https://worldvectorlogo.com/download/bajaj.svg"
get_logo "GasGas" "gasgas.svg" "https://worldvectorlogo.com/download/gas-gas.svg"
get_logo "CFMoto" "cfmoto.svg" "https://worldvectorlogo.com/download/cfmoto.svg"
get_logo "Ural" "ural.svg" "https://worldvectorlogo.com/download/ural-motorcycles.svg"
get_logo "Sherco" "sherco.svg" "https://worldvectorlogo.com/download/sherco.svg"
get_logo "Jawa" "jawa.svg" "https://worldvectorlogo.com/download/jawa.svg"

echo ""
echo "🍷 Trying Logo.wine..."
echo "----------------------"

# Logo.wine direct links
get_logo "Zero" "zero_wine.png" "https://www.logo.wine/a/logo/Zero_Motorcycles/Zero_Motorcycles-Logo.wine.png"
get_logo "Bajaj" "bajaj_wine.png" "https://www.logo.wine/a/logo/Bajaj_Auto/Bajaj_Auto-Logo.wine.png"

echo ""
echo "Converting any SVG files to PNG..."
for svg in *.svg; do
    if [ -f "$svg" ]; then
        png="${svg%.svg}.png"
        if [ ! -f "$png" ]; then
            echo "  Converting $svg to PNG..."
            convert -background none -density 300 "$svg" -resize 1024x1024\> "$png" 2>/dev/null && \
            echo "    ✅ Converted to $png" || echo "    ❌ Conversion failed"
        fi
    fi
done

echo ""
echo "=============================="
echo "📊 Final Collection Status:"
echo ""

total=$(ls *.png 2>/dev/null | wc -l)
highres=$(for f in *.png; do if [ -f "$f" ]; then width=$(identify -format "%w" "$f" 2>/dev/null); if [ "$width" -ge 512 ] 2>/dev/null; then echo 1; fi; fi; done | wc -l)
ultrahigh=$(for f in *.png; do if [ -f "$f" ]; then width=$(identify -format "%w" "$f" 2>/dev/null); if [ "$width" -ge 1000 ] 2>/dev/null; then echo 1; fi; fi; done | wc -l)

echo "Total PNG logos: $total"
echo "High-resolution (512px+): $highres"
echo "Ultra high-res (1000px+): $ultrahigh"
echo "Coverage: $(echo "scale=1; $highres*100/40" | bc)%"

# List all 1024px logos
echo ""
echo "🌟 All 1024px Logos:"
echo "--------------------"
for f in *.png; do 
    if [ -f "$f" ]; then 
        dims=$(identify -format "%wx%h" "$f" 2>/dev/null)
        width=$(echo $dims | cut -d'x' -f1)
        if [ "$width" = "1024" ] 2>/dev/null; then 
            echo "  ✅ $f"
        fi
    fi
done