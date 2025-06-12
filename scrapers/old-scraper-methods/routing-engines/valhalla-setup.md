# Valhalla Routing Engine Setup Guide

## Overview
Valhalla is an open-source routing engine with excellent elevation support, multi-modal routing, and highly flexible JSON-based configuration.

## Key Features
- Built-in elevation handling
- Time-based routing
- Multi-modal support (walk+transit)
- Isochrones
- Map matching
- Matrix API (many-to-many)
- Optimized routes (traveling salesman)

## Installation

### Using Docker (Recommended)
```bash
# Pull Valhalla image
docker pull valhalla/valhalla:run-latest

# Create directories
mkdir -p valhalla_tiles
mkdir -p valhalla_config
```

### Building from Source
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y cmake make libtool pkg-config g++ gcc curl unzip jq lcov protobuf-compiler vim-common locales libboost-all-dev libcurl4-openssl-dev zlib1g-dev liblz4-dev libprime-server-dev libprotobuf-dev prime-server-bin libgeos-dev libgeos++-dev libluajit-5.1-dev libspatialite-dev libsqlite3-dev wget sqlite3 spatialite-bin liblua5.3-dev lua5.3

# Clone and build
git clone https://github.com/valhalla/valhalla.git
cd valhalla
git submodule sync
git submodule update --init --recursive
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
sudo make install
```

## Configuration

### Create `valhalla.json`:
```json
{
  "mjolnir": {
    "max_cache_size": 1000000000,
    "use_lru": true,
    "timezone": "/path/to/timezone.sqlite",
    "admin": "/path/to/admin.sqlite",
    "tile_dir": "/path/to/valhalla_tiles",
    "traffic_extract": "/path/to/traffic.tar",
    "incident_dir": "/path/to/incidents",
    "shortcut_caching": true,
    "global_synchronized_cache": false,
    "logging": {
      "type": "std_out",
      "color": true
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
    "use_connectivity": true,
    "service_defaults": {
      "minimum_reachability": 50,
      "radius": 0,
      "search_cutoff": 35000,
      "node_snap_tolerance": 5,
      "street_side_tolerance": 5,
      "street_side_max_distance": 1000,
      "heading_tolerance": 60
    },
    "costing_options": {
      "auto": {
        "maneuver_penalty": 5,
        "destination_only_penalty": 600,
        "alley_penalty": 5,
        "gate_cost": 30,
        "gate_penalty": 300,
        "private_access_penalty": 450,
        "toll_booth_cost": 15,
        "toll_booth_penalty": 0,
        "ferry_cost": 300,
        "use_ferry": 1,
        "use_highways": 1,
        "use_tolls": 1,
        "use_living_streets": 0.5,
        "service_penalty": 15,
        "service_factor": 1,
        "country_crossing_cost": 600,
        "country_crossing_penalty": 0,
        "shortest": false,
        "exclude_unpaved": false,
        "closure_factor": 9,
        "top_speed": 140
      },
      "motorcycle": {
        "maneuver_penalty": 5,
        "destination_only_penalty": 100,
        "alley_penalty": 2,
        "gate_cost": 30,
        "gate_penalty": 300,
        "private_access_penalty": 100,
        "toll_booth_cost": 15,
        "toll_booth_penalty": 0,
        "ferry_cost": 300,
        "use_ferry": 1,
        "use_highways": 1,
        "use_tolls": 1,
        "use_trails": 0.5,
        "service_penalty": 15,
        "service_factor": 1,
        "country_crossing_cost": 600,
        "country_crossing_penalty": 0,
        "shortest": false,
        "exclude_unpaved": false,
        "exclude_cash_only_tolls": false,
        "top_speed": 160
      },
      "bicycle": {
        "maneuver_penalty": 10,
        "destination_only_penalty": 300,
        "alley_penalty": 0,
        "gate_cost": 30,
        "gate_penalty": 100,
        "private_access_penalty": 0,
        "country_crossing_cost": 600,
        "country_crossing_penalty": 0,
        "bicycle_type": "hybrid",
        "cycling_speed": 20,
        "use_roads": 0.5,
        "use_hills": 0.5,
        "use_ferry": 0.5,
        "use_living_streets": 0.5,
        "avoid_bad_surfaces": 0.25,
        "bss_return_cost": 120,
        "bss_return_penalty": 0,
        "shortest": false,
        "exclude_unpaved": false,
        "closure_factor": 9
      },
      "bikeshare": {
        "maneuver_penalty": 10,
        "destination_only_penalty": 300,
        "alley_penalty": 0,
        "gate_cost": 30,
        "gate_penalty": 100,
        "country_crossing_cost": 600,
        "country_crossing_penalty": 0,
        "bicycle_type": "hybrid",
        "cycling_speed": 20,
        "use_roads": 0.5,
        "use_hills": 0.5,
        "use_ferry": 0.5,
        "use_living_streets": 0.5,
        "avoid_bad_surfaces": 0.25,
        "bss_return_cost": 120,
        "bss_return_penalty": 0,
        "shortest": false,
        "exclude_unpaved": false
      },
      "pedestrian": {
        "walking_speed": 5.1,
        "walkway_factor": 1,
        "sidewalk_factor": 1,
        "alley_factor": 2,
        "driveway_factor": 5,
        "step_penalty": 0,
        "use_ferry": 1,
        "use_living_streets": 0.5,
        "use_tracks": 0,
        "service_penalty": 0,
        "service_factor": 1,
        "shortest": false,
        "use_hills": 0.5,
        "walking": 1,
        "wheelchair": 0,
        "max_hiking_difficulty": 1,
        "exclude_unpaved": false,
        "closure_factor": 9
      }
    }
  },
  "thor": {
    "logging": {
      "type": "std_out",
      "color": true,
      "long_request": 110
    },
    "extended_search": true,
    "source_to_target_algorithm": "select_optimal",
    "max_reserved_labels_count_astar": 2000000,
    "max_reserved_labels_count_bidir_astar": 1000000,
    "max_reserved_labels_count_dijkstras": 4000000,
    "max_reserved_labels_count_bidir_dijkstras": 2000000
  },
  "meili": {
    "auto": {
      "turn_penalty_factor": 200,
      "search_radius": 50
    },
    "bicycle": {
      "turn_penalty_factor": 140
    },
    "pedestrian": {
      "turn_penalty_factor": 100,
      "search_radius": 25
    },
    "max_grid_cache_size": 100000,
    "grid_size": 500
  },
  "service_limits": {
    "auto": {
      "max_distance": 5000000,
      "max_locations": 20,
      "max_matrix_distance": 400000,
      "max_matrix_location_pairs": 2500
    },
    "bicycle": {
      "max_distance": 500000,
      "max_locations": 50,
      "max_matrix_distance": 200000,
      "max_matrix_location_pairs": 2500
    },
    "pedestrian": {
      "max_distance": 250000,
      "max_locations": 50,
      "max_matrix_distance": 200000,
      "max_matrix_location_pairs": 2500
    },
    "transit": {
      "max_distance": 500000,
      "max_locations": 50,
      "max_matrix_distance": 200000,
      "max_matrix_location_pairs": 2500
    },
    "isochrone": {
      "max_contours": 4,
      "max_time_contour": 120,
      "max_distance": 25000,
      "max_locations": 1
    },
    "trace": {
      "max_distance": 200000,
      "max_gps_accuracy": 100,
      "max_search_radius": 100,
      "max_shape": 16000,
      "max_alternates": 3
    },
    "max_exclude_locations": 50,
    "max_radius": 200,
    "max_reachability": 100,
    "max_alternates": 2
  },
  "httpd": {
    "service": {
      "listen": "tcp://0.0.0.0:8002",
      "loopback": "ipc://valhalla.loopback",
      "interrupt": "ipc://valhalla.interrupt",
      "drain_seconds": 28,
      "shutdown_seconds": 1
    }
  }
}
```

## Building Tiles

### Download OSM Data
```bash
# California example
wget https://download.geofabrik.de/north-america/us/california-latest.osm.pbf
```

### Build Routing Tiles
```bash
# Using valhalla_build_tiles
valhalla_build_tiles -c valhalla.json california-latest.osm.pbf

# Or with Docker
docker run -it --rm -v $PWD:/data valhalla/valhalla:run-latest \
  valhalla_build_tiles -c /data/valhalla.json /data/california-latest.osm.pbf
```

### Download Elevation Data (Optional)
```bash
# Valhalla can download SRTM elevation tiles automatically
valhalla_build_elevation -c valhalla.json -b 32,-125,42,-114
```

## Running the Server

### Native
```bash
valhalla_service valhalla.json
```

### Docker
```bash
docker run -d -p 8002:8002 -v $PWD:/data --name valhalla \
  valhalla/valhalla:run-latest valhalla_service /data/valhalla.json
```

## API Usage Examples

### Basic Routing
```bash
# Motorcycle route
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 37.7749, "lon": -122.4194},
      {"lat": 37.3382, "lon": -121.8863}
    ],
    "costing": "motorcycle",
    "directions_options": {
      "units": "miles"
    }
  }'

# Bicycle route avoiding hills
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 37.7749, "lon": -122.4194},
      {"lat": 37.3382, "lon": -121.8863}
    ],
    "costing": "bicycle",
    "costing_options": {
      "bicycle": {
        "use_hills": 0.0,
        "avoid_bad_surfaces": 0.8,
        "bicycle_type": "road"
      }
    }
  }'
```

### Advanced Routing with Avoidance
```bash
# Avoid highways and tolls
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 37.7749, "lon": -122.4194},
      {"lat": 37.3382, "lon": -121.8863}
    ],
    "costing": "auto",
    "costing_options": {
      "auto": {
        "use_highways": 0.0,
        "use_tolls": 0.0
      }
    },
    "exclude_polygons": [],
    "exclude_locations": []
  }'

# MTB routing preferring trails
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 37.7749, "lon": -122.4194},
      {"lat": 37.3382, "lon": -121.8863}
    ],
    "costing": "bicycle",
    "costing_options": {
      "bicycle": {
        "bicycle_type": "mountain",
        "use_roads": 0.0,
        "use_trails": 1.0,
        "avoid_bad_surfaces": 0.0,
        "use_hills": 0.8
      }
    }
  }'
```

### Time-Based Routing
```bash
# Arrive by specific time
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 37.7749, "lon": -122.4194},
      {"lat": 37.3382, "lon": -121.8863}
    ],
    "costing": "auto",
    "date_time": {
      "type": 2,
      "value": "2024-01-15T09:00"
    }
  }'
```

### Alternative Routes
```bash
# Get 3 alternatives
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 37.7749, "lon": -122.4194},
      {"lat": 37.3382, "lon": -121.8863}
    ],
    "costing": "auto",
    "alternates": 3
  }'
```

### Isochrone (Time-based Reachability)
```bash
# 30-minute bicycle range
curl -X POST http://localhost:8002/isochrone \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 37.7749, "lon": -122.4194}
    ],
    "costing": "bicycle",
    "contours": [
      {"time": 15},
      {"time": 30}
    ],
    "costing_options": {
      "bicycle": {
        "bicycle_type": "hybrid"
      }
    }
  }'
```

### Map Matching
```bash
# Match GPS trace to roads
curl -X POST http://localhost:8002/trace_route \
  -H "Content-Type: application/json" \
  -d '{
    "shape": [
      {"lat": 37.7749, "lon": -122.4194, "time": 0},
      {"lat": 37.7751, "lon": -122.4180, "time": 60}
    ],
    "costing": "bicycle",
    "shape_match": "map_snap"
  }'
```

### Optimized Route (Traveling Salesman)
```bash
# Optimize waypoint order
curl -X POST http://localhost:8002/optimized_route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 37.7749, "lon": -122.4194},
      {"lat": 37.7588, "lon": -122.4065},
      {"lat": 37.7707, "lon": -122.4027},
      {"lat": 37.7833, "lon": -122.4167},
      {"lat": 37.7749, "lon": -122.4194}
    ],
    "costing": "bicycle"
  }'
```

## JavaScript Integration

```javascript
// Valhalla routing adapter
class ValhallaRouter {
    constructor(baseUrl = 'http://localhost:8002') {
        this.baseUrl = baseUrl;
    }
    
    async route(waypoints, options = {}) {
        const locations = waypoints.map(wp => ({
            lat: wp.latLng.lat,
            lon: wp.latLng.lng
        }));
        
        const request = {
            locations,
            costing: this.getCosting(options.vehicleType),
            costing_options: this.getCostingOptions(options),
            directions_options: {
                units: 'miles',
                language: 'en-US'
            },
            alternates: options.alternatives || 0
        };
        
        // Add exclusions
        if (options.avoidHighways || options.avoidTolls) {
            request.costing_options[request.costing] = {
                ...request.costing_options[request.costing],
                use_highways: options.avoidHighways ? 0.0 : 1.0,
                use_tolls: options.avoidTolls ? 0.0 : 1.0
            };
        }
        
        const response = await fetch(`${this.baseUrl}/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        
        const data = await response.json();
        return this.convertToLeafletFormat(data);
    }
    
    getCosting(vehicleType) {
        const mapping = {
            car: 'auto',
            motorcycle: 'motorcycle',
            bicycle: 'bicycle',
            walk: 'pedestrian',
            bikeshare: 'bikeshare'
        };
        return mapping[vehicleType] || 'auto';
    }
    
    getCostingOptions(options) {
        const costingOptions = {};
        const vehicleType = options.vehicleType || 'car';
        const costing = this.getCosting(vehicleType);
        
        if (vehicleType === 'bicycle') {
            costingOptions.bicycle = {
                bicycle_type: this.getBicycleType(options.surfaceType),
                use_roads: options.preferTrails ? 0.0 : 0.5,
                use_trails: options.preferTrails ? 1.0 : 0.5,
                avoid_bad_surfaces: options.surfaceType === 'paved' ? 1.0 : 0.0,
                use_hills: this.getHillPreference(options.elevationPreference)
            };
        } else if (vehicleType === 'motorcycle') {
            costingOptions.motorcycle = {
                use_trails: options.adventureMode ? 0.8 : 0.0,
                exclude_unpaved: options.avoidUnpaved || false
            };
        }
        
        return costingOptions;
    }
    
    getBicycleType(surfaceType) {
        const types = {
            paved: 'road',
            gravel: 'hybrid',
            mtb: 'mountain',
            any: 'hybrid'
        };
        return types[surfaceType] || 'hybrid';
    }
    
    getHillPreference(elevationPref) {
        const prefs = {
            flat: 0.0,
            moderate: 0.5,
            hilly: 1.0,
            any: 0.5
        };
        return prefs[elevationPref] || 0.5;
    }
    
    convertToLeafletFormat(valhallaResponse) {
        if (!valhallaResponse.trip) return null;
        
        const trip = valhallaResponse.trip;
        const route = {
            coordinates: [],
            instructions: [],
            summary: {
                totalDistance: trip.summary.length * 1000, // Convert to meters
                totalTime: trip.summary.time,
                totalAscent: trip.summary.ascent || 0,
                totalDescent: trip.summary.descent || 0
            }
        };
        
        // Decode shape
        route.coordinates = this.decodePolyline(trip.legs[0].shape);
        
        // Convert maneuvers to instructions
        trip.legs[0].maneuvers.forEach(maneuver => {
            route.instructions.push({
                type: this.convertManeuverType(maneuver.type),
                text: maneuver.instruction,
                distance: maneuver.length * 1000,
                time: maneuver.time,
                index: maneuver.begin_shape_index
            });
        });
        
        return route;
    }
    
    decodePolyline(encoded, precision = 6) {
        // Valhalla uses precision 6 by default
        const factor = Math.pow(10, precision);
        const coords = [];
        let index = 0;
        let lat = 0;
        let lng = 0;
        
        while (index < encoded.length) {
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
            
            coords.push(L.latLng(lat / factor, lng / factor));
        }
        
        return coords;
    }
}

// Use in route planner
const valhallaRouter = new ValhallaRouter();
```

## Custom Costing Models

### Adventure Motorcycle Profile
```json
{
  "motorcycle": {
    "maneuver_penalty": 3,
    "gate_cost": 15,
    "gate_penalty": 100,
    "private_access_penalty": 50,
    "toll_booth_cost": 10,
    "toll_booth_penalty": 0,
    "ferry_cost": 200,
    "use_ferry": 0.8,
    "use_highways": 0.7,
    "use_tolls": 0.8,
    "use_trails": 0.6,
    "service_penalty": 10,
    "service_factor": 0.9,
    "country_crossing_cost": 300,
    "country_crossing_penalty": 0,
    "shortest": false,
    "exclude_unpaved": false,
    "exclude_cash_only_tolls": false,
    "top_speed": 140,
    "surface_factor": {
      "paved": 1.0,
      "gravel": 0.8,
      "dirt": 0.6,
      "path": 0.4
    }
  }
}
```

### E-Bike Profile
```json
{
  "bicycle": {
    "bicycle_type": "hybrid",
    "cycling_speed": 25,
    "use_roads": 0.7,
    "use_hills": 0.8,
    "use_ferry": 0.5,
    "use_living_streets": 0.8,
    "avoid_bad_surfaces": 0.4,
    "shortest": false,
    "exclude_unpaved": false,
    "maneuver_penalty": 8,
    "gate_cost": 20,
    "gate_penalty": 50,
    "surface_factor": {
      "paved": 1.0,
      "gravel": 0.9,
      "dirt": 0.7,
      "path": 0.6
    }
  }
}
```

## Production Deployment

### Docker Compose
```yaml
version: '3.8'

services:
  valhalla:
    image: valhalla/valhalla:run-latest
    container_name: valhalla
    ports:
      - "8002:8002"
    volumes:
      - ./valhalla_tiles:/data/valhalla_tiles
      - ./valhalla.json:/valhalla.json
    command: valhalla_service /valhalla.json
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/status"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

### Nginx Proxy
```nginx
upstream valhalla {
    server localhost:8002;
    keepalive 32;
}

server {
    listen 80;
    server_name routing.example.com;
    
    location / {
        proxy_pass http://valhalla;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Caching
        proxy_cache_valid 200 10m;
        proxy_cache_bypass $http_pragma;
        proxy_cache_revalidate on;
    }
}
```

## Monitoring

### Health Check
```bash
curl http://localhost:8002/status
```

### Metrics
```bash
# Add to valhalla.json
"statsd": {
  "host": "localhost",
  "port": 8125,
  "prefix": "valhalla"
}
```

## Next Steps

1. Fine-tune costing models for specific use cases
2. Set up tile update pipeline
3. Implement result caching
4. Add request logging and analytics
5. Create custom bicycle/motorcycle profiles
6. Build comprehensive testing suite