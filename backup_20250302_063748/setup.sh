#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🚲  BikeNode.com Scraper Setup  🚲${NC}"
echo -e "${BLUE}==========================================${NC}"

# Detect the platform
platform="unknown"
case "$(uname -s)" in
    Linux*)     platform="linux";;
    Darwin*)    platform="mac";;
    CYGWIN*|MINGW*|MSYS*) platform="windows";;
esac

echo -e "${BLUE}Detected platform: ${platform}${NC}"

# Check for Python installation
python_cmd=""
if command -v python3 &> /dev/null; then
    python_cmd="python3"
elif command -v python &> /dev/null; then
    python_cmd="python"
else
    echo -e "${RED}❌ Python not found. Please install Python 3 and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found Python: $($python_cmd --version)${NC}"

# Check if pip is available
if ! $python_cmd -m pip --version &> /dev/null; then
    echo -e "${RED}❌ pip not found. Please install pip and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found pip: $($python_cmd -m pip --version)${NC}"

# Check if we're in a virtual environment
in_venv=0
if [[ -n "$VIRTUAL_ENV" ]]; then
    echo -e "${GREEN}✅ Running in a virtual environment: $VIRTUAL_ENV${NC}"
    in_venv=1
elif [[ -n "$CONDA_PREFIX" ]]; then
    echo -e "${GREEN}✅ Running in a Conda environment: $CONDA_PREFIX${NC}"
    in_venv=1
else
    echo -e "${YELLOW}⚠️ Not running in a virtual environment.${NC}"
    
    # Ask if the user wants to create a virtual environment
    read -p "Would you like to create a virtual environment? (recommended) (y/n): " create_venv
    
    if [[ $create_venv == "y" || $create_venv == "Y" ]]; then
        # Check if venv module is available
        if ! $python_cmd -c "import venv" &> /dev/null; then
            echo -e "${RED}❌ venv module not found. Please install it and try again.${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}Creating virtual environment...${NC}"
        $python_cmd -m venv .venv
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to create virtual environment. Please try manually:${NC}"
            echo "$python_cmd -m venv .venv"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Virtual environment created.${NC}"
        echo -e "${BLUE}Activating virtual environment...${NC}"
        
        # Activate the virtual environment
        case "$platform" in
            linux|mac)
                source .venv/bin/activate
                ;;
            windows)
                source .venv/Scripts/activate
                ;;
        esac
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to activate virtual environment. Please try manually:${NC}"
            case "$platform" in
                linux|mac)
                    echo "source .venv/bin/activate"
                    ;;
                windows)
                    echo "source .venv/Scripts/activate"
                    ;;
            esac
            exit 1
        fi
        
        echo -e "${GREEN}✅ Virtual environment activated.${NC}"
        in_venv=1
    else
        echo -e "${YELLOW}⚠️ Continuing without virtual environment. Installing packages globally.${NC}"
    fi
fi

# Install required packages
echo -e "\n${BLUE}Installing required packages...${NC}"

if [[ $platform == "mac" && $in_venv -eq 0 ]]; then
    echo -e "${YELLOW}⚠️ Installing packages globally on macOS might require --user flag${NC}"
    $python_cmd -m pip install --user -r requirements.txt
else
    $python_cmd -m pip install -r requirements.txt
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install required packages. Please try manually:${NC}"
    echo "$python_cmd -m pip install -r requirements.txt"
    exit 1
fi

echo -e "${GREEN}✅ All packages installed successfully!${NC}"

# Check Chrome/Chromium installation
echo -e "${BLUE}Checking browser installation...${NC}"
if command -v google-chrome &>/dev/null || command -v chromium-browser &>/dev/null; then
    echo -e "${GREEN}✅ Chrome/Chromium found.${NC}"
else
    echo -e "${YELLOW}⚠️ Warning: Chrome or Chromium not found. Please install Chrome/Chromium browser.${NC}"
fi

# Create necessary directories
echo -e "\n${BLUE}Creating necessary directories...${NC}"
mkdir -p exports debug_output challenge_reports

# Fix any script permissions if on Linux/Mac
if [[ $platform == "linux" || $platform == "mac" ]]; then
    echo -e "\n${BLUE}Setting executable permissions on scripts...${NC}"
    chmod +x *.py *.sh
fi

echo -e "\n${GREEN}✅ Setup completed successfully!${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}To run the scraper:${NC}"
echo -e "  ${GREEN}./start.sh${NC}"
echo -e "  ${GREEN}or${NC}"
echo -e "  ${GREEN}$python_cmd run_scraper.py${NC}"
echo -e "${BLUE}==========================================${NC}"
