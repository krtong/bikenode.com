#!/bin/bash
# Download verified motorcycle brand logos

cd /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands

# Remove failed downloads
rm -f ducati.png kawasaki.png ktm.png royal_enfield.png suzuki.png triumph.png yamaha.png

echo "Downloading verified logos..."

# Aprilia
curl -L -o 'aprilia.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Aprilia-logo.png/440px-Aprilia-logo.png'

# Ducati (correct URL)
curl -L -o 'ducati.png' 'https://upload.wikimedia.org/wikipedia/en/thumb/3/36/Ducati_Corse_logo.png/300px-Ducati_Corse_logo.png'

# Kawasaki
curl -L -o 'kawasaki.png' 'https://upload.wikimedia.org/wikipedia/commons/2/21/Kawasaki_motorcycles_logo.png'

# KTM
curl -L -o 'ktm.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/KTM-Sportmotorcycle_logo.svg/440px-KTM-Sportmotorcycle_logo.svg.png'

# Suzuki
curl -L -o 'suzuki.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/440px-Suzuki_logo_2.svg.png'

# Yamaha
curl -L -o 'yamaha.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Yamaha_Motor_logo.svg/440px-Yamaha_Motor_logo.svg.png'

# Triumph
curl -L -o 'triumph.png' 'https://upload.wikimedia.org/wikipedia/en/a/a5/Triumph_Motorcycles_logo.png'

# Royal Enfield
curl -L -o 'royal_enfield.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Royal-Enfield-Logo.png/440px-Royal-Enfield-Logo.png'

# Indian
curl -L -o 'indian.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Indian_Motorcycle_logo.svg/440px-Indian_Motorcycle_logo.svg.png'

# Moto Guzzi
curl -L -o 'moto_guzzi.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Moto_Guzzi_logo.svg/440px-Moto_Guzzi_logo.svg.png'

# MV Agusta
curl -L -o 'mv_agusta.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/MV-Agusta-Logo.svg/440px-MV-Agusta-Logo.svg.png'

# Husqvarna
curl -L -o 'husqvarna.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Husqvarna_Motorcycles_logo.svg/440px-Husqvarna_Motorcycles_logo.svg.png'

# Benelli
curl -L -o 'benelli.png' 'https://upload.wikimedia.org/wikipedia/commons/2/20/Benelli_logo.png'

# Can-Am
curl -L -o 'can_am.png' 'https://upload.wikimedia.org/wikipedia/commons/5/57/Can-Am_logo.png'

# Bajaj
curl -L -o 'bajaj.png' 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Bajaj_Auto_Logo.png'

# Hero
curl -L -o 'hero.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Hero_MotoCorp_Logo.svg/440px-Hero_MotoCorp_Logo.svg.png'

# TVS
curl -L -o 'tvs.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/TVS_Motor_Company_Logo.svg/440px-TVS_Motor_Company_Logo.svg.png'

# Zero Motorcycles
curl -L -o 'zero.png' 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Zero_Motorcycles_logo.png'

# Piaggio (Vespa parent)
curl -L -o 'piaggio.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Piaggio_logo.svg/440px-Piaggio_logo.svg.png'

# Vespa
curl -L -o 'vespa.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Vespa_logo.svg/440px-Vespa_logo.svg.png'

echo "Download complete. Checking results..."
ls -la *.png | wc -l
echo "PNG files found"