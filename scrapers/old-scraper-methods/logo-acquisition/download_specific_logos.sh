#!/bin/bash

# Download specific high-resolution motorcycle logos from known working URLs
# These URLs have been verified to work

cd /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands

echo "Downloading high-resolution motorcycle brand logos..."

# Yamaha - 1200px
curl -L -o yamaha.png "https://upload.wikimedia.org/wikipedia/commons/0/0f/Yamaha_logo.png"

# Kawasaki - Original high-res
curl -L -o kawasaki.png "https://upload.wikimedia.org/wikipedia/commons/5/5e/Kawasaki_Heavy_Industries_logo_2.png"

# Suzuki - 800px (1200px gives 404)
curl -L -o suzuki.png "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/800px-Suzuki_logo_2.svg.png"

# Ducati - Original PNG
curl -L -o ducati.png "https://upload.wikimedia.org/wikipedia/commons/9/9e/Ducati_red_logo_PNG.png"

# KTM - 800px
curl -L -o ktm.png "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/KTM-Sportmotorcycle_logo.svg/800px-KTM-Sportmotorcycle_logo.svg.png"

# Triumph - 800px
curl -L -o triumph.png "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Triumph_Motorcycles_logo.svg/800px-Triumph_Motorcycles_logo.svg.png"

# Aprilia - Already exists
if [ ! -f aprilia.png ]; then
    curl -L -o aprilia.png "https://upload.wikimedia.org/wikipedia/commons/4/47/Aprilia-logo.png"
fi

# MV Agusta - 800px
curl -L -o mv_agusta.png "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/MV-Agusta-Logo.svg/800px-MV-Agusta-Logo.svg.png"

# Moto Guzzi - 800px
curl -L -o moto_guzzi.png "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Moto_Guzzi_logo.svg/800px-Moto_Guzzi_logo.svg.png"

# Benelli - Already exists
if [ ! -f benelli.png ]; then
    curl -L -o benelli.png "https://upload.wikimedia.org/wikipedia/commons/2/20/Benelli_logo.png"
fi

# Bimota - Already exists
if [ ! -f bimota.png ]; then
    curl -L -o bimota.png "https://upload.wikimedia.org/wikipedia/commons/9/9f/Bimota_logo.png"
fi

# Husqvarna - 800px
curl -L -o husqvarna.png "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Husqvarna_Motorcycles_logo.svg/800px-Husqvarna_Motorcycles_logo.svg.png"

# Norton - 800px
curl -L -o norton.png "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Norton_Motorcycle_Company_logo.svg/800px-Norton_Motorcycle_Company_logo.svg.png"

# BSA - Already exists
if [ ! -f bsa.png ]; then
    curl -L -o bsa.png "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/BSA_motorcycles_logo.svg/800px-BSA_motorcycles_logo.svg.png"
fi

# Indian - Already exists
if [ ! -f indian.png ]; then
    curl -L -o indian.png "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Indian_Motorcycle_logo.svg/800px-Indian_Motorcycle_logo.svg.png"
fi

# Royal Enfield - Direct PNG
curl -L -o royal_enfield.png "https://upload.wikimedia.org/wikipedia/commons/c/c3/Royal-Enfield-Logo.png"

# Vespa - 800px
curl -L -o vespa.png "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Vespa_logo.svg/800px-Vespa_logo.svg.png"

# Piaggio - 800px
curl -L -o piaggio.png "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Piaggio_logo.svg/800px-Piaggio_logo.svg.png"

# Zero Motorcycles - Direct PNG
curl -L -o zero_motorcycles.png "https://upload.wikimedia.org/wikipedia/commons/c/c7/Zero_Motorcycles_logo.png"

# Can-Am - Direct PNG
curl -L -o can_am.png "https://upload.wikimedia.org/wikipedia/commons/5/57/Can-Am_logo.png"

# Bajaj - Direct PNG
curl -L -o bajaj.png "https://upload.wikimedia.org/wikipedia/commons/d/dd/Bajaj_Auto_Logo.png"

# Hero - 800px
curl -L -o hero.png "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Hero_MotoCorp_Logo.svg/800px-Hero_MotoCorp_Logo.svg.png"

# TVS - 800px
curl -L -o tvs.png "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/TVS_Motor_Company_Logo.svg/800px-TVS_Motor_Company_Logo.svg.png"

# Beta - Already exists
if [ ! -f beta.png ]; then
    curl -L -o beta.png "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Beta_logo.svg/800px-Beta_logo.svg.png"
fi

# Jawa - Already exists
if [ ! -f jawa.png ]; then
    curl -L -o jawa.png "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/JAWA_logo.svg/800px-JAWA_logo.svg.png"
fi

# Sherco - Already exists
if [ ! -f sherco.png ]; then
    curl -L -o sherco.png "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Sherco_logo.svg/800px-Sherco_logo.svg.png"
fi

# GasGas - Direct PNG
curl -L -o gasgas.png "https://upload.wikimedia.org/wikipedia/commons/3/33/Gas_Gas_logo.png"

# Ural - Direct PNG
curl -L -o ural.png "https://upload.wikimedia.org/wikipedia/commons/8/84/Ural_Motorcycles_logo.png"

# Polaris - 800px
curl -L -o polaris.png "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Polaris_Industries_logo.svg/800px-Polaris_Industries_logo.svg.png"

# KYMCO - Direct PNG
curl -L -o kymco.png "https://upload.wikimedia.org/wikipedia/commons/2/26/KYMCO_Logo.png"

# SYM - Direct PNG
curl -L -o sym.png "https://upload.wikimedia.org/wikipedia/commons/0/06/SYM_logo.png"

# CFMoto - Direct PNG
curl -L -o cfmoto.png "https://upload.wikimedia.org/wikipedia/commons/b/b6/CFMoto_logo.png"

# Hyosung - Direct PNG
curl -L -o hyosung.png "https://upload.wikimedia.org/wikipedia/commons/4/47/Hyosung_logo.png"

# Buell - 800px
curl -L -o buell.png "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Buell_logo.svg/800px-Buell_logo.svg.png"

# Victory - Direct PNG
curl -L -o victory.png "https://upload.wikimedia.org/wikipedia/commons/8/8a/Victory_Motorcycles_logo.png"

# Cagiva - Already exists
if [ ! -f cagiva.png ]; then
    curl -L -o cagiva.png "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Cagiva_logo.svg/800px-Cagiva_logo.svg.png"
fi

# Peugeot - Already exists
if [ ! -f peugeot.png ]; then
    curl -L -o peugeot.png "https://upload.wikimedia.org/wikipedia/commons/4/45/Peugeot_Logo.png"
fi

# Derbi - Already exists
if [ ! -f derbi.png ]; then
    curl -L -o derbi.png "https://upload.wikimedia.org/wikipedia/commons/0/02/Derbi_logo.png"
fi

echo ""
echo "Download complete! Checking results..."
echo ""

# Count total logos
total=$(ls *.png 2>/dev/null | wc -l)
echo "Total motorcycle brand logos: $total"

# Check for high-resolution logos
echo ""
echo "Checking image sizes..."
for logo in yamaha.png kawasaki.png suzuki.png ducati.png ktm.png triumph.png bmw.png honda.png harley_davidson.png; do
    if [ -f "$logo" ]; then
        size=$(identify -format "%wx%h" "$logo" 2>/dev/null || echo "unknown")
        echo "$logo: $size"
    fi
done