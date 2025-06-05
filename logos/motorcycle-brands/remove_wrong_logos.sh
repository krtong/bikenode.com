#!/bin/bash

# Script to remove confirmed wrong logos
echo "Removing incorrect logos..."

# List of confirmed wrong logos
WRONG_LOGOS=(
  "abc.png"          # ABC Radio
  "access.png"       # Access careers
  "abarth.png"       # Abarth cars
  "apollo.png"       # Sigma Computers
  "atlas.png"        # Atlas Beer
  "aurora.png"       # Aurora Group Inc
  "austin.png"       # Austin Quality food
  "ambassador.png"   # Aviation MBA newsletter
  "big.png"          # Generic BIG brand
  "baker.png"        # Baker Furniture
  "boom.png"         # Financial services
  "alldays.png"      # Beauty/cosmetics
  "alligator.png"    # Russian tech company
  "allstate.png"     # Insurance company
  "arco.png"         # Gas station/petroleum
  "ace.png"          # ACE hardware
  "adler.png"        # Adler fashion/clothing
  "amazonas.png"     # Amazonas state/flag
  "amc.png"          # AMC television network
  "apc.png"          # American Power Conversion
  "ariel.png"        # Cyrillic text, not British Ariel motorcycles
)

# Create backup directory
mkdir -p wrong_logos_backup

# Move wrong logos to backup
for logo in "${WRONG_LOGOS[@]}"; do
  if [ -f "$logo" ]; then
    echo "Moving $logo to backup..."
    mv "$logo" wrong_logos_backup/
  fi
done

echo "Done! Moved ${#WRONG_LOGOS[@]} wrong logos to wrong_logos_backup/"
echo "You can delete the backup directory once you've verified the removals."