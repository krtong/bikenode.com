# OSRM Custom Profile Setup Guide

## Overview
This guide explains how to set up a self-hosted OSRM instance with custom Lua profiles for enhanced motorcycle and bicycle routing.

## Prerequisites
- Docker or Linux server
- OSM data extract (.pbf file)
- Basic Lua knowledge

## Installation

### Using Docker (Recommended)
```bash
# Pull OSRM backend image
docker pull osrm/osrm-backend

# Download OSM data (example: California)
wget https://download.geofabrik.de/north-america/us/california-latest.osm.pbf
```

### Manual Installation
```bash
# Install dependencies
sudo apt-get install build-essential git cmake pkg-config \
libbz2-dev libxml2-dev libzip-dev libboost-all-dev \
lua5.3 liblua5.3-dev libtbb-dev

# Clone and build OSRM
git clone https://github.com/Project-OSRM/osrm-backend.git
cd osrm-backend
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .
sudo cmake --build . --target install
```

## Custom Profiles

### Motorcycle Profile with Preferences
Create `profiles/motorcycle.lua`:

```lua
-- Motorcycle routing profile with custom preferences
api_version = 4

Set = require('lib/set')
Sequence = require('lib/sequence')
Handlers = require("lib/way_handlers")
Relations = require("lib/relations")

function setup()
  return {
    properties = {
      max_speed_for_map_matching      = 180/3.6, -- 180kmph
      weight_name                     = 'duration',
      process_call_tagless_node      = false,
      u_turn_penalty                 = 20,
      continue_straight_at_waypoint  = true,
      use_turn_restrictions          = true,
      left_hand_driving              = false,
      traffic_light_penalty          = 2,
    },

    default_mode      = mode.driving,
    default_speed     = 10,
    
    -- Custom preferences
    avoid_highways    = false,
    prefer_twisty     = false,
    avoid_toll        = false,
    scenic_mode       = false,
    
    speeds = Sequence {
      highway = {
        motorway        = 120, -- Reduce if avoid_highways
        motorway_link   = 60,
        trunk           = 100,
        trunk_link      = 50,
        primary         = 80,
        primary_link    = 40,
        secondary       = 60,
        secondary_link  = 30,
        tertiary        = 40,
        tertiary_link   = 20,
        unclassified    = 30,
        residential     = 30,
        living_street   = 10,
        service         = 20,
        track           = 20,
      }
    },

    -- Penalties for different road features
    penalties = {
      toll            = 9000, -- Huge penalty if avoid_toll
      traffic_signal  = 2,
      crossing        = 2,
      traffic_calming = 10,
    },

    -- Surface penalties (for adventure motorcycles)
    surface_speeds = {
      asphalt         = 1.0,
      concrete        = 1.0,
      paved           = 1.0,
      fine_gravel     = 0.8,
      gravel          = 0.6,
      pebblestone     = 0.6,
      dirt            = 0.5,
      ground          = 0.5,
      unpaved         = 0.5,
      grass           = 0.3,
      mud             = 0.2,
      sand            = 0.2,
    }
  }
end

function process_way(profile, way, result, relations)
  -- Get basic attributes
  local highway = way:get_value_by_key("highway")
  local surface = way:get_value_by_key("surface")
  local toll = way:get_value_by_key("toll")
  
  -- Handle highway avoidance
  if profile.avoid_highways and 
     (highway == "motorway" or highway == "trunk") then
    result.forward_speed = 1  -- Very slow, effectively avoiding
    result.backward_speed = 1
    return
  end
  
  -- Handle toll avoidance
  if profile.avoid_toll and toll == "yes" then
    result.forward_speed = 1
    result.backward_speed = 1
    return
  end
  
  -- Get base speed
  local speed = profile.speeds.highway[highway]
  if not speed then
    return
  end
  
  -- Apply surface penalties
  if surface and profile.surface_speeds[surface] then
    speed = speed * profile.surface_speeds[surface]
  end
  
  -- Scenic mode - prefer smaller roads
  if profile.scenic_mode then
    if highway == "primary" or highway == "secondary" then
      speed = speed * 1.2  -- Slight preference
    elseif highway == "motorway" or highway == "trunk" then
      speed = speed * 0.5  -- Penalize highways
    end
  end
  
  -- Twisty roads preference (would need curve analysis)
  if profile.prefer_twisty then
    -- This would require geometry analysis
    -- For now, prefer tertiary roads (often twistier)
    if highway == "tertiary" or highway == "unclassified" then
      speed = speed * 1.1
    end
  end
  
  result.forward_speed = speed
  result.backward_speed = speed
  result.forward_mode = mode.driving
  result.backward_mode = mode.driving
end

function process_turn(profile, turn)
  -- Penalize u-turns
  if turn.angle == 0 then
    turn.weight = turn.weight + profile.properties.u_turn_penalty
  end
  
  -- Prefer straight/slight turns for comfort
  if math.abs(turn.angle) > 90 then
    turn.weight = turn.weight + 5
  end
end

return {
  setup = setup,
  process_way = process_way,
  process_turn = process_turn
}
```

### MTB Profile with Trail Preferences
Create `profiles/mtb.lua`:

```lua
-- Mountain bike profile with trail preferences
api_version = 4

Set = require('lib/set')
Sequence = require('lib/sequence')
Handlers = require("lib/way_handlers")

function setup()
  return {
    properties = {
      weight_name = 'duration',
      process_call_tagless_node = false,
      u_turn_penalty = 20,
      use_turn_restrictions = false,
      left_hand_driving = false,
      cycling_speed = 18,
    },

    default_mode = mode.cycling,
    default_speed = 15,
    
    -- MTB preferences
    prefer_singletrack = true,
    difficulty_level = 'intermediate', -- easy, intermediate, advanced, expert
    avoid_roads = false,
    
    speeds = Sequence {
      highway = {
        -- Roads (avoid if prefer trails)
        primary         = 15,
        secondary       = 18,
        tertiary        = 20,
        unclassified    = 20,
        residential     = 20,
        service         = 15,
        
        -- Cycling infrastructure
        cycleway        = 20,
        path            = 18,
        track           = 16,
        bridleway       = 16,
        footway         = 8,
        pedestrian      = 8,
        steps           = 2,
      }
    },

    -- Trail type preferences
    trail_speeds = {
      -- Track type (forest roads)
      grade1          = 20,  -- Paved/solid
      grade2          = 18,  -- Gravel/rock
      grade3          = 15,  -- Mostly firm
      grade4          = 12,  -- Mostly soft
      grade5          = 8,   -- Very soft
    },

    -- MTB difficulty scale
    mtb_scale_speeds = {
      ['0']  = 20,  -- Easy (green)
      ['1']  = 18,  -- Easy with obstacles
      ['2']  = 15,  -- Intermediate (blue)
      ['3']  = 12,  -- Difficult (black)
      ['4']  = 8,   -- Very difficult
      ['5']  = 5,   -- Extreme
      ['6']  = 2,   -- Unrideable for most
    },

    -- Surface speeds
    surface_speeds = {
      paved           = 1.0,
      asphalt         = 1.0,
      concrete        = 1.0,
      fine_gravel     = 0.95,
      gravel          = 0.85,
      pebblestone     = 0.85,
      compacted       = 0.9,
      dirt            = 0.85,
      earth           = 0.85,
      ground          = 0.8,
      grass           = 0.7,
      mud             = 0.5,
      sand            = 0.4,
      rock            = 0.7,
      roots           = 0.7,
    }
  }
end

function process_way(profile, way, result, relations)
  local highway = way:get_value_by_key("highway")
  local surface = way:get_value_by_key("surface")
  local tracktype = way:get_value_by_key("tracktype")
  local mtb_scale = way:get_value_by_key("mtb:scale")
  local bicycle = way:get_value_by_key("bicycle")
  local access = way:get_value_by_key("access")
  
  -- Check access
  if access == "no" or bicycle == "no" then
    return
  end
  
  -- Get base speed
  local speed = profile.speeds.highway[highway]
  if not speed then
    return
  end
  
  -- Prefer trails over roads
  if profile.prefer_singletrack then
    if highway == "path" or highway == "track" or highway == "bridleway" then
      speed = speed * 1.2  -- Boost trail preference
    elseif highway == "primary" or highway == "secondary" then
      speed = speed * 0.6  -- Penalize main roads
    end
  end
  
  -- Apply track type speed
  if tracktype and profile.trail_speeds[tracktype] then
    speed = math.min(speed, profile.trail_speeds[tracktype])
  end
  
  -- Apply MTB difficulty
  if mtb_scale then
    local scale_speed = profile.mtb_scale_speeds[mtb_scale]
    if scale_speed then
      -- Check difficulty preference
      if profile.difficulty_level == 'easy' and tonumber(mtb_scale) > 1 then
        speed = speed * 0.3  -- Heavily penalize difficult trails
      elseif profile.difficulty_level == 'expert' and tonumber(mtb_scale) < 3 then
        speed = speed * 0.8  -- Slightly penalize easy trails
      else
        speed = math.min(speed, scale_speed)
      end
    end
  end
  
  -- Apply surface penalty
  if surface and profile.surface_speeds[surface] then
    speed = speed * profile.surface_speeds[surface]
  end
  
  -- Avoid roads if requested
  if profile.avoid_roads and 
     (highway == "primary" or highway == "secondary" or 
      highway == "tertiary" or highway == "unclassified") then
    speed = speed * 0.3
  end
  
  result.forward_speed = speed
  result.backward_speed = speed
  result.forward_mode = mode.cycling
  result.backward_mode = mode.cycling
end

return {
  setup = setup,
  process_way = process_way
}
```

## Processing OSM Data

### With Custom Profiles
```bash
# Extract with motorcycle profile
osrm-extract -p profiles/motorcycle.lua california-latest.osm.pbf

# Route preprocessing
osrm-partition california-latest.osrm
osrm-customize california-latest.osrm

# Or with Docker
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /data/profiles/motorcycle.lua /data/california-latest.osm.pbf
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/california-latest.osrm
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/california-latest.osrm
```

## Running the Server

### Start OSRM Server
```bash
# Native
osrm-routed --algorithm=MLD california-latest.osrm

# Docker
docker run -t -i -p 5000:5000 -v $(pwd):/data osrm/osrm-backend osrm-routed --algorithm=MLD /data/california-latest.osrm
```

## API Integration

### Update Route Planner
```javascript
// In createRouter() function
createRouter() {
    const options = {
        serviceUrl: 'http://localhost:5000/route/v1',  // Your OSRM server
        profile: this.vehicleType === 'motorcycle' ? 'motorcycle' : 'cycling',
        timeout: 30 * 1000
    };
    
    // URL parameters for preferences
    const params = new URLSearchParams();
    
    if (this.preferences.avoidHighways) {
        params.append('avoid', 'motorway');
        params.append('avoid', 'trunk');
    }
    
    if (this.preferences.avoidTolls) {
        params.append('avoid', 'toll');
    }
    
    if (this.preferences.scenicRoute) {
        params.append('preference', 'scenic');
    }
    
    // Append to service URL
    if (params.toString()) {
        options.serviceUrl += '?' + params.toString();
    }
    
    return L.Routing.osrmv1(options);
}
```

## Multiple Profiles

To support multiple routing preferences without rebuilding:

1. Create profile variants:
   - `motorcycle-fast.lua` (highways preferred)
   - `motorcycle-scenic.lua` (avoid highways)
   - `motorcycle-twisty.lua` (prefer curves)
   - `mtb-easy.lua` (green trails)
   - `mtb-advanced.lua` (black trails)

2. Process each profile:
```bash
for profile in profiles/*.lua; do
    name=$(basename $profile .lua)
    osrm-extract -p $profile california-latest.osm.pbf -f $name
    osrm-partition california-$name.osrm
    osrm-customize california-$name.osrm
done
```

3. Run multiple instances:
```bash
# Different ports for different profiles
osrm-routed --port 5001 california-motorcycle-fast.osrm &
osrm-routed --port 5002 california-motorcycle-scenic.osrm &
osrm-routed --port 5003 california-mtb-easy.osrm &
```

## Next Steps

1. Set up automated OSM data updates
2. Implement profile switching in UI
3. Add more sophisticated preferences
4. Create profile testing suite
5. Monitor performance and optimize