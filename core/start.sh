#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🚲  BikeNode.com Catalog Extraction  🚲${NC}"
echo -e "${BLUE}==========================================${NC}"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python 3 not found. Please install Python 3 and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}Select extraction mode:${NC}"
echo "1) Extract recent years (2020-2026)"
echo "2) Extract all years (2000-2026)"
echo "3) Extract by brand"
echo "4) Resume previous extraction"
echo "5) Analyze existing data only"
echo "6) Batch extraction (recommended for large datasets)"
echo "q) Quit"

read -p "Select option [1-6 or q]: " option

case $option in
    1)
        echo -e "${GREEN}Starting extraction for recent years (2020-2026)...${NC}"
        python3 bike_catalog_extractor.py --recent-only --extract-years
        ;;
    2)
        echo -e "${GREEN}Starting extraction for all years (2000-2026)...${NC}"
        python3 bike_catalog_extractor.py --extract-years
        ;;
    3)
        read -p "Enter brand names (comma-separated): " brands
        echo -e "${GREEN}Starting extraction for brands: $brands${NC}"
        python3 bike_catalog_extractor.py --extract-brands --brands "$brands" --recent-only
        ;;
    4)
        echo -e "${GREEN}Resuming previous extraction...${NC}"
        echo -e "${YELLOW}Select resume mode:${NC}"
        echo "1) By year"
        echo "2) By brand"
        read -p "Select option [1-2]: " resume_option
        
        if [ "$resume_option" = "1" ]; then
            python3 bike_catalog_extractor.py --extract-years
        else
            python3 bike_catalog_extractor.py --extract-brands
        fi
        ;;
    5)
        echo -e "${GREEN}Analyzing existing data...${NC}"
        python3 bike_catalog_extractor.py --analyze
        ;;
    6)
        echo -e "${GREEN}Starting batch extraction...${NC}"
        echo -e "${YELLOW}Select batch mode:${NC}"
        echo "1) By year"
        echo "2) By brand"
        read -p "Select option [1-2]: " batch_option
        
        read -p "Enter batch size [default: 5]: " batch_size
        batch_size=${batch_size:-5}
        
        if [ "$batch_option" = "1" ]; then
            python3 bike_catalog_extractor.py --batch-extract --batch-mode year --batch-size $batch_size
        else
            python3 bike_catalog_extractor.py --batch-extract --batch-mode brand --batch-size $batch_size
        fi
        ;;
    q|Q)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${YELLOW}Invalid option. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Extraction process completed!${NC}"