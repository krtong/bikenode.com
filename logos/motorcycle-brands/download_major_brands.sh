#!/bin/bash
# Download major motorcycle brand logos

cd /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands

echo 'Downloading Harley-Davidson logo...'
curl -L -o 'harley_davidson.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Harley-Davidson_logo.svg/2048px-Harley-Davidson_logo.svg.png'

echo 'Downloading Honda logo...'
curl -L -o 'honda.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/2048px-Honda_Logo.svg.png'

echo 'Downloading Yamaha logo...'
curl -L -o 'yamaha.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Yamaha_Motor_logo.svg/2048px-Yamaha_Motor_logo.svg.png'

echo 'Downloading Kawasaki logo...'
curl -L -o 'kawasaki.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Kawasaki_Heavy_Industries_logo.svg/2048px-Kawasaki_Heavy_Industries_logo.svg.png'

echo 'Downloading Suzuki logo...'
curl -L -o 'suzuki.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/2048px-Suzuki_logo_2.svg.png'

echo 'Downloading BMW logo...'
curl -L -o 'bmw.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/2048px-BMW.svg.png'

echo 'Downloading Ducati logo...'
curl -L -o 'ducati.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ducati_logo.svg/2048px-Ducati_logo.svg.png'

echo 'Downloading KTM logo...'
curl -L -o 'ktm.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/KTM-Logo.svg/2048px-KTM-Logo.svg.png'

echo 'Downloading Triumph logo...'
curl -L -o 'triumph.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Triumph_logo.svg/2048px-Triumph_logo.svg.png'

echo 'Downloading Royal Enfield logo...'
curl -L -o 'royal_enfield.png' 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Royal_Enfield_logo.svg/2048px-Royal_Enfield_logo.svg.png'

