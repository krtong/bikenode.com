#!/bin/bash

# BRouter Deployment Script
# Automates the setup of BRouter bicycle routing engine

set -e  # Exit on error

# Configuration
BROUTER_VERSION="1.7.0"
BROUTER_DIR="/opt/brouter"
DATA_DIR="$BROUTER_DIR/segments4"
PROFILES_DIR="$BROUTER_DIR/profiles2"
CUSTOM_PROFILES_DIR="$BROUTER_DIR/custom-profiles"
PORT=17777

# Geographic bounds for data download (California example)
# Format: lon_west,lat_south,lon_east,lat_north
BOUNDS="-125,32,-114,42"

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
        log_error "Java not found. Please install Java 8 or later."
        exit 1
    fi
    
    java_version=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}')
    log_info "Java version: $java_version"
    
    # Check disk space
    available_space=$(df -BG /opt | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 10 ]; then
        log_error "Less than 10GB free space. Aborting."
        exit 1
    fi
    
    log_info "System requirements check passed."
}

setup_directories() {
    log_info "Setting up directory structure..."
    
    sudo mkdir -p $BROUTER_DIR
    sudo mkdir -p $DATA_DIR
    sudo mkdir -p $PROFILES_DIR
    sudo mkdir -p $CUSTOM_PROFILES_DIR
    sudo mkdir -p $BROUTER_DIR/logs
    
    # Set permissions
    sudo chown -R $USER:$USER $BROUTER_DIR
    
    log_info "Directories created."
}

download_brouter() {
    log_info "Downloading BRouter..."
    
    if [ -f "$BROUTER_DIR/brouter.jar" ]; then
        log_warn "BRouter already downloaded. Skipping."
        return
    fi
    
    cd $BROUTER_DIR
    
    # Download BRouter standalone server
    wget "https://github.com/abrensch/brouter/releases/download/$BROUTER_VERSION/brouter-$BROUTER_VERSION-standalone.zip"
    
    # Extract
    unzip -o "brouter-$BROUTER_VERSION-standalone.zip"
    mv brouter-$BROUTER_VERSION/* .
    rmdir brouter-$BROUTER_VERSION
    rm "brouter-$BROUTER_VERSION-standalone.zip"
    
    log_info "BRouter downloaded and extracted."
}

download_segments() {
    log_info "Downloading routing data segments..."
    
    cd $BROUTER_DIR
    
    # Create segments directory if not exists
    mkdir -p segments4
    
    # Download segment files for the specified bounds
    # BRouter segments are in 5x5 degree tiles
    # This is a simplified example - in production you'd calculate which tiles to download
    
    log_info "Downloading California region segments..."
    
    # Example segments for California (you'd calculate these based on BOUNDS)
    segments=(
        "E-125_N30.rd5"
        "E-125_N35.rd5"
        "E-125_N40.rd5"
        "E-120_N30.rd5"
        "E-120_N35.rd5"
        "E-120_N40.rd5"
        "E-115_N30.rd5"
        "E-115_N35.rd5"
        "E-115_N40.rd5"
    )
    
    for segment in "${segments[@]}"; do
        if [ ! -f "segments4/$segment" ]; then
            log_info "Downloading $segment..."
            wget -P segments4/ "https://brouter.de/brouter/segments4/$segment" || log_warn "Failed to download $segment"
        else
            log_info "$segment already exists, skipping."
        fi
    done
    
    log_info "Segment download complete."
}

setup_profiles() {
    log_info "Setting up routing profiles..."
    
    cd $BROUTER_DIR
    
    # Download standard profiles if not present
    if [ ! -d "profiles2" ] || [ -z "$(ls -A profiles2)" ]; then
        wget "https://github.com/abrensch/brouter/releases/download/$BROUTER_VERSION/profiles2.zip"
        unzip -o profiles2.zip
        rm profiles2.zip
    fi
    
    # Create custom MTB profiles
    create_custom_profiles
    
    log_info "Profiles setup complete."
}

create_custom_profiles() {
    log_info "Creating custom routing profiles..."
    
    # MTB Singletrack Profile
    cat > $CUSTOM_PROFILES_DIR/mtb-singletrack.brf << 'EOF'
# MTB profile focused on singletrack and technical trails
---context:global
assign processUnusedTags = true
assign turnInstructionMode = 1

assign validForBikes = true
assign validForFoot = false
assign validForCars = false

# Elevation parameters
assign downhillcost = 60
assign downhillcutoff = 1.5
assign uphillcost = 200
assign uphillcutoff = 1.0

# Way priorities
assign singletrack_prio = 1.0    # Highest priority
assign path_prio = 0.9
assign track_prio = 0.8
assign cycleway_prio = 0.7
assign road_prio = 0.4

---context:way
assign turncost = 20
assign initialcost = 0

assign costfactor
  switch highway=path
    switch mtb:scale= 0.8
    switch mtb:scale=0 0.9
    switch mtb:scale=1 1.0
    switch mtb:scale=2 1.2
    switch mtb:scale=3 1.5
    switch mtb:scale=4 2.0
    switch mtb:scale=5 3.0
    2.0
    
  switch highway=track
    switch tracktype=grade1 1.2
    switch tracktype=grade2 1.0
    switch tracktype=grade3 0.9
    switch tracktype=grade4 0.8
    switch tracktype=grade5 0.7
    0.85
    
  switch highway=cycleway 1.5
  switch highway=footway
    switch bicycle=yes 1.8
    switch bicycle=designated 1.5
    10.0
    
  switch highway=bridleway
    switch bicycle=yes 1.2
    switch bicycle=designated 1.0
    3.0
    
  switch highway=residential 2.5
  switch highway=service 2.8
  switch highway=unclassified 3.0
  switch highway=tertiary 3.5
  switch highway=secondary 5.0
  switch highway=primary 8.0
  switch highway=trunk 10.0
  switch highway=motorway 10000
  
  5.0  # Default high cost

---context:node
assign initialcost = 0
EOF

    # Gravel Bike Profile
    cat > $CUSTOM_PROFILES_DIR/gravel-adventure.brf << 'EOF'
# Gravel bike profile for mixed surface adventure riding
---context:global
assign processUnusedTags = true
assign turnInstructionMode = 1

assign validForBikes = true
assign validForFoot = false
assign validForCars = false

# Elevation parameters - gravel bikes handle hills well
assign downhillcost = 40
assign downhillcutoff = 2.0
assign uphillcost = 150
assign uphillcutoff = 1.5

---context:way
assign turncost = 10
assign initialcost = 0

assign costfactor
  switch surface=paved 0.9
  switch surface=asphalt 0.9
  switch surface=concrete 0.95
  switch surface=compacted 0.8
  switch surface=gravel 0.7      # Preferred surface
  switch surface=fine_gravel 0.65
  switch surface=dirt 0.85
  switch surface=ground 0.9
  switch surface=grass 1.5
  switch surface=sand 3.0
  
  switch highway=track
    switch tracktype=grade1 0.8
    switch tracktype=grade2 0.7
    switch tracktype=grade3 0.75
    switch tracktype=grade4 0.9
    switch tracktype=grade5 1.2
    0.8
    
  switch highway=cycleway 0.9
  switch highway=path
    switch bicycle=designated 0.85
    switch bicycle=yes 1.0
    1.5
    
  switch highway=service 1.1
  switch highway=residential 1.2
  switch highway=unclassified 1.0
  switch highway=tertiary 1.1
  switch highway=secondary 1.5
  switch highway=primary 2.5
  switch highway=trunk 5.0
  switch highway=motorway 10000
  
  1.5  # Default

---context:node
assign initialcost = 0
EOF

    # E-MTB Profile
    cat > $CUSTOM_PROFILES_DIR/emtb-allterrain.brf << 'EOF'
# E-MTB profile with higher tolerance for climbs and rough terrain
---context:global
assign processUnusedTags = true
assign turnInstructionMode = 1

assign validForBikes = true
assign validForFoot = false
assign validForCars = false

# E-bikes handle climbs much better
assign downhillcost = 50
assign downhillcutoff = 2.5
assign uphillcost = 80      # Much lower than regular MTB
assign uphillcutoff = 2.0

---context:way
assign turncost = 15
assign initialcost = 0

assign costfactor
  # E-MTBs can handle rougher terrain
  switch highway=path
    switch mtb:scale= 0.7
    switch mtb:scale=0 0.8
    switch mtb:scale=1 0.9
    switch mtb:scale=2 1.0
    switch mtb:scale=3 1.1
    switch mtb:scale=4 1.3
    switch mtb:scale=5 1.8
    1.5
    
  switch highway=track
    switch tracktype=grade1 0.9
    switch tracktype=grade2 0.8
    switch tracktype=grade3 0.75
    switch tracktype=grade4 0.7
    switch tracktype=grade5 0.8
    0.8
    
  switch highway=cycleway 1.2
  switch highway=footway
    switch bicycle=yes 1.5
    switch bicycle=designated 1.2
    8.0
    
  switch highway=residential 2.0
  switch highway=service 2.2
  switch highway=unclassified 2.5
  switch highway=tertiary 3.0
  switch highway=secondary 4.0
  switch highway=primary 6.0
  switch highway=trunk 10.0
  switch highway=motorway 10000
  
  3.0  # Default

---context:node
assign initialcost = 0
EOF

    log_info "Custom profiles created."
}

create_start_script() {
    log_info "Creating startup script..."
    
    cat > $BROUTER_DIR/start-brouter.sh << EOF
#!/bin/bash

# BRouter Startup Script

cd $BROUTER_DIR

# Start BRouter server
java -Xmx2g -Xms256m \\
    -Dbrouter.profiles=$PROFILES_DIR:$CUSTOM_PROFILES_DIR \\
    -Dbrouter.segments=$DATA_DIR \\
    -jar brouter.jar \\
    $PORT \\
    segments4 \\
    profiles2:custom-profiles \\
    > logs/brouter.log 2>&1
EOF

    chmod +x $BROUTER_DIR/start-brouter.sh
    
    log_info "Startup script created."
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    sudo tee /etc/systemd/system/brouter.service > /dev/null << EOF
[Unit]
Description=BRouter Bicycle Routing Engine
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$BROUTER_DIR
ExecStart=$BROUTER_DIR/start-brouter.sh
Restart=on-failure
RestartSec=10

# Java settings
Environment="JAVA_OPTS=-Xmx2g -Xms256m"

# Logging
StandardOutput=append:$BROUTER_DIR/logs/brouter.log
StandardError=append:$BROUTER_DIR/logs/brouter.error.log

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable brouter.service
    
    log_info "Systemd service created."
}

start_service() {
    log_info "Starting BRouter service..."
    
    sudo systemctl start brouter.service
    
    # Wait for service to start
    sleep 5
    
    # Check if service is running
    if sudo systemctl is-active --quiet brouter.service; then
        log_info "BRouter service started successfully."
    else
        log_error "Failed to start BRouter service."
        sudo journalctl -u brouter.service -n 50
        exit 1
    fi
}

test_routing() {
    log_info "Testing BRouter endpoints..."
    
    # Test profile listing
    log_info "Available profiles:"
    curl -s "http://localhost:$PORT/brouter/profile" | head -10
    
    echo
    
    # Test simple route
    log_info "Testing route calculation..."
    
    test_route=$(curl -s "http://localhost:$PORT/brouter?lonlats=-122.4194,37.7749|-122.4180,37.7751&profile=trekking&alternativeidx=0&format=geojson")
    
    if echo "$test_route" | grep -q "FeatureCollection"; then
        log_info "✓ Route calculation successful"
        distance=$(echo "$test_route" | grep -o '"track-length":[0-9]*' | cut -d: -f2)
        log_info "  Route distance: ${distance}m"
    else
        log_error "✗ Route calculation failed"
    fi
}

create_web_ui() {
    log_info "Creating BRouter web UI..."
    
    cat > $BROUTER_DIR/brouter-web.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>BRouter Test Interface</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        #map { height: 500px; margin: 20px 0; }
        .controls { margin: 20px 0; }
        .result { margin: 20px 0; padding: 10px; background: #f0f0f0; }
        select, button { padding: 5px 10px; margin: 5px; }
    </style>
</head>
<body>
    <h1>BRouter Bicycle Routing Test</h1>
    
    <div class="controls">
        <label>
            Profile:
            <select id="profile">
                <option value="trekking">Trekking</option>
                <option value="fastbike">Fast Bike</option>
                <option value="safety">Safety</option>
                <option value="shortest">Shortest</option>
                <option value="gravel">Gravel</option>
                <option value="mtb">Mountain Bike</option>
                <option value="mtb-singletrack">MTB Singletrack (Custom)</option>
                <option value="gravel-adventure">Gravel Adventure (Custom)</option>
                <option value="emtb-allterrain">E-MTB All Terrain (Custom)</option>
            </select>
        </label>
        
        <button onclick="calculateRoute()">Calculate Route</button>
        <button onclick="clearMap()">Clear</button>
    </div>
    
    <div id="map"></div>
    <div id="result" class="result" style="display:none;"></div>
    
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script>
        const map = L.map('map').setView([37.7749, -122.4194], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        let markers = [];
        let routeLine = null;
        
        map.on('click', function(e) {
            if (markers.length < 2) {
                const marker = L.marker(e.latlng).addTo(map);
                markers.push(marker);
            }
        });
        
        function calculateRoute() {
            if (markers.length < 2) {
                alert('Please click on the map to add at least 2 waypoints');
                return;
            }
            
            const profile = document.getElementById('profile').value;
            const lonlats = markers.map(m => {
                const ll = m.getLatLng();
                return `${ll.lng},${ll.lat}`;
            }).join('|');
            
            fetch(`/brouter?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`)
                .then(res => res.json())
                .then(data => {
                    if (data.features && data.features.length > 0) {
                        displayRoute(data.features[0]);
                    } else {
                        alert('No route found');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Error: ' + err.message);
                });
        }
        
        function displayRoute(feature) {
            if (routeLine) map.removeLayer(routeLine);
            
            const coords = feature.geometry.coordinates.map(c => [c[1], c[0]]);
            routeLine = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(map);
            map.fitBounds(routeLine.getBounds());
            
            const props = feature.properties;
            const result = document.getElementById('result');
            result.style.display = 'block';
            result.innerHTML = `
                <h3>Route Summary</h3>
                <p>Distance: ${(props['track-length'] / 1000).toFixed(2)} km</p>
                <p>Time: ${Math.round(props['total-time'] / 60)} minutes</p>
                <p>Ascent: ${props['filtered ascend']} m</p>
                <p>Descent: ${props['filtered descend']} m</p>
                <p>Energy: ${(props['total-energy'] / 1000).toFixed(1)} kJ</p>
            `;
        }
        
        function clearMap() {
            markers.forEach(m => map.removeLayer(m));
            markers = [];
            if (routeLine) map.removeLayer(routeLine);
            document.getElementById('result').style.display = 'none';
        }
    </script>
</body>
</html>
EOF

    # Create nginx config for web UI
    sudo tee /etc/nginx/sites-available/brouter > /dev/null << EOF
server {
    listen 17778;
    server_name localhost;
    
    root $BROUTER_DIR;
    index brouter-web.html;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
    
    location /brouter {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Enable nginx site if nginx is installed
    if command -v nginx &> /dev/null; then
        sudo ln -sf /etc/nginx/sites-available/brouter /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
        log_info "Web UI available at http://localhost:17778"
    fi
}

create_update_script() {
    log_info "Creating segment update script..."
    
    cat > $BROUTER_DIR/update-segments.sh << 'EOF'
#!/bin/bash

# BRouter Segment Update Script

BROUTER_DIR="/opt/brouter"
SEGMENTS_DIR="$BROUTER_DIR/segments4"

echo "$(date): Starting segment update..."

cd $SEGMENTS_DIR

# Download updated segments
# In production, you'd check modification times and only download changed files
for segment in *.rd5; do
    echo "Updating $segment..."
    wget -N "https://brouter.de/brouter/segments4/$segment"
done

echo "$(date): Segment update completed."
EOF

    chmod +x $BROUTER_DIR/update-segments.sh
    
    # Add to crontab for weekly updates
    (crontab -l 2>/dev/null; echo "0 3 * * 0 $BROUTER_DIR/update-segments.sh >> $BROUTER_DIR/logs/update.log 2>&1") | crontab -
    
    log_info "Update script created and scheduled."
}

print_summary() {
    echo
    echo "========================================"
    echo "BRouter Deployment Complete!"
    echo "========================================"
    echo
    echo "Service URL: http://localhost:$PORT"
    if command -v nginx &> /dev/null; then
        echo "Web UI: http://localhost:17778"
    fi
    echo
    echo "Available endpoints:"
    echo "  - /brouter           - Calculate route"
    echo "  - /brouter/profile   - List available profiles"
    echo
    echo "Standard profiles:"
    echo "  - trekking     - Touring/trekking bikes"
    echo "  - fastbike     - Racing/fast road bikes"
    echo "  - safety       - Safe city cycling"
    echo "  - shortest     - Shortest path"
    echo "  - mtb          - Mountain biking"
    echo "  - gravel       - Gravel biking"
    echo
    echo "Custom profiles:"
    echo "  - mtb-singletrack    - Singletrack focused MTB"
    echo "  - gravel-adventure   - Mixed surface gravel"
    echo "  - emtb-allterrain   - E-MTB all terrain"
    echo
    echo "Management:"
    echo "  - Service: sudo systemctl status brouter"
    echo "  - Logs: tail -f $BROUTER_DIR/logs/brouter.log"
    echo "  - Update: $BROUTER_DIR/update-segments.sh"
    echo
    echo "Example request:"
    echo 'curl "http://localhost:17777/brouter?lonlats=-122.4,37.7|-122.3,37.8&profile=trekking"'
    echo
}

# Main execution
main() {
    log_info "Starting BRouter deployment..."
    
    check_requirements
    setup_directories
    download_brouter
    download_segments
    setup_profiles
    create_start_script
    create_systemd_service
    start_service
    test_routing
    create_web_ui
    create_update_script
    
    print_summary
    
    log_info "Deployment completed successfully!"
}

# Run main function
main "$@"