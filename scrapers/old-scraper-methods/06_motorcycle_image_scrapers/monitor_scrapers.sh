#!/bin/bash

# Motorcycle Image Scraper Monitoring Script
# Usage: ./monitor_scrapers.sh [watch|status|restart]

SCRAPER_DIR="/Users/kevintong/Documents/Code/bikenode.com/scrapers/06_motorcycle_image_scrapers"
LOG_DIR="$SCRAPER_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a scraper is running
check_scraper() {
    local pattern=$1
    local name=$2
    
    if pgrep -f "$pattern" > /dev/null; then
        echo -e "${GREEN}✅ $name is running${NC}"
        local pid=$(pgrep -f "$pattern")
        local cpu=$(ps -p $pid -o %cpu --no-headers)
        local mem=$(ps -p $pid -o %mem --no-headers)
        echo -e "   PID: $pid | CPU: ${cpu}% | Memory: ${mem}%"
    else
        echo -e "${RED}❌ $name is not running${NC}"
    fi
}

# Function to show status
show_status() {
    echo -e "${BLUE}🚀 MOTORCYCLE SCRAPER STATUS${NC}"
    echo "=================================="
    echo "📅 $(date)"
    echo ""
    
    # Check each scraper
    check_scraper "06_motorcycle_image_scraper.js" "Generic Motorcycle Scraper"
    check_scraper "honda_official_scraper.js" "Honda Official Scraper"
    check_scraper "yamaha_official_scraper.js" "Yamaha Official Scraper"
    check_scraper "suzuki_official_scraper.js" "Suzuki Official Scraper"
    
    echo ""
    echo -e "${YELLOW}📊 Quick Stats:${NC}"
    
    # Image count
    local image_count=$(find /Users/kevintong/Documents/Code/bikenode.com/images/motorcycles -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" 2>/dev/null | wc -l)
    echo "   📸 Total Images: $(echo $image_count | tr -d ' ')"
    
    # Recent activity (last hour)
    local recent_count=$(find /Users/kevintong/Documents/Code/bikenode.com/images/motorcycles -name "*.jpg" -newermt "1 hour ago" 2>/dev/null | wc -l)
    echo "   🔥 New Images (last hour): $(echo $recent_count | tr -d ' ')"
    
    # Progress from main scraper
    if [ -f "$SCRAPER_DIR/data/progress/motorcycle_scraper_progress.json" ]; then
        local processed=$(grep -o '"processed":[0-9]*' "$SCRAPER_DIR/data/progress/motorcycle_scraper_progress.json" | cut -d: -f2)
        local downloaded=$(grep -o '"downloaded":[0-9]*' "$SCRAPER_DIR/data/progress/motorcycle_scraper_progress.json" | cut -d: -f2)
        echo "   📈 Main Scraper Progress: $processed processed, $downloaded downloaded"
    fi
}

# Function to start scrapers
start_scrapers() {
    echo -e "${BLUE}🚀 Starting all scrapers...${NC}"
    
    cd "$SCRAPER_DIR"
    
    # Create logs directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Start main scraper if not running
    if ! pgrep -f "06_motorcycle_image_scraper.js" > /dev/null; then
        echo "Starting Generic Motorcycle Scraper..."
        nohup node scrapers/generic/06_motorcycle_image_scraper.js > logs/main_scraper.log 2>&1 &
        sleep 2
    fi
    
    # Start Honda scraper if not running
    if ! pgrep -f "honda_official_scraper.js" > /dev/null; then
        echo "Starting Honda Official Scraper..."
        nohup node scrapers/manufacturer_specific/honda/honda_official_scraper.js > logs/honda_scraper.log 2>&1 &
        sleep 2
    fi
    
    # Start Yamaha scraper if not running  
    if ! pgrep -f "yamaha_official_scraper.js" > /dev/null; then
        echo "Starting Yamaha Official Scraper..."
        nohup node scrapers/manufacturer_specific/yamaha/yamaha_official_scraper.js > logs/yamaha_scraper.log 2>&1 &
        sleep 2
    fi
    
    # Start Suzuki scraper if not running
    if ! pgrep -f "suzuki_official_scraper.js" > /dev/null; then
        echo "Starting Suzuki Official Scraper..."
        nohup node scrapers/manufacturer_specific/suzuki/suzuki_official_scraper.js > logs/suzuki_scraper.log 2>&1 &
        sleep 2
    fi
    
    echo -e "${GREEN}✅ Startup complete!${NC}"
}

# Function to stop all scrapers
stop_scrapers() {
    echo -e "${YELLOW}🛑 Stopping all scrapers...${NC}"
    
    pkill -f "06_motorcycle_image_scraper.js"
    pkill -f "honda_official_scraper.js"
    pkill -f "yamaha_official_scraper.js"
    pkill -f "suzuki_official_scraper.js"
    
    sleep 3
    echo -e "${GREEN}✅ All scrapers stopped${NC}"
}

# Function to watch continuously
watch_scrapers() {
    echo -e "${BLUE}🔄 Starting continuous monitoring (Ctrl+C to stop)...${NC}"
    echo ""
    
    while true; do
        clear
        show_status
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}"
        sleep 30
    done
}

# Function to show recent logs
show_logs() {
    local scraper=$1
    local lines=${2:-20}
    
    case $scraper in
        "main"|"generic")
            echo -e "${BLUE}📋 Main Scraper Log (last $lines lines):${NC}"
            tail -n $lines "$LOG_DIR/main_scraper.log" 2>/dev/null || echo "Log file not found"
            ;;
        "honda")
            echo -e "${BLUE}📋 Honda Scraper Log (last $lines lines):${NC}"
            tail -n $lines "$LOG_DIR/honda_scraper.log" 2>/dev/null || echo "Log file not found"
            ;;
        "yamaha")
            echo -e "${BLUE}📋 Yamaha Scraper Log (last $lines lines):${NC}"
            tail -n $lines "$LOG_DIR/yamaha_scraper.log" 2>/dev/null || echo "Log file not found"
            ;;
        "suzuki")
            echo -e "${BLUE}📋 Suzuki Scraper Log (last $lines lines):${NC}"
            tail -n $lines "$LOG_DIR/suzuki_scraper.log" 2>/dev/null || echo "Log file not found"
            ;;
        *)
            echo "Available log options: main, honda, yamaha, suzuki"
            ;;
    esac
}

# Main script logic
case ${1:-status} in
    "status")
        show_status
        ;;
    "start")
        start_scrapers
        show_status
        ;;
    "stop")
        stop_scrapers
        ;;
    "restart")
        stop_scrapers
        sleep 3
        start_scrapers
        show_status
        ;;
    "watch")
        watch_scrapers
        ;;
    "logs")
        show_logs $2 $3
        ;;
    "full")
        cd "$SCRAPER_DIR"
        node utilities/scraper_status_monitor.js
        ;;
    *)
        echo "Motorcycle Scraper Monitor"
        echo "=========================="
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  status   - Show current status (default)"
        echo "  start    - Start all scrapers"
        echo "  stop     - Stop all scrapers"
        echo "  restart  - Restart all scrapers"
        echo "  watch    - Continuous monitoring"
        echo "  logs     - Show recent logs (e.g., logs main 50)"
        echo "  full     - Run detailed analysis report"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 watch"
        echo "  $0 logs honda 30"
        echo "  $0 full"
        ;;
esac
