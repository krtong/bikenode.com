# GraphHopper Self-Hosted Setup Guide

## Overview
GraphHopper is a fast and memory-efficient routing engine that supports multiple routing profiles and real-time preference changes without rebuilding the graph.

## Key Advantages
- Multiple profiles in one instance
- Real-time avoid parameters
- Built-in elevation support
- MTB profile out of the box
- Alternative routes
- Isochrone generation

## Installation

### Prerequisites
```bash
# Java 11 or newer
sudo apt install openjdk-11-jdk

# Or check version
java -version
```

### Download GraphHopper
```bash
# Create directory
mkdir graphhopper && cd graphhopper

# Download latest release
wget https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/7.0/graphhopper-web-7.0.jar

# Download config template
wget https://raw.githubusercontent.com/graphhopper/graphhopper/master/config-example.yml
mv config-example.yml config.yml
```

### Download OSM Data
```bash
# Example: California
wget https://download.geofabrik.de/north-america/us/california-latest.osm.pbf
```

## Configuration

### Create `config.yml`:
```yaml
graphhopper:
  # Data directory
  graph.location: graph-cache
  
  # OSM file
  datareader.file: california-latest.osm.pbf
  
  # Elevation
  graph.elevation.provider: srtm
  graph.elevation.cache_dir: ./elevation-cache/
  graph.elevation.dataaccess: RAM_STORE
  
  # Enable turn costs
  graph.encoded_values: |
    road_class,
    road_environment,
    max_speed,
    surface,
    track_type,
    smoothness,
    toll,
    bike_access,
    mtb_rating,
    hike_rating,
    hazmat,
    hazmat_water,
    lanes,
    osm_way_id
    
  # Routing profiles
  profiles:
    - name: car
      vehicle: car
      weighting: fastest
      turn_costs: true
      
    - name: car_avoid_ferry
      vehicle: car
      weighting: custom
      turn_costs: true
      custom_model_files: [car_avoid_ferry.json]
      
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
      weighting: custom
      turn_costs: false
      custom_model_files: [racingbike.json]
      
    - name: hike
      vehicle: hike
      weighting: custom
      turn_costs: false
      custom_model_files: [hike.json]

  # Enable CH (Contraction Hierarchies) for speed
  profiles_ch:
    - profile: car
    - profile: motorcycle
    - profile: bike

  # Enable LM (Landmark) for flexibility
  profiles_lm:
    - profile: car
    - profile: motorcycle
    - profile: bike
    - profile: mtb

  # Server
  server:
    application_connectors:
      - type: http
        port: 8989
    request_log:
      appenders: []
    
  # Import settings
  import.osm.ignored_highways: footway,cycleway,path,pedestrian,steps,track,bridleway,platform,piste
  
  # API settings
  routing.non_ch.max_waypoint_distance: 100000
```

### Custom Profile: Motorcycle
Create `motorcycle.json`:
```json
{
  "priority": [
    {
      "if": "road_class == MOTORWAY",
      "multiply_by": "0.8"
    },
    {
      "if": "road_class == TRUNK",
      "multiply_by": "0.9"
    },
    {
      "if": "road_class == PRIMARY",
      "multiply_by": "1.0"
    },
    {
      "if": "road_class == SECONDARY",
      "multiply_by": "1.1"
    },
    {
      "if": "road_class == TERTIARY",
      "multiply_by": "1.2"
    },
    {
      "if": "surface == ASPHALT || surface == CONCRETE",
      "multiply_by": "1.0"
    },
    {
      "if": "surface == GRAVEL || surface == DIRT",
      "multiply_by": "0.6"
    },
    {
      "if": "surface == SAND || surface == MUD",
      "multiply_by": "0.3"
    }
  ],
  "speed": [
    {
      "if": "road_class == MOTORWAY",
      "limit_to": "130"
    },
    {
      "if": "road_class == TRUNK",
      "limit_to": "110"
    },
    {
      "if": "road_class == PRIMARY",
      "limit_to": "90"
    },
    {
      "if": "road_class == SECONDARY",
      "limit_to": "70"
    },
    {
      "if": "road_class == TERTIARY",
      "limit_to": "60"
    },
    {
      "if": "surface == GRAVEL",
      "limit_to": "40"
    },
    {
      "if": "surface == DIRT",
      "limit_to": "30"
    }
  ],
  "distance_influence": 90
}
```

### Custom Profile: MTB Advanced
Create `mtb.json`:
```json
{
  "priority": [
    {
      "if": "road_class == PATH || road_class == TRACK",
      "multiply_by": "1.5"
    },
    {
      "if": "road_class == CYCLEWAY",
      "multiply_by": "1.2"
    },
    {
      "if": "road_class == PRIMARY || road_class == SECONDARY",
      "multiply_by": "0.5"
    },
    {
      "if": "road_class == MOTORWAY || road_class == TRUNK",
      "multiply_by": "0"
    },
    {
      "if": "mtb_rating == 0",
      "multiply_by": "1.0"
    },
    {
      "if": "mtb_rating == 1",
      "multiply_by": "1.1"
    },
    {
      "if": "mtb_rating == 2",
      "multiply_by": "1.2"
    },
    {
      "if": "mtb_rating == 3",
      "multiply_by": "1.3"
    },
    {
      "if": "mtb_rating == 4",
      "multiply_by": "1.0"
    },
    {
      "if": "mtb_rating == 5",
      "multiply_by": "0.7"
    },
    {
      "if": "mtb_rating == 6",
      "multiply_by": "0.4"
    },
    {
      "if": "track_type == GRADE1",
      "multiply_by": "1.0"
    },
    {
      "if": "track_type == GRADE2",
      "multiply_by": "1.1"
    },
    {
      "if": "track_type == GRADE3",
      "multiply_by": "1.2"
    },
    {
      "if": "track_type == GRADE4",
      "multiply_by": "1.1"
    },
    {
      "if": "track_type == GRADE5",
      "multiply_by": "0.9"
    },
    {
      "if": "surface == DIRT || surface == EARTH || surface == GROUND",
      "multiply_by": "1.2"
    },
    {
      "if": "surface == GRAVEL || surface == FINE_GRAVEL",
      "multiply_by": "1.1"
    },
    {
      "if": "surface == ASPHALT || surface == PAVED",
      "multiply_by": "0.8"
    }
  ],
  "speed": [
    {
      "if": "road_class == PATH",
      "limit_to": "15"
    },
    {
      "if": "road_class == TRACK",
      "limit_to": "18"
    },
    {
      "if": "mtb_rating >= 4",
      "limit_to": "8"
    },
    {
      "if": "surface == MUD",
      "limit_to": "6"
    },
    {
      "if": "surface == SAND",
      "limit_to": "5"
    }
  ],
  "distance_influence": 70
}
```

### Custom Profile: Scenic Bike
Create `bike_scenic.json`:
```json
{
  "priority": [
    {
      "if": "road_environment == FERRY || road_environment == BRIDGE",
      "multiply_by": "1.2"
    },
    {
      "if": "road_class == CYCLEWAY",
      "multiply_by": "1.3"
    },
    {
      "if": "road_class == RESIDENTIAL || road_class == LIVING_STREET",
      "multiply_by": "1.1"
    },
    {
      "if": "road_class == PRIMARY || road_class == TRUNK",
      "multiply_by": "0.4"
    },
    {
      "if": "road_class == MOTORWAY",
      "multiply_by": "0"
    },
    {
      "if": "surface == ASPHALT || surface == PAVED",
      "multiply_by": "1.0"
    },
    {
      "if": "surface == COMPACTED || surface == FINE_GRAVEL",
      "multiply_by": "0.9"
    }
  ],
  "speed": [
    {
      "if": "road_class == CYCLEWAY",
      "limit_to": "18"
    },
    {
      "if": "surface == GRAVEL",
      "limit_to": "12"
    },
    {
      "if": "surface == SAND",
      "limit_to": "6"
    }
  ],
  "distance_influence": 60
}
```

## Import and Run

### Import OSM Data
```bash
# This will take time and memory (set -Xmx4g for 4GB heap)
java -Xmx4g -jar graphhopper-web-7.0.jar import config.yml
```

### Start Server
```bash
# Run server
java -Xmx2g -jar graphhopper-web-7.0.jar server config.yml

# Server will be available at http://localhost:8989
```

## API Usage Examples

### Basic Route Request
```bash
# Motorcycle route with avoid motorway
curl "http://localhost:8989/route?point=37.7749,-122.4194&point=37.3382,-121.8863&profile=motorcycle&avoid=motorway"

# MTB route preferring trails
curl "http://localhost:8989/route?point=37.7749,-122.4194&point=37.3382,-121.8863&profile=mtb"

# Bike route avoiding ferry
curl "http://localhost:8989/route?point=37.7749,-122.4194&point=37.3382,-121.8863&profile=bike&avoid=ferry"
```

### Advanced Requests with Custom Model
```bash
# POST request with inline custom model
curl -X POST -H "Content-Type: application/json" \
  "http://localhost:8989/route" \
  -d '{
    "points": [
      [37.7749, -122.4194],
      [37.3382, -121.8863]
    ],
    "profile": "bike",
    "custom_model": {
      "priority": [
        {
          "if": "road_class == CYCLEWAY",
          "multiply_by": "2.0"
        },
        {
          "if": "surface == ASPHALT",
          "multiply_by": "1.5"
        }
      ],
      "avoid": {
        "surface": ["sand", "mud"],
        "road_class": ["motorway", "trunk"]
      }
    },
    "elevation": true,
    "instructions": true,
    "points_encoded": false
  }'
```

### Alternative Routes
```bash
# Get 3 alternative routes
curl "http://localhost:8989/route?point=37.7749,-122.4194&point=37.3382,-121.8863&profile=bike&algorithm=alternative_route&alternative_route.max_paths=3"
```

### Isochrone (Reachability)
```bash
# 30-minute bike range
curl "http://localhost:8989/isochrone?point=37.7749,-122.4194&profile=bike&time_limit=1800"
```

## JavaScript Integration

```javascript
// Update createRouter for GraphHopper
createGraphHopperRouter() {
    const baseUrl = 'http://localhost:8989/route';
    
    return {
        route: async function(waypoints, callback) {
            const points = waypoints.map(wp => 
                `point=${wp.latLng.lat},${wp.latLng.lng}`
            ).join('&');
            
            // Build URL with preferences
            const params = new URLSearchParams({
                profile: this.vehicleType === 'motorcycle' ? 'motorcycle' : 'bike',
                locale: 'en',
                elevation: true,
                instructions: true,
                points_encoded: false
            });
            
            // Add avoid parameters
            if (this.preferences.avoidHighways) {
                params.append('avoid', 'motorway');
                params.append('avoid', 'trunk');
            }
            
            if (this.preferences.avoidTolls) {
                params.append('avoid', 'toll');
            }
            
            if (this.preferences.avoidFerry) {
                params.append('avoid', 'ferry');
            }
            
            // Surface preferences for bikes
            if (this.vehicleType === 'bicycle' && this.preferences.surfaceType) {
                params.append('custom_model', JSON.stringify({
                    priority: this.getSurfacePriorities(this.preferences.surfaceType)
                }));
            }
            
            const url = `${baseUrl}?${points}&${params}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.paths && data.paths.length > 0) {
                    const route = this.convertGraphHopperRoute(data.paths[0]);
                    callback(null, [route]);
                } else {
                    callback('No route found');
                }
            } catch (error) {
                callback(error);
            }
        },
        
        convertGraphHopperRoute: function(ghPath) {
            // Convert GraphHopper format to Leaflet routing format
            return {
                coordinates: ghPath.points.coordinates.map(c => L.latLng(c[1], c[0])),
                instructions: ghPath.instructions.map(inst => ({
                    type: this.convertInstructionType(inst.sign),
                    text: inst.text,
                    distance: inst.distance,
                    time: inst.time / 1000,
                    index: inst.interval[0]
                })),
                summary: {
                    totalDistance: ghPath.distance,
                    totalTime: ghPath.time / 1000,
                    totalAscent: ghPath.ascend,
                    totalDescent: ghPath.descend
                }
            };
        }
    };
}

// Surface priority helper
getSurfacePriorities(surfaceType) {
    const priorities = {
        paved: [
            { if: "surface == ASPHALT || surface == PAVED", multiply_by: "1.5" },
            { if: "surface == GRAVEL || surface == DIRT", multiply_by: "0.5" }
        ],
        gravel: [
            { if: "surface == GRAVEL || surface == COMPACTED", multiply_by: "1.5" },
            { if: "surface == ASPHALT", multiply_by: "0.8" }
        ],
        mtb: [
            { if: "surface == DIRT || surface == GROUND", multiply_by: "1.5" },
            { if: "surface == ASPHALT", multiply_by: "0.6" }
        ]
    };
    
    return priorities[surfaceType] || [];
}
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM openjdk:11-jre-slim

RUN apt-get update && apt-get install -y wget

WORKDIR /graphhopper

# Download GraphHopper
RUN wget https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/7.0/graphhopper-web-7.0.jar

# Copy config and profiles
COPY config.yml .
COPY *.json .

# Copy OSM data
COPY *.osm.pbf .

# Import data
RUN java -Xmx4g -jar graphhopper-web-7.0.jar import config.yml

# Expose port
EXPOSE 8989

# Run server
CMD ["java", "-Xmx2g", "-jar", "graphhopper-web-7.0.jar", "server", "config.yml"]
```

## Performance Tuning

### Memory Settings
```bash
# For import (large regions need more)
java -Xmx8g -XX:+UseG1GC -jar graphhopper-web-7.0.jar import config.yml

# For server
java -Xmx4g -XX:+UseG1GC -jar graphhopper-web-7.0.jar server config.yml
```

### Caching
```yaml
# In config.yml
graphhopper:
  # Enable memory mapping for better performance
  graph.dataaccess: MMAP
  
  # Prepare min network size for CH
  prepare.ch.edge_based: false
  prepare.ch.threads: 4
  
  # LM preparation
  prepare.lm.threads: 4
  prepare.lm.landmarks: 16
```

## Advanced Features

### 1. Turn Restrictions
Already enabled with `turn_costs: true`

### 2. Time-Dependent Routing
```json
{
  "points": [[lat1, lon1], [lat2, lon2]],
  "profile": "car",
  "departure": "2024-01-15T08:00:00",
  "traffic": true
}
```

### 3. Round Trip
```bash
curl "http://localhost:8989/route?point=37.7749,-122.4194&profile=bike&algorithm=round_trip&round_trip.distance=20000&round_trip.seed=123"
```

### 4. Map Matching
```bash
# Match GPS track to roads
curl -X POST -H "Content-Type: application/json" \
  "http://localhost:8989/match" \
  -d '{
    "profile": "car",
    "points": [
      {"lat": 37.7749, "lon": -122.4194, "time": 1000},
      {"lat": 37.7751, "lon": -122.4180, "time": 1060}
    ]
  }'
```

## Next Steps

1. Fine-tune custom profiles for your needs
2. Set up automatic OSM data updates
3. Implement caching layer
4. Add monitoring and metrics
5. Create profile A/B testing
6. Build UI for all features