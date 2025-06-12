#!/bin/bash

# OSRM Deployment Script
# Automates the setup of a multi-profile OSRM instance

set -e  # Exit on error

# Configuration
OSRM_VERSION="v5.27.1"
DATA_DIR="/opt/osrm/data"
PROFILES_DIR="/opt/osrm/profiles"
REGION_URL="https://download.geofabrik.de/north-america/us/california-latest.osm.pbf"
REGION_NAME="california-latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    
    # Check RAM
    total_ram=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 16 ]; then
        log_warn "System has less than 16GB RAM. Large regions may fail to process."
    fi
    
    # Check disk space
    available_space=$(df -BG /opt | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 100 ]; then
        log_error "Less than 100GB free space available. Aborting."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker first."
        exit 1
    fi
    
    log_info "System requirements check passed."
}

setup_directories() {
    log_info "Setting up directory structure..."
    
    sudo mkdir -p $DATA_DIR/{raw,motorcycle,bicycle,car}
    sudo mkdir -p $PROFILES_DIR
    sudo mkdir -p /opt/osrm/config
    sudo mkdir -p /opt/osrm/logs
    
    # Set permissions
    sudo chown -R $USER:$USER /opt/osrm
    
    log_info "Directories created."
}

download_osm_data() {
    log_info "Downloading OSM data for $REGION_NAME..."
    
    if [ -f "$DATA_DIR/raw/$REGION_NAME.osm.pbf" ]; then
        log_warn "OSM data already exists. Skipping download."
        return
    fi
    
    wget -P $DATA_DIR/raw/ $REGION_URL
    
    log_info "OSM data downloaded successfully."
}

copy_profiles() {
    log_info "Copying custom profiles..."
    
    # Copy the profiles we created
    cp profiles/*.lua $PROFILES_DIR/
    
    # Download OSRM lib directory for profile dependencies
    if [ ! -d "$PROFILES_DIR/lib" ]; then
        log_info "Downloading OSRM profile libraries..."
        cd $PROFILES_DIR
        wget -q -O- https://github.com/Project-OSRM/osrm-backend/archive/v$OSRM_VERSION.tar.gz | \
            tar xz --strip-components=2 osrm-backend-$OSRM_VERSION/profiles/lib
        cd -
    fi
    
    log_info "Profiles copied successfully."
}

process_profile() {
    local profile_name=$1
    local profile_file=$2
    local osm_file="$DATA_DIR/raw/$REGION_NAME.osm.pbf"
    local output_dir="$DATA_DIR/$profile_name"
    
    log_info "Processing $profile_name profile..."
    
    # Extract
    log_info "  Running osrm-extract..."
    docker run --rm -v $DATA_DIR:/data -v $PROFILES_DIR:/profiles \
        osrm/osrm-backend:$OSRM_VERSION \
        osrm-extract -p /profiles/$profile_file /data/raw/$REGION_NAME.osm.pbf \
        -o /data/$profile_name/$REGION_NAME.osrm
    
    # Partition
    log_info "  Running osrm-partition..."
    docker run --rm -v $DATA_DIR:/data \
        osrm/osrm-backend:$OSRM_VERSION \
        osrm-partition /data/$profile_name/$REGION_NAME.osrm
    
    # Customize
    log_info "  Running osrm-customize..."
    docker run --rm -v $DATA_DIR:/data \
        osrm/osrm-backend:$OSRM_VERSION \
        osrm-customize /data/$profile_name/$REGION_NAME.osrm
    
    log_info "Profile $profile_name processed successfully."
}

create_docker_compose() {
    log_info "Creating Docker Compose configuration..."
    
    cat > /opt/osrm/docker-compose.yml << 'EOF'
version: '3.8'

services:
  osrm-motorcycle:
    image: osrm/osrm-backend:v5.27.1
    container_name: osrm-motorcycle
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data/motorcycle:/data:ro
    command: osrm-routed --algorithm mld /data/california-latest.osrm --max-table-size 10000
    mem_limit: 4g
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  osrm-bicycle:
    image: osrm/osrm-backend:v5.27.1
    container_name: osrm-bicycle
    restart: unless-stopped
    ports:
      - "5001:5000"
    volumes:
      - ./data/bicycle:/data:ro
    command: osrm-routed --algorithm mld /data/california-latest.osrm --max-table-size 10000
    mem_limit: 4g
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  osrm-car:
    image: osrm/osrm-backend:v5.27.1
    container_name: osrm-car
    restart: unless-stopped
    ports:
      - "5002:5000"
    volumes:
      - ./data/car:/data:ro
    command: osrm-routed --algorithm mld /data/california-latest.osrm --max-table-size 10000
    mem_limit: 4g
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  osrm-frontend:
    image: osrm/osrm-frontend
    container_name: osrm-frontend
    restart: unless-stopped
    ports:
      - "9966:9966"
    environment:
      - OSRM_BACKEND=http://osrm-car:5000
    depends_on:
      - osrm-car
      - osrm-bicycle
      - osrm-motorcycle

  # Health check service
  healthcheck:
    image: alpine:latest
    container_name: osrm-healthcheck
    restart: unless-stopped
    command: |
      sh -c "while true; do
        for port in 5000 5001 5002; do
          wget -q -O- http://host.docker.internal:\$${port}/health || echo 'Service on port '\$${port}' is down'
        done
        sleep 60
      done"
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF

    log_info "Docker Compose configuration created."
}

create_nginx_config() {
    log_info "Creating Nginx configuration..."
    
    cat > /opt/osrm/config/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    # Upstream definitions
    upstream osrm_motorcycle {
        server localhost:5000;
        keepalive 32;
    }
    
    upstream osrm_bicycle {
        server localhost:5001;
        keepalive 32;
    }
    
    upstream osrm_car {
        server localhost:5002;
        keepalive 32;
    }

    # Cache configuration
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=osrm_cache:10m max_size=1g inactive=60m;
    proxy_cache_key "$scheme$request_method$host$request_uri";

    server {
        listen 8080;
        server_name localhost;

        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;

        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }

        # Motorcycle routing
        location ~ ^/route/v1/motorcycle/(.*) {
            proxy_pass http://osrm_motorcycle/route/v1/driving/$1$is_args$args;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_cache osrm_cache;
            proxy_cache_valid 200 1h;
            proxy_cache_bypass $arg_nocache;
        }

        # Bicycle routing
        location ~ ^/route/v1/bicycle/(.*) {
            proxy_pass http://osrm_bicycle/route/v1/cycling/$1$is_args$args;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_cache osrm_cache;
            proxy_cache_valid 200 1h;
            proxy_cache_bypass $arg_nocache;
        }

        # Car routing (no highways)
        location ~ ^/route/v1/car/(.*) {
            proxy_pass http://osrm_car/route/v1/driving/$1$is_args$args;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_cache osrm_cache;
            proxy_cache_valid 200 1h;
            proxy_cache_bypass $arg_nocache;
        }

        # Health check endpoint
        location /health {
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Cache status endpoint
        location /cache-status {
            return 200 "Cache: $upstream_cache_status\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

    log_info "Nginx configuration created."
}

start_services() {
    log_info "Starting OSRM services..."
    
    cd /opt/osrm
    docker-compose up -d
    
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    for port in 5000 5001 5002; do
        if curl -s "http://localhost:$port/health" > /dev/null; then
            log_info "Service on port $port is healthy"
        else
            log_error "Service on port $port failed to start"
        fi
    done
    
    log_info "All services started."
}

test_routing() {
    log_info "Testing routing endpoints..."
    
    # Test coordinates (Los Angeles to San Diego)
    coords="-118.2437,34.0522;-117.1611,32.7157"
    
    # Test each profile
    for profile in motorcycle bicycle car; do
        port=$((5000 + $(echo $profile | sed 's/motorcycle/0/;s/bicycle/1/;s/car/2/')))
        endpoint="http://localhost:$port/route/v1/driving/$coords?overview=false"
        
        log_info "Testing $profile profile..."
        response=$(curl -s -w "\n%{http_code}" "$endpoint")
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            log_info "  ✓ $profile routing works"
            distance=$(echo "$response" | head -n-1 | jq -r '.routes[0].distance' 2>/dev/null || echo "unknown")
            log_info "  Distance: $distance meters"
        else
            log_error "  ✗ $profile routing failed (HTTP $http_code)"
        fi
    done
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    sudo tee /etc/systemd/system/osrm.service > /dev/null << EOF
[Unit]
Description=OSRM Routing Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/osrm
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
ExecReload=/usr/bin/docker-compose restart

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable osrm.service
    
    log_info "Systemd service created and enabled."
}

create_update_script() {
    log_info "Creating update script..."
    
    cat > /opt/osrm/update-osm-data.sh << 'EOF'
#!/bin/bash

# OSRM Data Update Script

set -e

DATA_DIR="/opt/osrm/data"
PROFILES_DIR="/opt/osrm/profiles"
REGION_URL="https://download.geofabrik.de/north-america/us/california-latest.osm.pbf"
REGION_NAME="california-latest"
OSRM_VERSION="v5.27.1"

echo "$(date): Starting OSM data update..."

# Download new data
wget -O $DATA_DIR/raw/$REGION_NAME.osm.pbf.new $REGION_URL

# Process each profile
for profile in motorcycle bicycle car; do
    echo "Processing $profile profile..."
    
    # Extract
    docker run --rm -v $DATA_DIR:/data -v $PROFILES_DIR:/profiles \
        osrm/osrm-backend:$OSRM_VERSION \
        osrm-extract -p /profiles/${profile}-profile.lua \
        /data/raw/$REGION_NAME.osm.pbf.new \
        -o /data/${profile}_new/$REGION_NAME.osrm
    
    # Partition
    docker run --rm -v $DATA_DIR:/data \
        osrm/osrm-backend:$OSRM_VERSION \
        osrm-partition /data/${profile}_new/$REGION_NAME.osrm
    
    # Customize
    docker run --rm -v $DATA_DIR:/data \
        osrm/osrm-backend:$OSRM_VERSION \
        osrm-customize /data/${profile}_new/$REGION_NAME.osrm
    
    # Swap directories
    mv $DATA_DIR/$profile $DATA_DIR/${profile}_old
    mv $DATA_DIR/${profile}_new $DATA_DIR/$profile
    rm -rf $DATA_DIR/${profile}_old
done

# Update the main OSM file
mv $DATA_DIR/raw/$REGION_NAME.osm.pbf.new $DATA_DIR/raw/$REGION_NAME.osm.pbf

# Restart services
cd /opt/osrm && docker-compose restart

echo "$(date): OSM data update completed."
EOF

    chmod +x /opt/osrm/update-osm-data.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * 0 /opt/osrm/update-osm-data.sh >> /opt/osrm/logs/update.log 2>&1") | crontab -
    
    log_info "Update script created and scheduled."
}

print_summary() {
    echo
    echo "========================================"
    echo "OSRM Deployment Complete!"
    echo "========================================"
    echo
    echo "Services running on:"
    echo "  - Motorcycle: http://localhost:5000"
    echo "  - Bicycle:    http://localhost:5001"
    echo "  - Car:        http://localhost:5002"
    echo "  - Frontend:   http://localhost:9966"
    echo
    echo "API endpoints:"
    echo "  - http://localhost:8080/route/v1/motorcycle/{coords}"
    echo "  - http://localhost:8080/route/v1/bicycle/{coords}"
    echo "  - http://localhost:8080/route/v1/car/{coords}"
    echo
    echo "Management commands:"
    echo "  - sudo systemctl status osrm"
    echo "  - cd /opt/osrm && docker-compose logs -f"
    echo "  - /opt/osrm/update-osm-data.sh"
    echo
    echo "Next steps:"
    echo "  1. Configure SSL with certbot"
    echo "  2. Set up monitoring"
    echo "  3. Configure firewall rules"
    echo "  4. Update your application to use these endpoints"
    echo
}

# Main execution
main() {
    log_info "Starting OSRM deployment..."
    
    check_requirements
    setup_directories
    download_osm_data
    copy_profiles
    
    # Process each profile
    process_profile "motorcycle" "motorcycle-profile.lua"
    process_profile "bicycle" "bicycle-mtb-profile.lua"
    process_profile "car" "car-no-highway-profile.lua"
    
    create_docker_compose
    create_nginx_config
    start_services
    test_routing
    create_systemd_service
    create_update_script
    
    print_summary
    
    log_info "Deployment completed successfully!"
}

# Run main function
main "$@"