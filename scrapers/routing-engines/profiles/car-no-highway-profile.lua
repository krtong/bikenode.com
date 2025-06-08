-- Car profile that avoids highways, motorways, and high-speed roads
-- Based on OSRM car profile but with highway avoidance

api_version = 4

Set = require('lib/set')
Sequence = require('lib/sequence')
Handlers = require("lib/way_handlers")
Relations = require("lib/relations")
TrafficSignal = require("lib/traffic_signal")
Measure = require("lib/measure")

function setup()
  local profile = {
    properties = {
      max_speed_for_map_matching      = 180/3.6, -- 180kmph -> m/s
      weight_name                     = 'duration',
      weight_precision                = 1,
      left_hand_driving               = false,
      u_turn_penalty                  = 20,
      turn_penalty                    = 7.5,
      turn_bias                       = 1.075,
      continue_straight_at_waypoint   = true,
      use_turn_restrictions           = true,
      max_angle                       = 30,
      
      -- Avoid highway parameters
      avoid_motorways                 = true,
      avoid_trunk                     = true,
      highway_penalty_factor          = 10.0,  -- Make highways very expensive
    },

    default_speed = 10,
    speeds = Sequence {
      -- Preferred road types (no highways)
      highway = {
        residential     = 25,
        living_street   = 10,
        service         = 15,
        
        -- Secondary roads preferred
        unclassified    = 25,
        tertiary        = 40,
        tertiary_link   = 30,
        secondary       = 50,
        secondary_link  = 35,
        primary         = 60,
        primary_link    = 45,
        
        -- Heavily penalize highway types
        trunk           = 5,   -- Was 85
        trunk_link      = 5,   -- Was 70
        motorway        = 5,   -- Was 90
        motorway_link   = 5,   -- Was 45
      }
    },

    route_speeds = {
      ferry = 5,
      shuttle_train = 10
    },

    railway_speeds = {},
    platform_speeds = {},
    amenity_speeds = {},
    man_made_speeds = {},
    
    avoid = Set {
      'construction',
      'proposed',
      'raceway',
      'bridleway',
      'path',
      'cycleway',
      'footway',
      'pedestrian',
      'steps',
      'track'
    },

    speeds_file = nil,
    turn_penalty = 7.5,
    turn_bias = 1.075,

    -- Penalties for undesired road features
    service_penalties = {
      alley         = 20,
      parking       = 25,
      parking_aisle = 25,
      driveway      = 50,
      ["drive-through"] = 15,
      ["drive-thru"] = 15
    },

    restricted_highway_whitelist = Set {
      'motorway',
      'motorway_link',
      'trunk',
      'trunk_link',
      'primary',
      'primary_link',
      'secondary',
      'secondary_link',
      'tertiary',
      'tertiary_link',
      'residential',
      'living_street',
      'unclassified',
      'service'
    },

    construction_whitelist = Set {},

    access_tag_whitelist = Set {
      'yes',
      'motorcar',
      'motor_vehicle',
      'vehicle',
      'permissive',
      'designated',
      'hov',
      'customers'
    },

    access_tag_blacklist = Set {
      'no',
      'agricultural',
      'forestry',
      'emergency',
      'psv',
      'delivery'
    },

    restricted_access_tag_list = Set {
      'private',
      'delivery',
      'destination',
      'customers'
    },

    access_tags_hierarchy = Sequence {
      'motorcar',
      'motor_vehicle',
      'vehicle',
      'access'
    },

    service_tag_forbidden = Set {
      'emergency_access'
    },

    restrictions = Sequence {
      'motorcar',
      'motor_vehicle',
      'vehicle'
    },

    classes = Sequence {
      'toll',
      'motorway',
      'ferry',
      'restricted',
      'tunnel'
    },

    -- Avoid tolls by default when avoiding highways
    avoid_tolls = true,

    -- Surface penalties to prefer better roads
    surface_speeds = {
      asphalt = 1.0,
      concrete = 1.0,
      ["concrete:plates"] = 0.9,
      ["concrete:lanes"] = 0.9,
      paved = 1.0,
      cement = 0.9,
      compacted = 0.9,
      fine_gravel = 0.9,
      paving_stones = 0.8,
      metal = 0.8,
      wood = 0.8,
      cobblestone = 0.6,
      gravel = 0.6,
      unpaved = 0.5,
      ground = 0.5,
      dirt = 0.5,
      pebblestone = 0.5,
      tartan = 0.5,
      grass = 0.3,
      mud = 0.2,
      sand = 0.2
    },

    -- Prefer routes through cities/towns over highways
    place_speeds = {
      city = 1.2,
      town = 1.1,
      village = 1.0,
      hamlet = 0.9
    },

    tracktype_speeds = {
      grade1 = 0.7,
      grade2 = 0.5,
      grade3 = 0.3,
      grade4 = 0.1,
      grade5 = 0.1
    },

    smoothness_speeds = {
      excellent = 1.0,
      good = 0.9,
      intermediate = 0.8,
      bad = 0.6,
      very_bad = 0.4,
      horrible = 0.2,
      very_horrible = 0.1,
      impassable = 0.0
    },

    maxspeed_table_default = {
      urban = 50,
      rural = 90,
      trunk = 110,
      motorway = 130
    },

    side_road_multiplier = 0.8,
    turn_penalty = 7.5,
    properties = {
      max_speed_for_map_matching      = 180/3.6,
      weight_name                     = 'duration',
      weight_precision                = 1,
      left_hand_driving               = false,
      u_turn_penalty                  = 20,
      turn_penalty                    = 7.5,
      turn_bias                       = 1.075,
      continue_straight_at_waypoint   = true,
      use_turn_restrictions           = true,
      max_angle                       = 30,
    },

    traffic_light_penalty = 15,
    u_turn_penalty = 20,
    barrier_penalty = 50,

    height = 2.5, -- meters
    width = 2.0,  -- meters
    length = 5.0, -- meters
    weight = 3500 -- kilograms
  }

  return profile
end

function process_node(profile, node, result, relations)
  -- Handle traffic signals
  local traffic_signal = node:get_value_by_key("highway")
  if traffic_signal == "traffic_signals" then
    result.traffic_lights = true
  end

  -- Handle barriers
  local barrier = node:get_value_by_key("barrier")
  if barrier then
    local access = node:get_value_by_key("access")
    local motor_vehicle = node:get_value_by_key("motor_vehicle")
    
    if access == "no" or motor_vehicle == "no" then
      result.barrier = true
    end
  end
end

function process_way(profile, way, result, relations)
  local highway = way:get_value_by_key("highway")
  local route = way:get_value_by_key("route")
  local bridge = way:get_value_by_key("bridge")

  if not highway and not route and not bridge then
    return
  end

  -- Check if way is accessible
  local access = way:get_value_by_key("access")
  local motor_vehicle = way:get_value_by_key("motor_vehicle")
  local motorcar = way:get_value_by_key("motorcar")
  
  -- Block restricted access
  if profile.access_tag_blacklist[access] or 
     profile.access_tag_blacklist[motor_vehicle] or 
     profile.access_tag_blacklist[motorcar] then
    result.forward_mode = 0
    result.backward_mode = 0
    return
  end

  -- Get default speed
  local highway_speed = profile.speeds.highway[highway]
  
  if not highway_speed then
    -- Not a driveable way
    return
  end

  -- Apply heavy penalty to highways
  if highway == "motorway" or highway == "motorway_link" or 
     highway == "trunk" or highway == "trunk_link" then
    if profile.properties.avoid_motorways then
      highway_speed = highway_speed / profile.properties.highway_penalty_factor
    end
  end

  -- Check for maxspeed
  local maxspeed = tonumber(way:get_value_by_key("maxspeed") or "")
  if maxspeed and maxspeed > 0 then
    highway_speed = math.min(highway_speed, maxspeed)
  end

  -- Surface speed adjustments
  local surface = way:get_value_by_key("surface")
  if surface and profile.surface_speeds[surface] then
    highway_speed = highway_speed * profile.surface_speeds[surface]
  end

  -- Set speed and mode
  result.forward_speed = highway_speed
  result.backward_speed = highway_speed
  result.forward_mode = 1
  result.backward_mode = 1

  -- Handle oneways
  local oneway = way:get_value_by_key("oneway")
  if oneway == "yes" or oneway == "1" or oneway == "true" then
    result.backward_mode = 0
  elseif oneway == "-1" then
    result.forward_mode = 0
  end

  -- Name
  local name = way:get_value_by_key("name")
  if name then
    result.name = name
  end

  -- Roundabout
  local junction = way:get_value_by_key("junction")
  if junction == "roundabout" then
    result.roundabout = true
  end

  -- Handle ferries
  if route == "ferry" then
    result.forward_mode = 1
    result.backward_mode = 1
    result.forward_speed = profile.route_speeds.ferry
    result.backward_speed = profile.route_speeds.ferry
  end

  -- Classes for exclusion
  if highway == "motorway" or highway == "motorway_link" then
    result.classes["motorway"] = true
  end
  
  local toll = way:get_value_by_key("toll")
  if toll and toll ~= "no" then
    result.classes["toll"] = true
  end
  
  if route == "ferry" then
    result.classes["ferry"] = true
  end
end

function process_turn(profile, turn)
  local penalty = profile.turn_penalty
  
  -- Increase penalty for turns onto highways
  if turn.has_traffic_light then
    penalty = penalty + profile.traffic_light_penalty
  end
  
  -- Add penalty for u-turns
  if turn.angle < -170 or turn.angle > 170 then
    penalty = penalty + profile.u_turn_penalty
  end
  
  turn.weight = penalty
  turn.duration = penalty
end

return {
  setup = setup,
  process_node = process_node,
  process_way = process_way,
  process_turn = process_turn
}