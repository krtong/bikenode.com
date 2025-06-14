# API Configuration Documentation

## Overview
This document describes how API endpoints are configured in the BikeNode website to support different environments (development, staging, production).

## Configuration System

### Central Configuration File
All API endpoints are configured in `/src/config/api-config.js`. This file:
- Provides a single source of truth for all API URLs
- Supports environment variables for deployment flexibility
- Includes fallback values for local development

### Environment Variables
The following environment variables can be set:
- `MAIN_API_URL` - Main API server (default: `http://localhost:8080/api`)
- `USER_API_URL` - User/auth API server (default: `http://localhost:8081/api`)
- `VALHALLA_API_URL` - Valhalla routing server (default: `http://localhost:8002`)
- `BROUTER_API_URL` - BRouter routing server (default: `http://localhost:17777`)

### Usage in Code
Import the configuration in your JavaScript files:

```javascript
import { MAIN_API, USER_API } from '../path/to/config/api-config.js';

// Use in fetch calls
const response = await fetch(`${MAIN_API}/bikes`);
```

### Setting Environment Variables

#### Local Development
Create a `.env` file in the project root:
```
MAIN_API_URL=http://localhost:8080/api
USER_API_URL=http://localhost:8081/api
```

#### Production Deployment
Set environment variables in your hosting platform:
- Vercel: Project Settings > Environment Variables
- Netlify: Site Settings > Environment Variables
- Docker: Use `--env` flags or env files
- Traditional hosting: Set in server configuration

### External APIs
Some external APIs (OSRM, Nominatim, Overpass) have hardcoded URLs as they are public services that don't typically need configuration.

## Files Updated
The following files have been updated to use the configuration system:
- `/src/bikes/add-bikes/js/api.js`
- `/src/bikes/add-bikes/js/app.js`
- `/src/gear/js/gear-api.js`
- `/src/marketplace/marketplace-create-listing/js/app.js`
- `/src/gear/gear-my-collection/js/app.js`
- `/src/rides/rides-create-planner/js/engines/valhalla-router.js`
- `/src/rides/rides-create-planner/js/engines/brouter-engine.js`

## Testing API Configuration
To test with different API endpoints:
1. Update the environment variables
2. Restart the development server
3. Check browser console for API calls to verify correct endpoints

## Future Improvements
- Add API health check endpoints
- Implement automatic failover for multiple API servers
- Add request retry logic with exponential backoff