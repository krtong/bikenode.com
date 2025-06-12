# Peraves Scraper

Scrapes cabin motorcycle data from Peraves/PERAVES CZ, manufacturer of the Ecomobile, MonoTracer, and MonoRacer series.

## Models Covered

### Historical Models
- **Ecomobile** (1984-2005)
  - BMW R100 variant (1984-1990)
  - BMW K100 variant (1991-2005)
  - 91 units produced

- **MonoTracer** (2005-2019)
  - BMW K1200RS engine
  - Turbocharged variant available
  - ~150 units produced

### Current Models
- **E-Tracer** (2010-present)
  - Electric drivetrain
  - X-Prize winner
  - 200+ MPGe efficiency

- **MonoRacer-130-E** (2020-present)
  - Current electric model
  - 400km range
  - EC certified

- **MonoRacer-K12** (2012-2016)
  - Petrol variant
  - Discontinued

## Data Sources

1. **Official Website**: https://www.peravescz.com/
2. **Wikipedia**: Historical data and specifications
3. **Model Database**: Pre-configured specifications in `models.js`

## Usage

```bash
# Run standalone
npm run scrape:peraves

# Or directly
node peraves/index.js
```

## Output

The scraper inserts data into:
- `motorcycle_data_make_model_year` - Basic model information
- `motorcycle_data_specs` - Detailed specifications in JSONB format

## Specifications Captured

- Dimensions (length, width, height, wheelbase)
- Weight (curb and gross)
- Performance (top speed, acceleration, range)
- Engine details (type, displacement, power)
- Cabin features (seating, safety equipment)
- Production numbers and status