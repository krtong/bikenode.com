#!/bin/bash

# Valhalla Deployment Script
# Automates the setup of Valhalla routing engine with custom configurations

set -e  # Exit on error

# Configuration
DATA_DIR="/opt/valhalla/data"
CONFIG_DIR="/opt/valhalla/config"
TILES_DIR="/opt/valhalla/tiles"
LOGS_DIR="/opt/valhalla/logs"
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
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker first."
        exit 1
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
    sudo mkdir -p $TILES_DIR
    sudo mkdir -p $LOGS_DIR
    
    # Set permissions
    sudo chown -R $USER:$USER /opt/valhalla
    
    log_info "Directories created."
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

create_valhalla_config() {
    log_info "Creating Valhalla configuration..."
    
    cat > $CONFIG_DIR/valhalla.json << 'EOF'
{
  "mjolnir": {
    "max_cache_size": 1000000000,
    "tile_dir": "/data/valhalla_tiles",
    "admin": "/data/valhalla_tiles/admin.sqlite",
    "timezone": "/data/valhalla_tiles/tz_world.sqlite",
    "statistics": "/data/valhalla_tiles/statistics.sqlite",
    "transit_dir": "/data/valhalla_tiles/transit",
    "logging": {
      "type": "std_out",
      "color": true,
      "file_name": "path_to_some_file.log"
    },
    "include_driveways": false,
    "include_bicycle": true,
    "include_pedestrian": true,
    "include_driving": true,
    "import_bike_share_stations": true
  },
  "thor": {
    "logging": {
      "long_request": 110.0,
      "type": "std_out",
      "color": true
    },
    "extended_search": {
      "max_distance": 200,
      "max_locations": 50,
      "max_shape": 8192
    },
    "service": {
      "proxy": "ipc:///tmp/thor"
    },
    "source_to_target_algorithm": "select_optimal"
  },
  "odin": {
    "logging": {
      "type": "std_out",
      "color": true
    },
    "service": {
      "proxy": "ipc:///tmp/odin"
    }
  },
  "loki": {
    "actions": [
      "locate",
      "route",
      "height",
      "sources_to_targets",
      "optimized_route",
      "isochrone",
      "trace_route",
      "trace_attributes",
      "transit_available",
      "expansion",
      "centroid",
      "status"
    ],
    "logging": {
      "long_request": 100.0,
      "type": "std_out",
      "color": true
    },
    "service": {
      "proxy": "ipc:///tmp/loki"
    },
    "service_defaults": {
      "minimum_reachability": 50,
      "radius": 0,
      "search_cutoff": 35000,
      "node_snap_tolerance": 5,
      "street_side_tolerance": 5,
      "street_side_max_distance": 1000,
      "heading_tolerance": 60
    }
  },
  "tyr": {
    "logging": {
      "long_request": 100.0,
      "type": "std_out",
      "color": true
    },
    "service": {
      "proxy": "ipc:///tmp/tyr"
    }
  },
  "meili": {
    "default": {
      "beta": 3,
      "breakage_distance": 2000,
      "geometry": false,
      "gps_accuracy": 5.0,
      "interpolation_distance": 10,
      "max_route_distance_factor": 5,
      "max_route_time_factor": 5,
      "max_search_radius": 100,
      "route": true,
      "search_radius": 30,
      "sigma_z": 4.07,
      "turn_penalty_factor": 200
    },
    "grid": {
      "cache_size": 100240,
      "size": 500
    },
    "logging": {
      "type": "std_out",
      "color": true
    },
    "service": {
      "proxy": "ipc:///tmp/meili"
    },
    "verbose": false
  },
  "httpd": {
    "service": {
      "listen": "tcp://*:8002",
      "loopback": "ipc:///tmp/loopback",
      "interrupt": "ipc:///tmp/interrupt",
      "drain_seconds": 28,
      "shutdown_seconds": 1
    }
  },
  "service_limits": {
    "auto": {
      "max_distance": 5000000.0,
      "max_locations": 20,
      "max_matrix_distance": 400000.0,
      "max_matrix_locations": 50
    },
    "bicycle": {
      "max_distance": 500000.0,
      "max_locations": 50,
      "max_matrix_distance": 200000.0,
      "max_matrix_locations": 50
    },
    "bikeshare": {
      "max_distance": 500000.0,
      "max_locations": 50,
      "max_matrix_distance": 200000.0,
      "max_matrix_locations": 50
    },
    "bus": {
      "max_distance": 5000000.0,
      "max_locations": 50,
      "max_matrix_distance": 400000.0,
      "max_matrix_locations": 50
    },
    "motor_scooter": {
      "max_distance": 500000.0,
      "max_locations": 50,
      "max_matrix_distance": 200000.0,
      "max_matrix_locations": 50
    },
    "motorcycle": {
      "max_distance": 500000.0,
      "max_locations": 50,
      "max_matrix_distance": 200000.0,
      "max_matrix_locations": 50
    },
    "pedestrian": {
      "max_distance": 250000.0,
      "max_locations": 50,
      "max_matrix_distance": 200000.0,
      "max_matrix_locations": 50
    },
    "status": {
      "allow_verbose": true
    },
    "transit": {
      "max_distance": 500000.0,
      "max_locations": 50,
      "max_matrix_distance": 200000.0,
      "max_matrix_locations": 50
    },
    "taxi": {
      "max_distance": 5000000.0,
      "max_locations": 20,
      "max_matrix_distance": 400000.0,
      "max_matrix_locations": 50
    },
    "trace": {
      "max_alternates": 3,
      "max_alternates_shape": 100,
      "max_distance": 100000.0,
      "max_gps_accuracy": 100.0,
      "max_search_radius": 100.0,
      "max_shape": 8192
    },
    "isochrone": {
      "max_contours": 4,
      "max_time_contour": 120,
      "max_distance": 25000.0,
      "max_locations": 1,
      "max_distance_contour": 200
    },
    "max_alternates": 2,
    "max_exclude_locations": 50,
    "max_exclude_polygons_length": 10000,
    "max_radius": 200,
    "max_reachability": 100,
    "max_timedep_distance": 500000
  },
  "additional_data": {
    "elevation": "/data/valhalla_tiles/elevation/"
  }
}
EOF
    
    log_info "Configuration created."
}

copy_costing_configs() {
    log_info "Copying custom costing configurations..."
    
    if [ -f "valhalla-costing-configs.json" ]; then
        cp valhalla-costing-configs.json $CONFIG_DIR/
    fi
    
    log_info "Costing configurations copied."
}

create_docker_compose() {
    log_info "Creating Docker Compose configuration..."
    
    cat > /opt/valhalla/docker-compose.yml << 'EOF'
version: '3.8'

services:
  valhalla:
    image: valhalla/valhalla:run-latest
    container_name: valhalla
    restart: unless-stopped
    ports:
      - "8002:8002"
    volumes:
      - ./data:/data
      - ./config/valhalla.json:/valhalla.json
      - ./tiles:/data/valhalla_tiles
      - ./logs:/logs
    environment:
      - use_tiles_ignore_pbf=True
      - force_rebuild=False
      - VALHALLA_LOG_LEVEL=INFO
    command: bash -c "
      if [ ! -f /data/valhalla_tiles/$(find /data/valhalla_tiles -name '*.gph' 2>/dev/null | head -n1) ]; then
        valhalla_build_config --mjolnir-tile-dir /data/valhalla_tiles --mjolnir-timezone /data/valhalla_tiles/tz_world.sqlite --mjolnir-admin /data/valhalla_tiles/admin.sqlite > /valhalla.json &&
        valhalla_build_tiles -c /valhalla.json /data/*.osm.pbf &&
        valhalla_build_extract -c /valhalla.json -v
      fi &&
      valhalla_service /valhalla.json"
    mem_limit: 6g
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  valhalla-ui:
    image: nginx:alpine
    container_name: valhalla-ui
    restart: unless-stopped
    ports:
      - "8003:80"
    volumes:
      - ./ui:/usr/share/nginx/html:ro
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - valhalla
EOF
    
    log_info "Docker Compose configuration created."
}

create_nginx_config() {
    log_info "Creating Nginx configuration..."
    
    cat > $CONFIG_DIR/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream valhalla_backend {
        server valhalla:8002;
        keepalive 32;
    }

    server {
        listen 80;
        server_name localhost;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }

        # Proxy all requests to Valhalla
        location / {
            proxy_pass http://valhalla_backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # Buffering
            proxy_buffering off;
        }
        
        # Health check endpoint
        location /health {
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
    
    log_info "Nginx configuration created."
}

create_ui() {
    log_info "Creating Valhalla UI..."
    
    mkdir -p /opt/valhalla/ui
    
    cat > /opt/valhalla/ui/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Valhalla Routing Engine</title>
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
    <h1>Valhalla Routing Engine Test</h1>
    
    <div class="controls">
        <label>
            Costing Model:
            <select id="costing">
                <option value="auto">Auto</option>
                <option value="bicycle">Bicycle</option>
                <option value="pedestrian">Pedestrian</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="motor_scooter">Motor Scooter</option>
                <option value="bikeshare">Bike Share</option>
                <option value="bus">Bus</option>
                <option value="taxi">Taxi</option>
            </select>
        </label>
        
        <button onclick="calculateRoute()">Calculate Route</button>
        <button onclick="clearMap()">Clear</button>
    </div>
    
    <div id="map"></div>
    <div id="result" class="result" style="display:none;"></div>
    
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script>
        const map = L.map('map').setView([34.05, -118.25], 10);
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
            
            const costing = document.getElementById('costing').value;
            const locations = markers.map(m => {
                const ll = m.getLatLng();
                return { lat: ll.lat, lon: ll.lng };
            });
            
            const request = {
                locations: locations,
                costing: costing,
                directions_options: {
                    units: 'kilometers'
                }
            };
            
            fetch('/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            })
            .then(res => res.json())
            .then(data => {
                if (data.trip) {
                    displayRoute(data.trip);
                } else {
                    alert('Route calculation failed');
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error: ' + err.message);
            });
        }
        
        function displayRoute(trip) {
            if (routeLine) map.removeLayer(routeLine);
            
            const coords = [];
            trip.legs.forEach(leg => {
                if (leg.shape) {
                    const decoded = decodePolyline(leg.shape);
                    coords.push(...decoded);
                }
            });
            
            routeLine = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(map);
            map.fitBounds(routeLine.getBounds());
            
            const result = document.getElementById('result');
            result.style.display = 'block';
            result.innerHTML = `
                <h3>Route Summary</h3>
                <p>Distance: ${trip.summary.length.toFixed(2)} km</p>
                <p>Duration: ${Math.round(trip.summary.time / 60)} minutes</p>
            `;
        }
        
        function clearMap() {
            markers.forEach(m => map.removeLayer(m));
            markers = [];
            if (routeLine) map.removeLayer(routeLine);
            document.getElementById('result').style.display = 'none';
        }
        
        function decodePolyline(encoded) {
            const coords = [];
            let index = 0, len = encoded.length;
            let lat = 0, lng = 0;
            
            while (index < len) {
                let b, shift = 0, result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                
                const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lat += dlat;
                
                shift = 0;
                result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                
                const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lng += dlng;
                
                coords.push([lat / 1e6, lng / 1e6]);
            }
            
            return coords;
        }
    </script>
</body>
</html>
EOF
    
    log_info "UI created."
}

start_services() {
    log_info "Starting Valhalla services..."
    
    cd /opt/valhalla
    
    # Pull image first
    docker pull valhalla/valhalla:run-latest
    
    # Start services
    docker-compose up -d
    
    log_info "Waiting for tile building to complete (this may take 10-30 minutes)..."
    
    # Monitor logs
    docker-compose logs -f valhalla &
    LOG_PID=$!
    
    # Wait for service to be ready
    while ! curl -s "http://localhost:8002/status" > /dev/null 2>&1; do
        sleep 30
        echo -n "."
    done
    
    kill $LOG_PID 2>/dev/null || true
    
    log_info "Valhalla service is ready!"
}

test_routing() {
    log_info "Testing routing endpoints..."
    
    # Test different costing models
    for costing in auto bicycle pedestrian motorcycle; do
        log_info "Testing $costing routing..."
        
        request='{
            "locations": [
                {"lat": 34.0522, "lon": -118.2437},
                {"lat": 32.7157, "lon": -117.1611}
            ],
            "costing": "'$costing'",
            "directions_options": {
                "units": "kilometers"
            }
        }'
        
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$request" \
            "http://localhost:8002/route")
        
        if echo "$response" | grep -q "trip"; then
            distance=$(echo "$response" | jq -r '.trip.summary.length' 2>/dev/null || echo "unknown")
            log_info "  ✓ $costing routing works - Distance: ${distance}km"
        else
            log_error "  ✗ $costing routing failed"
        fi
    done
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    sudo tee /etc/systemd/system/valhalla.service > /dev/null << EOF
[Unit]
Description=Valhalla Routing Engine
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/valhalla
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
ExecReload=/usr/bin/docker-compose restart

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable valhalla.service
    
    log_info "Systemd service created."
}

create_update_script() {
    log_info "Creating update script..."
    
    cat > /opt/valhalla/update-osm-data.sh << 'EOF'
#!/bin/bash

# Valhalla OSM Data Update Script

set -e

DATA_DIR="/opt/valhalla/data"
TILES_DIR="/opt/valhalla/tiles"
REGION_URL="https://download.geofabrik.de/north-america/us/california-latest.osm.pbf"
REGION_NAME="california-latest"

echo "$(date): Starting OSM data update..."

# Download new data
wget -O $DATA_DIR/$REGION_NAME.osm.pbf.new $REGION_URL

# Stop service
docker-compose -f /opt/valhalla/docker-compose.yml stop valhalla

# Backup old tiles
mv $TILES_DIR $TILES_DIR.bak

# Replace OSM file
mv $DATA_DIR/$REGION_NAME.osm.pbf.new $DATA_DIR/$REGION_NAME.osm.pbf

# Start service (will rebuild tiles)
docker-compose -f /opt/valhalla/docker-compose.yml up -d valhalla

# Monitor rebuild
docker-compose -f /opt/valhalla/docker-compose.yml logs -f valhalla &
LOG_PID=$!

# Wait for rebuild to complete
while ! curl -s "http://localhost:8002/status" > /dev/null 2>&1; do
    sleep 60
done

kill $LOG_PID 2>/dev/null || true

# Cleanup
rm -rf $TILES_DIR.bak

echo "$(date): OSM data update completed."
EOF

    chmod +x /opt/valhalla/update-osm-data.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 4 * * 0 /opt/valhalla/update-osm-data.sh >> /opt/valhalla/logs/update.log 2>&1") | crontab -
    
    log_info "Update script created and scheduled."
}

print_summary() {
    echo
    echo "========================================"
    echo "Valhalla Deployment Complete!"
    echo "========================================"
    echo
    echo "Service URL: http://localhost:8002"
    echo "Web UI: http://localhost:8003"
    echo
    echo "Available endpoints:"
    echo "  - /route           - Point-to-point routing"
    echo "  - /optimized_route - Optimized multi-point routing"
    echo "  - /isochrone       - Time/distance polygons"
    echo "  - /locate          - Snap coordinates to road"
    echo "  - /trace_route     - Map matching"
    echo "  - /trace_attributes - Extract road attributes"
    echo "  - /sources_to_targets - Distance matrix"
    echo "  - /status          - Service status"
    echo
    echo "Costing models:"
    echo "  - auto          - Car routing"
    echo "  - bicycle       - Bicycle routing"
    echo "  - pedestrian    - Walking routing"
    echo "  - motorcycle    - Motorcycle routing"
    echo "  - motor_scooter - Scooter routing"
    echo "  - bikeshare     - Bike share routing"
    echo "  - bus           - Bus routing"
    echo "  - taxi          - Taxi routing"
    echo
    echo "Management:"
    echo "  - Service: sudo systemctl status valhalla"
    echo "  - Logs: cd /opt/valhalla && docker-compose logs -f"
    echo "  - Update: /opt/valhalla/update-osm-data.sh"
    echo
    echo "Example request:"
    echo 'curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '\''{"locations":[{"lat":34.05,"lon":-118.25},{"lat":32.71,"lon":-117.16}],"costing":"auto"}'\'''
    echo
}

# Main execution
main() {
    log_info "Starting Valhalla deployment..."
    
    check_requirements
    setup_directories
    download_osm_data
    create_valhalla_config
    copy_costing_configs
    create_docker_compose
    create_nginx_config
    create_ui
    start_services
    test_routing
    create_systemd_service
    create_update_script
    
    print_summary
    
    log_info "Deployment completed successfully!"
}

# Run main function
main "$@"