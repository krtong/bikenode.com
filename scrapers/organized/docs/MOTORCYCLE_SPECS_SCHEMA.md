# Motorcycle Specifications Schema

## Overview
This document defines the comprehensive schema for motorcycle specifications data scraped from motorcyclespecs.co.za. The schema is designed to accommodate diverse motorcycle data while maintaining consistency and data quality.

## Schema Version: 1.0

## Core Structure

```typescript
interface MotorcycleData {
  // Required fields
  manufacturer: string;
  model: string;
  url: string;
  scraped_at: string; // ISO 8601 timestamp
  
  // Optional fields
  year?: number;
  content?: string;
  images?: Image[];
  metadata?: Record<string, any>;
  
  // Specifications
  specifications: Specifications;
}
```

## Specifications Structure

```typescript
interface Specifications {
  engine?: EngineSpecs;
  performance?: PerformanceSpecs;
  transmission?: TransmissionSpecs;
  suspension?: SuspensionSpecs;
  brakes?: BrakeSpecs;
  wheels?: WheelSpecs;
  dimensions?: DimensionSpecs;
  weight?: WeightSpecs;
  capacity?: CapacitySpecs;
  electrical?: ElectricalSpecs;
  equipment?: EquipmentSpecs;
}
```

### Engine Specifications
```typescript
interface EngineSpecs {
  type?: string;              // "Single cylinder, 4-stroke, DOHC, 4 valves"
  capacity?: string;          // "652 cc / 39.8 cu in"
  bore_stroke?: string;       // "100 x 83 mm"
  compression_ratio?: string; // "11.5:1"
  cooling_system?: string;    // "Liquid cooled" | "Air cooled" | "Oil cooled"
  valves?: string;           // "4 valves per cylinder"
  fuel_system?: string;      // "Fuel injection" | "Carburetor"
  ignition?: string;         // "Electronic ignition"
  starting?: string;         // "Electric" | "Kick" | "Electric & Kick"
  lubrication?: string;      // "Wet sump"
}
```

### Performance Specifications
```typescript
interface PerformanceSpecs {
  max_power?: string;         // "37.3 kW / 50 hp @ 6800 rpm"
  max_torque?: string;        // "62.3 Nm @ 5500 rpm"
  top_speed?: string;         // "180 km/h / 112 mph"
  fuel_consumption?: string;  // "5.2 L/100km"
  range?: string;             // "300 km"
}
```

### Transmission Specifications
```typescript
interface TransmissionSpecs {
  gearbox?: string;          // "5 Speed" | "6 Speed" | "CVT"
  clutch?: string;           // "Wet multi-plate"
  final_drive?: string;      // "Chain" | "Belt" | "Shaft"
  primary_drive?: string;    // "Gear"
}
```

### Suspension Specifications
```typescript
interface SuspensionSpecs {
  front?: string;            // "41 mm Telescopic fork"
  rear?: string;             // "Steel swingarm with progressive shock"
  front_travel?: string;     // "120 mm"
  rear_travel?: string;      // "110 mm"
}
```

### Brake Specifications
```typescript
interface BrakeSpecs {
  front?: string;            // "Single 300 mm disc, 2-piston caliper"
  rear?: string;             // "Single 240 mm disc, 1-piston caliper"
  abs?: string;              // "Standard" | "Optional" | "Not available"
}
```

### Wheel & Tire Specifications
```typescript
interface WheelSpecs {
  front_tire?: string;       // "110/70 ZR17"
  rear_tire?: string;        // "160/60 ZR17"
  front_wheel?: string;      // "17 inch cast aluminum"
  rear_wheel?: string;       // "17 inch cast aluminum"
}
```

### Dimension Specifications
```typescript
interface DimensionSpecs {
  overall_length?: string;   // "2100 mm"
  overall_width?: string;    // "780 mm"
  overall_height?: string;   // "1100 mm"
  seat_height?: string;      // "810 mm"
  wheelbase?: string;        // "1450 mm"
  ground_clearance?: string; // "160 mm"
  trail?: string;            // "98 mm"
  rake?: string;             // "25.5°"
}
```

### Weight Specifications
```typescript
interface WeightSpecs {
  wet_weight?: string;       // "189 kg / 417 lbs"
  dry_weight?: string;       // "165 kg / 364 lbs"
  weight_incl_oil?: string;  // "170 kg"
  payload?: string;          // "180 kg"
}
```

### Capacity Specifications
```typescript
interface CapacitySpecs {
  fuel_capacity?: string;    // "15 Litres / 4.0 US gal"
  oil_capacity?: string;     // "3.5 Litres"
  reserve?: string;          // "3 Litres"
}
```

### Electrical Specifications
```typescript
interface ElectricalSpecs {
  alternator?: string;       // "300W @ 5000 rpm"
  battery?: string;          // "12V 10Ah"
  headlight?: string;        // "H4 60/55W"
}
```

### Equipment Specifications
```typescript
interface EquipmentSpecs {
  instruments?: string;      // "Digital speedometer, tachometer"
  fairing?: string;          // "Full fairing"
  exhaust?: string;          // "2-into-1 stainless steel"
  seat?: string;             // "Dual seat"
  other?: Record<string, string>; // Additional unmapped specifications
}
```

### Image Structure
```typescript
interface Image {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}
```

## Data Validation Rules

### Required Fields
- `manufacturer`: Non-empty string
- `model`: Non-empty string
- `url`: Valid URL starting with http:// or https://
- `scraped_at`: ISO 8601 timestamp

### Pattern Validations
- **Engine capacity**: Must match pattern like "652 cc", "1000 CC", "1.0 L"
- **Power**: Must include unit like "50 hp", "37.3 kW", "50 PS"
- **Torque**: Must include unit like "62.3 Nm", "46 ft-lb"
- **Tire sizes**: Must match pattern like "110/70 ZR17", "120/80-16"
- **Weight**: Must include unit like "189 kg", "417 lbs"
- **Dimensions**: Must include unit like "2100 mm", "82.7 in"

### Enum Validations
- **Cooling system**: "Air cooled", "Liquid cooled", "Oil cooled", "Air/Oil cooled"
- **Starting**: "Electric", "Kick", "Electric & Kick"
- **Final drive**: "Chain", "Belt", "Shaft", "Direct"

## Field Mappings
The scraper automatically maps various field names found on the website:

| Source Field | Mapped To |
|-------------|-----------|
| "Engine Type" | `engine.type` |
| "Displacement" | `engine.capacity` |
| "Max Power" | `performance.max_power` |
| "Maximum Power" | `performance.max_power` |
| "Front Brakes" | `brakes.front` |
| "Wet-Weight" | `weight.wet_weight` |
| "Fuel Tank" | `capacity.fuel_capacity` |

## Usage Examples

### Basic Query
```javascript
// Find all sportbikes
motorcycles.filter(m => 
  m.specifications.equipment?.other?.category === 'Sport'
);
```

### Power Search
```javascript
// Find motorcycles with > 100hp
motorcycles.filter(m => {
  const power = m.specifications.performance?.max_power;
  if (!power) return false;
  const hp = parseInt(power.match(/(\d+)\s*hp/)?.[1] || '0');
  return hp > 100;
});
```

### Data Completeness Check
```javascript
// Check which motorcycles have complete engine specs
motorcycles.filter(m => {
  const engine = m.specifications.engine;
  return engine?.type && 
         engine?.capacity && 
         engine?.cooling_system;
});
```

## Data Quality Considerations

1. **Units**: Values often include mixed units (metric and imperial)
2. **Missing Data**: Not all motorcycles have complete specifications
3. **Format Variations**: Same data may be formatted differently
4. **Historical Data**: Older motorcycles may use different terminology

## Future Enhancements

1. **Unit Normalization**: Convert all measurements to standard units
2. **Data Enrichment**: Add calculated fields (e.g., power-to-weight ratio)
3. **Category Classification**: Auto-categorize motorcycles by type
4. **Image Analysis**: Extract additional data from images
5. **Cross-Reference**: Link to other motorcycle databases

## Version History

- **1.0** (2024-06-04): Initial schema definition based on motorcyclespecs.co.za data structure