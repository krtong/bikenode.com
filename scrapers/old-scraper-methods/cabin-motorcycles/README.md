# Cabin Motorcycles Scraper

This project contains web scrapers for various cabin motorcycle manufacturers, including historical and current models.

## Manufacturers Covered

### Active Manufacturers
- **Peraves/PERAVES CZ** - MonoRacer, MonoTracer, Ecomobile, E-Tracer
- **Honda** - Gyro Canopy
- **Lit Motors** - C-1 (prototype)

### Historical/Discontinued
- **BMW** - C1 (2000-2002)
- **Benelli** - Adiva
- **Quasar** (1975-1982)

## Installation

```bash
npm install
```

## Usage

### Scrape all manufacturers:
```bash
npm run scrape:all
```

### Scrape specific manufacturer:
```bash
npm run scrape:peraves
npm run scrape:bmw
npm run scrape:honda
npm run scrape:lit
```

## Database Schema

The scrapers insert data into the PostgreSQL motorcycle tables:
- `motorcycle_data_make_model_year` - Main motorcycle records
- `motorcycle_data_specs` - Detailed specifications in JSONB format

## Cabin Motorcycle Categories

- **Fully Enclosed**: Complete cabin with doors (Peraves models, Lit C-1)
- **Semi-Enclosed**: Partial cabin/roof (BMW C1, Honda Gyro Canopy)

## Data Collected

For each model:
- Basic info: Year, Make, Model, Package/Variant
- Technical specs: Engine, dimensions, weight, performance
- Cabin features: Seating, safety features, weather protection
- Production numbers and availability
- Historical information

## Environment Variables

Create a `.env` file with:
```
DATABASE_URL=postgresql://user:password@localhost:5432/bikenode
NODE_ENV=development
```

## Adding New Manufacturers

1. Create a new directory under `scrapers/cabin-motorcycles/[manufacturer-name]/`
2. Add scraper files following the existing pattern
3. Update `index.js` to include the new scraper
4. Add npm script in `package.json`