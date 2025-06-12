#!/bin/bash

cd /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands

echo "🎯 Getting missing priority brand logos"
echo "======================================="

# Ducati - Try multiple sources
echo "📍 Ducati..."
curl -L -s -o ducati_temp.png "https://logos-world.net/wp-content/uploads/2020/12/Ducati-Logo.png" && \
mv ducati_temp.png ducati.png && echo "  ✅ Got Ducati from logos-world.net"

# Norton - Try alternative
echo "📍 Norton..."  
curl -L -s -o norton_temp.png "https://1000logos.net/wp-content/uploads/2021/04/Norton-logo.png" && \
mv norton_temp.png norton.png && echo "  ✅ Got Norton from 1000logos.net"

# Indian Motorcycle
echo "📍 Indian..."
curl -L -s -o indian_temp.png "https://logos-world.net/wp-content/uploads/2020/12/Indian-Motorcycle-Logo.png" && \
mv indian_temp.png indian.png && echo "  ✅ Got Indian from logos-world.net"

# MV Agusta
echo "📍 MV Agusta..."
curl -L -s -o mv_agusta_temp.png "https://logos-world.net/wp-content/uploads/2020/11/MV-Agusta-Symbol.png" && \
mv mv_agusta_temp.png mv_agusta.png && echo "  ✅ Got MV Agusta from logos-world.net"

# Zero Motorcycles
echo "📍 Zero Motorcycles..."
curl -L -s -o zero_temp.png "https://zeromotorcycles.com/media/wysiwyg/zero-motorcycles-logo-vector.png" && \
mv zero_temp.png zero.png && echo "  ✅ Got Zero from official site"

# Benelli
echo "📍 Benelli..."
curl -L -s -o benelli_temp.png "https://logos-world.net/wp-content/uploads/2020/11/Benelli-Logo.png" && \
mv benelli_temp.png benelli.png && echo "  ✅ Got Benelli from logos-world.net"

# Bimota
echo "📍 Bimota..."
curl -L -s -o bimota_temp.png "https://1000logos.net/wp-content/uploads/2021/04/Bimota-logo.png" && \
mv bimota_temp.png bimota.png && echo "  ✅ Got Bimota from 1000logos.net"

# Cagiva
echo "📍 Cagiva..."
curl -L -s -o cagiva_temp.png "https://logos-world.net/wp-content/uploads/2020/11/Cagiva-Logo.png" && \
mv cagiva_temp.png cagiva.png && echo "  ✅ Got Cagiva from logos-world.net"

# Sherco
echo "📍 Sherco..."
curl -L -s -o sherco_temp.png "https://www.sherco.com/sites/all/themes/sherco/logo.png" && \
mv sherco_temp.png sherco.png && echo "  ✅ Got Sherco from official site"

# Jawa
echo "📍 Jawa..."
curl -L -s -o jawa_temp.png "https://logos-world.net/wp-content/uploads/2020/11/Jawa-Logo.png" && \
mv jawa_temp.png jawa.png && echo "  ✅ Got Jawa from logos-world.net"

echo ""
echo "🔍 Checking downloaded logos..."
for logo in ducati.png norton.png indian.png mv_agusta.png zero.png benelli.png bimota.png cagiva.png sherco.png jawa.png; do
    if [ -f "$logo" ]; then
        # Check if it's a valid image
        if file "$logo" | grep -q "image data"; then
            size=$(identify -format "%wx%h" "$logo" 2>/dev/null || echo "unknown")
            echo "  ✅ $logo: $size"
        else
            echo "  ❌ $logo: Invalid image, removing"
            rm -f "$logo"
        fi
    else
        echo "  ❌ $logo: Not downloaded"
    fi
done

echo ""
echo "📊 Summary:"
total_high_res=$(for logo in *.png; do if [ -f "$logo" ]; then size=$(identify -format "%wx%h" "$logo" 2>/dev/null); width=$(echo $size | cut -d'x' -f1); if [ "$width" -ge 512 ] 2>/dev/null; then echo 1; fi; fi; done | wc -l)
total_logos=$(ls *.png 2>/dev/null | wc -l)
echo "  High-resolution logos (512px+): $total_high_res"
echo "  Total logos: $total_logos"