#!/bin/bash
# Download motorcycle logos from Wikipedia

cd /Users/kevintong/Documents/Code/bikenode.com/logos/motorcycle-brands

# Known good Wikipedia logos
echo 'Downloading Aprilia...'
curl -L -o 'aprilia.png' 'https://upload.wikimedia.org/wikipedia/commons/4/47/Aprilia-logo.png'

echo 'Downloading Benelli...'
curl -L -o 'benelli.png' 'https://upload.wikimedia.org/wikipedia/commons/2/20/Benelli_logo.png'

echo 'Downloading Bimota...'
curl -L -o 'bimota.png' 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Bimota_logo.png'

echo 'Downloading Can-Am...'
curl -L -o 'can_am.png' 'https://upload.wikimedia.org/wikipedia/commons/5/57/Can-Am_logo.png'

echo 'Downloading CFMoto...'
curl -L -o 'cfmoto.png' 'https://upload.wikimedia.org/wikipedia/commons/b/b6/CFMoto_logo.png'

echo 'Downloading Derbi...'
curl -L -o 'derbi.png' 'https://upload.wikimedia.org/wikipedia/commons/0/02/Derbi_logo.png'

echo 'Downloading GAS GAS...'
curl -L -o 'gas_gas.png' 'https://upload.wikimedia.org/wikipedia/commons/3/33/Gas_Gas_logo.png'

echo 'Downloading Husaberg...'
curl -L -o 'husaberg.png' 'https://upload.wikimedia.org/wikipedia/commons/8/89/Husaberg_logo.png'

echo 'Downloading Hyosung...'
curl -L -o 'hyosung.png' 'https://upload.wikimedia.org/wikipedia/commons/4/47/Hyosung_logo.png'

echo 'Downloading Kymco...'
curl -L -o 'kymco.png' 'https://upload.wikimedia.org/wikipedia/commons/2/26/KYMCO_Logo.png'

echo 'Downloading Laverda...'
curl -L -o 'laverda.png' 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Laverda_logo.png'

echo 'Downloading Malaguti...'
curl -L -o 'malaguti.png' 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Malaguti_logo.png'

echo 'Downloading Moto Morini...'
curl -L -o 'moto_morini.png' 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Moto_Morini_logo.png'

echo 'Downloading Peugeot...'
curl -L -o 'peugeot.png' 'https://upload.wikimedia.org/wikipedia/commons/4/45/Peugeot_Logo.png'

echo 'Downloading SYM...'
curl -L -o 'sym.png' 'https://upload.wikimedia.org/wikipedia/commons/0/06/SYM_logo.png'

echo 'Downloading SWM...'
curl -L -o 'swm.png' 'https://upload.wikimedia.org/wikipedia/commons/9/92/SWM_Motorcycles_logo.png'

echo 'Downloading TM Racing...'
curl -L -o 'tm_racing.png' 'https://upload.wikimedia.org/wikipedia/commons/c/cf/TM_Racing_logo.png'

echo 'Downloading Ural...'
curl -L -o 'ural.png' 'https://upload.wikimedia.org/wikipedia/commons/8/84/Ural_Motorcycles_logo.png'

echo 'Downloading Victory...'
curl -L -o 'victory.png' 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Victory_Motorcycles_logo.png'

echo 'Downloading Zero Motorcycles...'
curl -L -o 'zero_motorcycles.png' 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Zero_Motorcycles_logo.png'


echo 'Downloads complete!'
ls -la *.png | wc -l
echo 'PNG files downloaded'
