# Cabin Motorcycles API Documentation

## Overview

The Cabin Motorcycles API provides access to information about motorcycles with cabin enclosures, including fully-enclosed and semi-enclosed models. This API includes comprehensive rate limiting to prevent abuse and ensure fair access for all users.

## Rate Limits

### Endpoint-Specific Limits

| Endpoint | Rate Limit | Burst Capacity | Description |
|----------|------------|----------------|-------------|
| `GET /api/cabin-motorcycles` | 120/min | 20 | List all cabin motorcycles |
| `GET /api/cabin-motorcycles/search` | 30/min | 5 | Search cabin motorcycles |
| `GET /api/cabin-motorcycles/stats` | 60/min | 10 | Get statistics |
| `GET /api/cabin-motorcycles/makes` | 120/min | 20 | List manufacturers |
| `GET /api/cabin-motorcycles/{id}` | 120/min | 20 | Get motorcycle details |

### Rate Limit Headers

All responses include:
- `X-RateLimit-Limit`: Requests allowed per minute
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp for limit reset

### Rate Limit Exceeded Response

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 5
}
```

## Endpoints

### 1. List Cabin Motorcycles

```
GET /api/cabin-motorcycles
```

#### Query Parameters

- `subcategory` (optional): Filter by subcategory (`fully_enclosed` or `semi_enclosed`)
- `make` (optional): Filter by manufacturer
- `year_from` (optional): Minimum year (inclusive)
- `year_to` (optional): Maximum year (inclusive)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

#### Example Request

```bash
curl -X GET "https://api.bikenode.com/api/cabin-motorcycles?subcategory=fully_enclosed&make=BMW&page=1&limit=10"
```

#### Example Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "year": 2024,
      "make": "BMW",
      "model": "C1",
      "package": "Executive",
      "category": "cabin",
      "subcategory": "fully_enclosed",
      "specifications": {
        "engine": "650cc",
        "doors": 2,
        "seating": 2,
        "weather_protection": "full"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 2. Search Cabin Motorcycles

```
GET /api/cabin-motorcycles/search
```

**Note: This endpoint has stricter rate limits (30 requests/minute)**

#### Query Parameters

- `q` (required): Search query (minimum 2 characters)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

#### Example Request

```bash
curl -X GET "https://api.bikenode.com/api/cabin-motorcycles/search?q=BMW%20C1"
```

### 3. Get Statistics

```
GET /api/cabin-motorcycles/stats
```

#### Example Response

```json
{
  "total_models": 150,
  "total_makes": 25,
  "by_make": [
    {
      "make": "BMW",
      "total_models": 15,
      "first_year": 2000,
      "last_year": 2024
    }
  ],
  "by_subcategory": [
    {
      "category": "fully_enclosed",
      "count": 75
    },
    {
      "category": "semi_enclosed",
      "count": 75
    }
  ],
  "production_years": {
    "earliest": 1990,
    "latest": 2024
  }
}
```

### 4. List Manufacturers

```
GET /api/cabin-motorcycles/makes
```

#### Example Response

```json
[
  {
    "make": "BMW",
    "model_count": 15
  },
  {
    "make": "Honda",
    "model_count": 12
  }
]
```

### 5. Get Motorcycle Details

```
GET /api/cabin-motorcycles/{id}
```

#### Path Parameters

- `id` (required): Motorcycle UUID

#### Example Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2024,
  "make": "BMW",
  "model": "C1",
  "package": "Executive",
  "category": "cabin",
  "subcategory": "fully_enclosed",
  "specifications": {
    "engine": {
      "displacement": "650cc",
      "type": "parallel twin",
      "power": "70 hp"
    },
    "dimensions": {
      "length": "2200mm",
      "width": "900mm",
      "height": "1600mm"
    },
    "features": {
      "abs": true,
      "traction_control": true,
      "heated_seats": true,
      "air_conditioning": true
    }
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid year parameter",
  "details": {
    "error": "year_from must be between 1900 and 2026"
  }
}
```

### 404 Not Found

```json
{
  "code": "NOT_FOUND",
  "message": "Cabin motorcycle not found",
  "details": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 429 Too Many Requests

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 5
}
```

### 500 Internal Server Error

```json
{
  "code": "DATABASE_ERROR",
  "message": "Failed to fetch cabin motorcycles",
  "details": {
    "error": "connection timeout"
  }
}
```

## Best Practices

1. **Implement Caching**: Cache responses to reduce API calls
2. **Use Pagination**: Always paginate large result sets
3. **Handle Rate Limits**: Implement exponential backoff when rate limited
4. **Monitor Headers**: Check rate limit headers to avoid hitting limits
5. **Use Specific Filters**: Use query parameters to reduce response size

## Example Implementation

### JavaScript with Rate Limit Handling

```javascript
class CabinMotorcyclesAPI {
  constructor(baseURL = 'https://api.bikenode.com') {
    this.baseURL = baseURL;
  }

  async fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url, options);
      
      // Log rate limit status
      console.log(`Rate Limit: ${response.headers.get('X-RateLimit-Remaining')}/${response.headers.get('X-RateLimit-Limit')}`);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }
      
      return response.json();
    }
    
    throw new Error('Max retries exceeded');
  }

  async listCabinMotorcycles(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseURL}/api/cabin-motorcycles${queryString ? '?' + queryString : ''}`;
    return this.fetchWithRetry(url);
  }

  async searchCabinMotorcycles(query, params = {}) {
    const url = `${this.baseURL}/api/cabin-motorcycles/search?q=${encodeURIComponent(query)}&${new URLSearchParams(params)}`;
    return this.fetchWithRetry(url);
  }

  async getStats() {
    return this.fetchWithRetry(`${this.baseURL}/api/cabin-motorcycles/stats`);
  }
}

// Usage
const api = new CabinMotorcyclesAPI();

// List fully enclosed cabin motorcycles
api.listCabinMotorcycles({ 
  subcategory: 'fully_enclosed',
  page: 1,
  limit: 20 
}).then(data => {
  console.log(`Found ${data.pagination.total} motorcycles`);
  data.data.forEach(moto => {
    console.log(`${moto.year} ${moto.make} ${moto.model}`);
  });
}).catch(err => {
  console.error('API Error:', err);
});
```

## Monitoring and Logging

All API requests are logged with:
- Client IP address
- User-Agent
- Request path
- Query parameters (for search endpoints)
- Timestamp

Rate limit violations are specifically logged for monitoring and analysis.

## Contact

For higher rate limits or API issues, please contact:
- Email: api-support@bikenode.com
- Include your use case and expected request volume