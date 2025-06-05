# Motorcycle Data Schema

## Overview
This schema represents normalized motorcycle specification data scraped from motorcyclespecs.co.za.

## Schema Structure

### Root Object
- **manufacturer** (string): The motorcycle manufacturer name
- **model** (string): The motorcycle model name  
- **year** (number|null): The model year
- **specifications** (object): Normalized specification data
- **images** (array): Array of image objects
- **url** (string): Source URL
- **content** (string): Additional text content
- **metadata** (object): Page metadata
- **scraped_at** (string): ISO timestamp of when data was scraped

### Specifications Object

#### engine
- **type** (string): Engine configuration (e.g., "Single cylinder, 4-stroke, DOHC")
- **capacity** (string): Engine displacement (e.g., "652 cc / 39.8 cu in")
- **bore_stroke** (string): Bore and stroke measurements (e.g., "100 x 83 mm")
- **compression_ratio** (string): Compression ratio (e.g., "11.5:1")
- **cooling_system** (string): Cooling type (e.g., "Liquid cooled")
- **valves** (string): Valve configuration
- **fuel_system** (string): Fuel delivery system
- **ignition** (string): Ignition system type
- **starting** (string): Starting method (e.g., "Electric")
- **lubrication** (string): Oil system type

#### performance
- **max_power** (string): Maximum power output (e.g., "37.3 kW / 50 hp @ 6800 rpm")
- **max_torque** (string): Maximum torque (e.g., "62.3 Nm @ 5500 rpm")
- **top_speed** (string): Maximum speed
- **fuel_consumption** (string): Fuel economy
- **range** (string): Maximum range

#### transmission
- **gearbox** (string): Number of gears (e.g., "5 Speed")
- **clutch** (string): Clutch type
- **final_drive** (string): Final drive method (e.g., "Belt", "Chain", "Shaft")
- **primary_drive** (string): Primary drive type

#### suspension
- **front** (string): Front suspension description
- **rear** (string): Rear suspension description
- **front_travel** (string): Front suspension travel
- **rear_travel** (string): Rear suspension travel

#### brakes
- **front** (string): Front brake description
- **rear** (string): Rear brake description
- **abs** (string): ABS system info

#### wheels
- **front_tire** (string): Front tire size (e.g., "110/70 ZR17")
- **rear_tire** (string): Rear tire size (e.g., "160/60 ZR17")
- **front_wheel** (string): Front wheel/rim info
- **rear_wheel** (string): Rear wheel/rim info

#### dimensions
- **overall_length** (string): Total length
- **overall_width** (string): Total width
- **overall_height** (string): Total height
- **seat_height** (string): Seat height from ground
- **wheelbase** (string): Distance between wheels
- **ground_clearance** (string): Minimum ground clearance
- **trail** (string): Trail measurement
- **rake** (string): Steering head angle

#### weight
- **wet_weight** (string): Weight with fluids (e.g., "189 kg / 417 lbs")
- **dry_weight** (string): Weight without fluids
- **weight_incl_oil** (string): Weight including oil
- **payload** (string): Maximum carrying capacity

#### capacity
- **fuel_capacity** (string): Fuel tank size (e.g., "15 Litres / 4.0 US gal")
- **oil_capacity** (string): Oil capacity
- **reserve** (string): Reserve fuel amount

#### electrical
- **alternator** (string): Alternator/generator specs
- **battery** (string): Battery specifications
- **headlight** (string): Headlight type/power

#### equipment
- **instruments** (string): Dashboard/instrumentation
- **fairing** (string): Fairing type
- **exhaust** (string): Exhaust system
- **seat** (string): Seat type/configuration
- **other** (object): Additional unmapped specifications

### Image Object
- **url** (string): Image URL
- **alt** (string): Alt text
- **width** (number): Image width
- **height** (number): Image height

## Field Mappings
The transformer automatically maps various field names to the normalized schema:
- "Engine Type" → engine.type
- "Max Power" → performance.max_power
- "Front Brakes" → brakes.front
- etc.

## Usage Example
```javascript
const data = require('./scraped_data/motorcycles_normalized.json');

// Access normalized data
const motorcycle = data[0];
console.log(motorcycle.manufacturer); // "AC Schnitzer"
console.log(motorcycle.specifications.engine.capacity); // "652 cc / 39.8 cu in"
console.log(motorcycle.specifications.performance.max_power); // "37.3 kW / 50 hp @ 6800 rpm"
```
