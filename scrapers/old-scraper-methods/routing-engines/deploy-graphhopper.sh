#!/bin/bash

# GraphHopper Deployment Script
# Automates the setup of GraphHopper with custom profiles

set -e  # Exit on error

# Configuration
GH_VERSION="8.0"
DATA_DIR="/opt/graphhopper/data"
CONFIG_DIR="/opt/graphhopper/config"
PROFILES_DIR="/opt/graphhopper/profiles"
CACHE_DIR="/opt/graphhopper/cache"
REGION_URL="https://download.geofabrik.de/north-america/us/california-latest.osm.pbf"
REGION_NAME="california-latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Java
    if ! command -v java &> /dev/null; then
        log_error "Java not found. Installing OpenJDK 11..."
        sudo apt update && sudo apt install -y openjdk-11-jdk
    else
        java_version=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
        log_info "Java version: $java_version"
    fi
    
    # Check RAM
    total_ram=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 8 ]; then
        log_warn "System has less than 8GB RAM. Large regions may fail."
    fi
    
    # Check disk space
    available_space=$(df -BG /opt | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 50 ]; then
        log_error "Less than 50GB free space. Aborting."
        exit 1
    fi
    
    log_info "System requirements check passed."
}

setup_directories() {
    log_info "Setting up directory structure..."
    
    sudo mkdir -p $DATA_DIR
    sudo mkdir -p $CONFIG_DIR
    sudo mkdir -p $PROFILES_DIR
    sudo mkdir -p $CACHE_DIR
    sudo mkdir -p /opt/graphhopper/logs
    
    # Set permissions
    sudo chown -R $USER:$USER /opt/graphhopper
    
    log_info "Directories created."
}

download_graphhopper() {
    log_info "Downloading GraphHopper..."
    
    cd /opt/graphhopper
    
    if [ ! -f "graphhopper-web-${GH_VERSION}.jar" ]; then
        wget https://github.com/graphhopper/graphhopper/releases/download/${GH_VERSION}/graphhopper-web-${GH_VERSION}.jar
    else
        log_warn "GraphHopper JAR already exists. Skipping download."
    fi
    
    log_info "GraphHopper downloaded."
}

download_osm_data() {
    log_info "Downloading OSM data..."
    
    if [ -f "$DATA_DIR/$REGION_NAME.osm.pbf" ]; then
        log_warn "OSM data already exists. Skipping download."
        return
    fi
    
    wget -P $DATA_DIR/ $REGION_URL
    log_info "OSM data downloaded."
}

create_config() {
    log_info "Creating GraphHopper configuration..."
    
    cat > $CONFIG_DIR/config.yml << 'EOF'
graphhopper:
  # Data
  datareader.file: ""  # Set via command line
  graph.location: graph-cache
  
  # Elevation
  graph.elevation.provider: cgiar
  graph.elevation.cache_dir: ./elevation-cache/
  graph.elevation.dataaccess: MMAP
  
  # Profiles
  profiles:
    - name: car
      vehicle: car
      weighting: shortest
      turn_costs: true
      
    - name: car_no_highway
      vehicle: car
      weighting: custom
      turn_costs: true
      custom_model_files: [car_no_highway.json]
      
    - name: motorcycle
      vehicle: motorcycle
      weighting: custom
      turn_costs: true
      custom_model_files: [motorcycle.json]
      
    - name: bike
      vehicle: bike
      weighting: custom
      turn_costs: false
      custom_model_files: [bike.json]
      
    - name: mtb
      vehicle: mtb
      weighting: custom
      turn_costs: false
      custom_model_files: [mtb.json]
      
    - name: racingbike
      vehicle: racingbike
      weighting: fastest
      turn_costs: false
      
    - name: foot
      vehicle: foot
      weighting: shortest
      turn_costs: false
      
    - name: hike
      vehicle: hike
      weighting: shortest
      turn_costs: false

  # Speed up queries
  profiles_ch:
    - profile: car
    - profile: bike
    - profile: foot

  profiles_lm:
    - profile: car_no_highway
    - profile: motorcycle
    - profile: mtb

  # Routing
  routing:
    non_ch.max_waypoint_distance: 1000000
    ch.disabling_allowed: true
    lm.disabling_allowed: true
    max_visited_nodes: 1000000
    max_round_trip_distance: 1000000
    
  # Server
  server:
    application_root: /
    bind_host: 0.0.0.0
    port: 8989
    
  # Import
  import.osm.ignored_highways: ""
  import.osm.max_read_threads: 2
  graph.encoded_values: surface,smoothness,max_speed,road_class,road_environment,road_access,toll,track_type,hazmat,hazmat_water
  
  # Storage
  graph.dataaccess: MMAP
  
  # Logging
  logging.level: INFO
EOF

    log_info "Configuration created."
}

copy_profiles() {
    log_info "Copying custom profiles..."
    
    # Copy profiles from the current directory if they exist
    if [ -d "profiles" ]; then
        cp profiles/*.json $PROFILES_DIR/
    else
        log_warn "No profiles directory found. Creating default profiles..."
        
        # Create default profiles
        cat > $PROFILES_DIR/car_no_highway.json << 'EOF'
{
  "priority": [
    {"if": "road_class == MOTORWAY", "multiply_by": 0.1},
    {"if": "road_class == TRUNK", "multiply_by": 0.2},
    {"if": "road_class == PRIMARY", "multiply_by": 0.8},
    {"if": "toll == true", "multiply_by": 0.5}
  ],
  "speed": [
    {"if": "road_class == MOTORWAY", "limit_to": 30},
    {"if": "road_class == TRUNK", "limit_to": 40}
  ]
}
EOF

        cat > $PROFILES_DIR/motorcycle.json << 'EOF'
{
  "priority": [
    {"if": "surface == gravel || surface == dirt", "multiply_by": 0.7},
    {"if": "road_class == TRACK", "multiply_by": 0.5}
  ],
  "speed": [
    {"if": "surface == asphalt", "multiply_by": 1.0},
    {"else_if": "surface == gravel", "multiply_by": 0.7}
  ]
}
EOF

        cat > $PROFILES_DIR/bike.json << 'EOF'
{
  "priority": [
    {"if": "road_class == CYCLEWAY", "multiply_by": 1.2},
    {"if": "road_class == TRUNK || road_class == MOTORWAY", "multiply_by": 0}
  ],
  "speed": [
    {"if": "surface == asphalt", "limit_to": 25},
    {"else_if": "surface == gravel", "limit_to": 18}
  ]
}
EOF

        cat > $PROFILES_DIR/mtb.json << 'EOF'
{
  "priority": [
    {"if": "road_class == TRACK", "multiply_by": 1.3},
    {"if": "surface == dirt || surface == gravel", "multiply_by": 1.1}
  ],
  "speed": [
    {"if": "surface == asphalt", "limit_to": 30},
    {"else_if": "surface == dirt", "limit_to": 18}
  ]
}
EOF
    fi
    
    log_info "Profiles copied."
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    sudo tee /etc/systemd/system/graphhopper.service > /dev/null << EOF
[Unit]
Description=GraphHopper Routing Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/graphhopper
ExecStart=/usr/bin/java -Xmx4g -Xms4g \
    -Dgraphhopper.datareader.file=${DATA_DIR}/${REGION_NAME}.osm.pbf \
    -Dgraphhopper.graph.location=${CACHE_DIR}/graph-cache \
    -jar graphhopper-web-${GH_VERSION}.jar \
    server ${CONFIG_DIR}/config.yml
Restart=on-failure
RestartSec=10

StandardOutput=append:/opt/graphhopper/logs/graphhopper.log
StandardError=append:/opt/graphhopper/logs/graphhopper.error.log

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable graphhopper.service
    
    log_info "Systemd service created."
}

create_nginx_config() {
    log_info "Creating Nginx configuration..."
    
    sudo tee /etc/nginx/sites-available/graphhopper > /dev/null << 'EOF'
server {
    listen 80;
    server_name graphhopper.local;

    # CORS headers
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
    add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;

    location / {
        proxy_pass http://localhost:8989;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

    # Enable site if nginx is installed
    if command -v nginx &> /dev/null; then
        sudo ln -sf /etc/nginx/sites-available/graphhopper /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
    fi
    
    log_info "Nginx configuration created."
}

import_data() {
    log_info "Importing OSM data (this may take a while)..."
    
    cd /opt/graphhopper
    
    # First import to build the graph
    java -Xmx4g -Xms4g \
        -Dgraphhopper.datareader.file=$DATA_DIR/$REGION_NAME.osm.pbf \
        -Dgraphhopper.graph.location=$CACHE_DIR/graph-cache \
        -jar graphhopper-web-$GH_VERSION.jar \
        import $CONFIG_DIR/config.yml
    
    log_info "OSM data imported successfully."
}

start_service() {
    log_info "Starting GraphHopper service..."
    
    sudo systemctl start graphhopper
    
    # Wait for service to be ready
    log_info "Waiting for service to be ready..."
    sleep 10
    
    # Check if service is running
    if curl -s "http://localhost:8989/health" > /dev/null; then
        log_info "GraphHopper service is running!"
    else
        log_error "GraphHopper service failed to start. Check logs:"
        log_error "sudo journalctl -u graphhopper -n 50"
        exit 1
    fi
}

test_routing() {
    log_info "Testing routing endpoints..."
    
    # Test coordinates (Los Angeles to San Diego)
    coords="point=34.0522,-118.2437&point=32.7157,-117.1611"
    
    # Test each profile
    for profile in car car_no_highway motorcycle bike mtb; do
        log_info "Testing $profile profile..."
        
        response=$(curl -s -w "\n%{http_code}" "http://localhost:8989/route?${coords}&profile=${profile}&locale=en")
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            log_info "  ✓ $profile routing works"
            distance=$(echo "$response" | head -n-1 | jq -r '.paths[0].distance' 2>/dev/null || echo "unknown")
            log_info "  Distance: $distance meters"
        else
            log_error "  ✗ $profile routing failed (HTTP $http_code)"
        fi
    done
}

create_update_script() {
    log_info "Creating update script..."
    
    cat > /opt/graphhopper/update-osm-data.sh << 'EOF'
#!/bin/bash

# GraphHopper OSM Data Update Script

set -e

DATA_DIR="/opt/graphhopper/data"
CONFIG_DIR="/opt/graphhopper/config"
CACHE_DIR="/opt/graphhopper/cache"
REGION_URL="https://download.geofabrik.de/north-america/us/california-latest.osm.pbf"
REGION_NAME="california-latest"
GH_VERSION="8.0"

echo "$(date): Starting OSM data update..."

# Download new data
wget -O $DATA_DIR/$REGION_NAME.osm.pbf.new $REGION_URL

# Stop service
sudo systemctl stop graphhopper

# Backup old graph
mv $CACHE_DIR/graph-cache $CACHE_DIR/graph-cache.bak

# Replace OSM file
mv $DATA_DIR/$REGION_NAME.osm.pbf.new $DATA_DIR/$REGION_NAME.osm.pbf

# Reimport data
cd /opt/graphhopper
java -Xmx4g -Xms4g \
    -Dgraphhopper.datareader.file=$DATA_DIR/$REGION_NAME.osm.pbf \
    -Dgraphhopper.graph.location=$CACHE_DIR/graph-cache \
    -jar graphhopper-web-$GH_VERSION.jar \
    import $CONFIG_DIR/config.yml

# Start service
sudo systemctl start graphhopper

# Cleanup
rm -rf $CACHE_DIR/graph-cache.bak

echo "$(date): OSM data update completed."
EOF

    chmod +x /opt/graphhopper/update-osm-data.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/graphhopper/update-osm-data.sh >> /opt/graphhopper/logs/update.log 2>&1") | crontab -
    
    log_info "Update script created and scheduled."
}

print_summary() {
    echo
    echo "========================================"
    echo "GraphHopper Deployment Complete!"
    echo "========================================"
    echo
    echo "Service URL: http://localhost:8989"
    echo
    echo "Available profiles:"
    echo "  - car (standard)"
    echo "  - car_no_highway (avoids motorways)"
    echo "  - motorcycle"
    echo "  - bike"
    echo "  - mtb (mountain bike)"
    echo "  - racingbike"
    echo "  - foot"
    echo "  - hike"
    echo
    echo "API Examples:"
    echo '  curl "http://localhost:8989/route?point=34.05,-118.24&point=32.71,-117.16&profile=car"'
    echo '  curl "http://localhost:8989/route?point=34.05,-118.24&point=32.71,-117.16&profile=car_no_highway&avoid=toll"'
    echo
    echo "Management:"
    echo "  - Service: sudo systemctl status graphhopper"
    echo "  - Logs: sudo journalctl -u graphhopper -f"
    echo "  - Update: /opt/graphhopper/update-osm-data.sh"
    echo
    echo "Web UI: http://localhost:8989/"
    echo
}

# Main execution
main() {
    log_info "Starting GraphHopper deployment..."
    
    check_requirements
    setup_directories
    download_graphhopper
    download_osm_data
    create_config
    copy_profiles
    import_data
    create_systemd_service
    create_nginx_config
    start_service
    test_routing
    create_update_script
    
    print_summary
    
    log_info "Deployment completed successfully!"
}

# Run main function
main "$@"