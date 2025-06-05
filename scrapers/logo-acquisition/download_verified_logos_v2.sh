#!/bin/bash

# Download verified high-resolution motorcycle logos
# These URLs have been manually verified to work

cd /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands

echo "🏍️  Downloading High-Resolution Motorcycle Logos"
echo "=============================================="
echo ""

# Function to download and verify
download_logo() {
    local brand=$1
    local url=$2
    local filename=$3
    
    echo -n "Downloading $brand... "
    
    # Download with curl
    if curl -L -s -o "$filename" "$url"; then
        # Check if it's a valid image
        if file "$filename" | grep -q "image data"; then
            # Get dimensions if possible
            dims=$(identify -format "%wx%h" "$filename" 2>/dev/null || echo "unknown")
            echo "✅ Success! ($dims)"
            return 0
        else
            # Not an image, remove it
            rm -f "$filename"
            echo "❌ Failed (not an image)"
            return 1
        fi
    else
        echo "❌ Failed (download error)"
        return 1
    fi
}

# Japanese Big 4
echo "🇯🇵 Japanese Brands:"
echo "-------------------"
download_logo "Yamaha" "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Yamaha_Motor_2025.svg/800px-Yamaha_Motor_2025.svg.png" "yamaha.png"
download_logo "Honda" "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/1000px-Honda.svg.png" "honda_new.png"
download_logo "Kawasaki" "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Kawasaki_Heavy_Industries_logo_2.svg/800px-Kawasaki_Heavy_Industries_logo_2.svg.png" "kawasaki.png"
download_logo "Suzuki" "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Suzuki_logo_2025.svg/800px-Suzuki_logo_2025.svg.png" "suzuki.png"

echo ""
echo "🇮🇹 Italian Brands:"
echo "------------------"
download_logo "Ducati" "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Ducati_logo.svg/800px-Ducati_logo.svg.png" "ducati.png"
download_logo "Aprilia" "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Aprilia_logo.svg/800px-Aprilia_logo.svg.png" "aprilia.png"
download_logo "MV Agusta" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/MV_Agusta_logo.svg/800px-MV_Agusta_logo.svg.png" "mv_agusta.png"
download_logo "Moto Guzzi" "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Moto_Guzzi_logo_%28green%29.svg/800px-Moto_Guzzi_logo_%28green%29.svg.png" "moto_guzzi.png"
download_logo "Benelli" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Benelli_Q.J._logo.svg/800px-Benelli_Q.J._logo.svg.png" "benelli.png"
download_logo "Bimota" "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Logo_della_Bimota.svg/800px-Logo_della_Bimota.svg.png" "bimota.png"

echo ""
echo "🇦🇹🇩🇪 Austrian/German Brands:"
echo "-----------------------------"
download_logo "KTM" "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/KTM_AG_logo.svg/800px-KTM_AG_logo.svg.png" "ktm.png"
download_logo "Husqvarna" "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Husqvarna_logo.svg/800px-Husqvarna_logo.svg.png" "husqvarna.png"
download_logo "BMW" "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/1000px-BMW.svg.png" "bmw_new.png"
download_logo "GasGas" "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/GasGas-logo.svg/800px-GasGas-logo.svg.png" "gasgas.png"

echo ""
echo "🇬🇧 British Brands:"
echo "------------------"
download_logo "Triumph" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Triumph_Engineering_logo.svg/800px-Triumph_Engineering_logo.svg.png" "triumph.png"
download_logo "Norton" "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Norton_Motorcycles_logo.svg/800px-Norton_Motorcycles_logo.svg.png" "norton.png"
download_logo "BSA" "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Birmingham_Small_Arms_Company_logo.svg/800px-Birmingham_Small_Arms_Company_logo.svg.png" "bsa.png"
download_logo "Royal Enfield" "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Royal_Enfield_logo.svg/800px-Royal_Enfield_logo.svg.png" "royal_enfield.png"

echo ""
echo "🇺🇸 American Brands:"
echo "-------------------"
download_logo "Indian" "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Indian_Motorcycle_logo.svg/800px-Indian_Motorcycle_logo.svg.png" "indian.png"
download_logo "Victory" "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Victory_Motorcycles_logo.svg/800px-Victory_Motorcycles_logo.svg.png" "victory.png"
download_logo "Buell" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Logo_Buell.svg/800px-Logo_Buell.svg.png" "buell.png"
download_logo "Zero" "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Zero_Motorcycles_logo.svg/800px-Zero_Motorcycles_logo.svg.png" "zero.png"

echo ""
echo "🛵 Scooter/Other Brands:"
echo "------------------------"
download_logo "Vespa" "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Vespa_logo.svg/800px-Vespa_logo.svg.png" "vespa.png"
download_logo "Piaggio" "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Piaggio_Group_logo.svg/800px-Piaggio_Group_logo.svg.png" "piaggio.png"
download_logo "Can-Am" "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Can-Am_logo.svg/800px-Can-Am_logo.svg.png" "can_am.png"
download_logo "Polaris" "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Polaris_Inc._logo.svg/800px-Polaris_Inc._logo.svg.png" "polaris.png"

echo ""
echo "🌏 Asian Brands:"
echo "----------------"
download_logo "Bajaj" "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Bajaj_logo.svg/800px-Bajaj_logo.svg.png" "bajaj.png"
download_logo "Hero" "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Hero_MotoCorp_Logo.svg/800px-Hero_MotoCorp_Logo.svg.png" "hero.png"
download_logo "TVS" "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/TVS_logo.svg/800px-TVS_logo.svg.png" "tvs.png"
download_logo "KYMCO" "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/KYMCO_logo.svg/800px-KYMCO_logo.svg.png" "kymco.png"
download_logo "SYM" "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/SYM_logo.svg/800px-SYM_logo.svg.png" "sym.png"
download_logo "CFMoto" "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/CF_Moto_logo.svg/800px-CF_Moto_logo.svg.png" "cfmoto.png"

echo ""
echo "🏍️ Off-road/Enduro Brands:"
echo "---------------------------"
download_logo "Beta" "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Beta_logo_%28motorcycles%29.svg/800px-Beta_logo_%28motorcycles%29.svg.png" "beta.png"
download_logo "Sherco" "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Sherco_logo.svg/800px-Sherco_logo.svg.png" "sherco.png"
download_logo "Jawa" "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Logo_JAWA.svg/800px-Logo_JAWA.svg.png" "jawa.png"
download_logo "Cagiva" "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Cagiva_logo.svg/800px-Cagiva_logo.svg.png" "cagiva.png"
download_logo "Peugeot" "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Peugeot_1960_logo.svg/800px-Peugeot_1960_logo.svg.png" "peugeot.png"
download_logo "Derbi" "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Derbi_logo.svg/800px-Derbi_logo.svg.png" "derbi.png"

echo ""
echo "=============================================="
echo "📊 Download Summary:"
echo ""

# Count total logos
total=$(ls *.png 2>/dev/null | wc -l)
echo "Total motorcycle brand logos: $total"

# Show recently downloaded high-res logos
echo ""
echo "Recently downloaded (last 10):"
ls -lt *.png 2>/dev/null | head -10 | awk '{print "  " $9}'

echo ""
echo "✅ Download complete!"