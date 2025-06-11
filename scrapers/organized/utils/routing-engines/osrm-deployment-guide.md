# OSRM Self-Hosted Deployment Guide

This guide covers setting up your own OSRM (Open Source Routing Machine) instance with custom Lua profiles to enable advanced routing preferences like "avoid highways", "avoid tolls", and vehicle-specific routing.

## Prerequisites

- Ubuntu 20.04 or newer (or Docker)
- At least 16GB RAM (32GB+ recommended for large regions)
- 100GB+ free disk space
- Basic command line knowledge

## Option 1: Docker Deployment (Recommended)

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

### 2. Create Directory Structure

```bash
mkdir -p ~/osrm-backend/{data,profiles,config}
cd ~/osrm-backend
```

### 3. Download OSM Data

Choose your region and download OSM data:

```bash
# Example: California
wget -P data/ https://download.geofabrik.de/north-america/us/california-latest.osm.pbf

# Example: Whole USA (large file ~8GB)
# wget -P data/ https://download.geofabrik.de/north-america/us-latest.osm.pbf

# Example: Custom area from BBBike
# https://extract.bbbike.org/
```

### 4. Copy Custom Profiles

```bash
# Copy the custom profiles we created
cp /path/to/motorcycle-profile.lua profiles/
cp /path/to/bicycle-mtb-profile.lua profiles/
cp /path/to/car-no-highway-profile.lua profiles/
```

### 5. Process Data with Each Profile

```bash
# Define region file
REGION="california-latest"

# Process for motorcycle routing
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract \
  -p /data/profiles/motorcycle-profile.lua \
  /data/data/${REGION}.osm.pbf

docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition \
  /data/data/${REGION}.osrm

docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize \
  /data/data/${REGION}.osrm

# Move processed files to profile-specific directory
mkdir -p data/motorcycle
mv data/${REGION}.osrm* data/motorcycle/

# Repeat for bicycle/MTB profile
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract \
  -p /data/profiles/bicycle-mtb-profile.lua \
  /data/data/${REGION}.osm.pbf

docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition \
  /data/data/${REGION}.osrm

docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize \
  /data/data/${REGION}.osrm

mkdir -p data/bicycle
mv data/${REGION}.osrm* data/bicycle/

# Repeat for car-no-highway profile
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract \
  -p /data/profiles/car-no-highway-profile.lua \
  /data/data/${REGION}.osm.pbf

docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition \
  /data/data/${REGION}.osrm

docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize \
  /data/data/${REGION}.osrm

mkdir -p data/car
mv data/${REGION}.osrm* data/car/
```

### 6. Create Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  osrm-motorcycle:
    image: osrm/osrm-backend
    container_name: osrm-motorcycle
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data/motorcycle:/data
    command: osrm-routed --algorithm mld /data/california-latest.osrm

  osrm-bicycle:
    image: osrm/osrm-backend
    container_name: osrm-bicycle
    restart: unless-stopped
    ports:
      - "5001:5000"
    volumes:
      - ./data/bicycle:/data
    command: osrm-routed --algorithm mld /data/california-latest.osrm

  osrm-car:
    image: osrm/osrm-backend
    container_name: osrm-car
    restart: unless-stopped
    ports:
      - "5002:5000"
    volumes:
      - ./data/car:/data
    command: osrm-routed --algorithm mld /data/california-latest.osrm

  # Nginx reverse proxy to route requests
  nginx:
    image: nginx:alpine
    container_name: osrm-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/ssl:/etc/nginx/ssl:ro
    depends_on:
      - osrm-motorcycle
      - osrm-bicycle
      - osrm-car
```

### 7. Create Nginx Configuration

Create `config/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream osrm_motorcycle {
        server osrm-motorcycle:5000;
    }
    
    upstream osrm_bicycle {
        server osrm-bicycle:5000;
    }
    
    upstream osrm_car {
        server osrm-car:5000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;

        # Route based on profile parameter
        location /route/v1/motorcycle {
            proxy_pass http://osrm_motorcycle/route/v1/driving;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /route/v1/bicycle {
            proxy_pass http://osrm_bicycle/route/v1/cycling;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /route/v1/car {
            proxy_pass http://osrm_car/route/v1/driving;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Health check
        location /health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### 8. Start Services

```bash
docker-compose up -d
```

### 9. Test the Endpoints

```bash
# Test motorcycle routing
curl "http://localhost:5000/route/v1/driving/-118.2437,34.0522;-117.1611,32.7157?overview=false"

# Test bicycle routing
curl "http://localhost:5001/route/v1/cycling/-118.2437,34.0522;-117.1611,32.7157?overview=false"

# Test car routing (avoiding highways)
curl "http://localhost:5002/route/v1/driving/-118.2437,34.0522;-117.1611,32.7157?overview=false"
```

## Option 2: Native Installation

### 1. Install Dependencies

```bash
sudo apt-get update
sudo apt-get install -y build-essential git cmake pkg-config \
  libbz2-dev libxml2-dev libzip-dev libboost-all-dev \
  lua5.2 liblua5.2-dev libtbb-dev
```

### 2. Build OSRM

```bash
git clone https://github.com/Project-OSRM/osrm-backend.git
cd osrm-backend
mkdir -p build
cd build
cmake ..
make -j$(nproc)
sudo make install
```

### 3. Process Data

Same as Docker steps but using native commands:

```bash
osrm-extract -p profiles/motorcycle-profile.lua data/region.osm.pbf
osrm-partition data/region.osrm
osrm-customize data/region.osrm
```

### 4. Run Server

```bash
osrm-routed --algorithm mld data/region.osrm
```

## Systemd Service Setup

Create `/etc/systemd/system/osrm-motorcycle.service`:

```ini
[Unit]
Description=OSRM Motorcycle Routing Service
After=network.target

[Service]
Type=simple
User=osrm
WorkingDirectory=/home/osrm/osrm-backend
ExecStart=/usr/local/bin/osrm-routed --algorithm mld /home/osrm/osrm-backend/data/motorcycle/region.osrm
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable osrm-motorcycle
sudo systemctl start osrm-motorcycle
```

## API Integration in Route Planner

Update your route planner to use the custom OSRM instance:

```javascript
class OSRMCustomRouter {
    constructor() {
        this.baseUrl = 'https://your-osrm-domain.com';
        this.profiles = {
            motorcycle: '/route/v1/motorcycle',
            bicycle: '/route/v1/bicycle',
            car: '/route/v1/car'
        };
    }
    
    async getRoute(waypoints, profile, options = {}) {
        const coordinates = waypoints
            .map(wp => `${wp.lng},${wp.lat}`)
            .join(';');
        
        const params = new URLSearchParams({
            overview: 'full',
            geometries: 'geojson',
            steps: true,
            ...options
        });
        
        const url = `${this.baseUrl}${this.profiles[profile]}/${coordinates}?${params}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            return this.processRoute(data.routes[0]);
        }
        
        throw new Error('No route found');
    }
    
    processRoute(route) {
        return {
            coordinates: route.geometry.coordinates.map(coord => ({
                lat: coord[1],
                lng: coord[0]
            })),
            distance: route.distance,
            duration: route.duration,
            steps: route.legs[0].steps
        };
    }
}
```

## Updating OSM Data

Set up a cron job to keep data fresh:

```bash
#!/bin/bash
# update-osm-data.sh

REGION="california-latest"
DATA_DIR="/home/osrm/osrm-backend/data"
PROFILES=("motorcycle" "bicycle" "car")

# Download new data
wget -O ${DATA_DIR}/${REGION}.osm.pbf.new \
  https://download.geofabrik.de/north-america/us/${REGION}.osm.pbf

# Process for each profile
for profile in "${PROFILES[@]}"; do
    osrm-extract -p ${DATA_DIR}/../profiles/${profile}-profile.lua \
      ${DATA_DIR}/${REGION}.osm.pbf.new
    
    osrm-partition ${DATA_DIR}/${REGION}.osrm
    osrm-customize ${DATA_DIR}/${REGION}.osrm
    
    # Move to profile directory
    mv ${DATA_DIR}/${REGION}.osrm* ${DATA_DIR}/${profile}/
done

# Restart services
systemctl restart osrm-*

# Cleanup
rm ${DATA_DIR}/${REGION}.osm.pbf.new
```

Add to crontab:
```bash
# Update OSM data weekly
0 2 * * 0 /home/osrm/update-osm-data.sh
```

## Monitoring

### Health Check Script

```bash
#!/bin/bash
# check-osrm-health.sh

ENDPOINTS=(
    "http://localhost:5000/route/v1/driving/-118.2437,34.0522;-117.1611,32.7157?overview=false"
    "http://localhost:5001/route/v1/cycling/-118.2437,34.0522;-117.1611,32.7157?overview=false"
    "http://localhost:5002/route/v1/driving/-118.2437,34.0522;-117.1611,32.7157?overview=false"
)

for endpoint in "${ENDPOINTS[@]}"; do
    response=$(curl -s -w "\n%{http_code}" "$endpoint")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" != "200" ]; then
        echo "ERROR: $endpoint returned $http_code"
        # Send alert
    fi
done
```

## Performance Tuning

### 1. Memory Settings

Edit `/etc/sysctl.conf`:
```
vm.overcommit_memory = 1
vm.swappiness = 1
```

### 2. OSRM Configuration

For large datasets, adjust MLD algorithm parameters:
```bash
osrm-customize --segment-speed-file speeds.csv data/region.osrm
```

### 3. Nginx Caching

Add caching to nginx.conf:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=osrm_cache:10m max_size=1g;

location /route {
    proxy_cache osrm_cache;
    proxy_cache_valid 200 1h;
    proxy_cache_key "$request_uri";
}
```

## Troubleshooting

### Common Issues

1. **Out of Memory during extraction**
   - Use `--max-table-size` parameter
   - Process smaller regions
   - Increase swap space

2. **Slow routing performance**
   - Enable contraction hierarchies
   - Use SSD storage
   - Optimize Lua profiles

3. **Docker permissions**
   - Ensure proper volume permissions
   - Use named volumes for better performance

## Next Steps

1. Set up SSL certificates using Let's Encrypt
2. Configure monitoring with Prometheus/Grafana
3. Implement request rate limiting
4. Add backup and disaster recovery procedures
5. Scale horizontally with multiple instances