# API Rate Limiting Documentation

## Overview

The BikeNode API implements rate limiting to prevent abuse and ensure fair usage across all clients. The rate limiting system uses a token bucket algorithm that allows for burst capacity while maintaining overall request limits.

## Rate Limit Headers

All API responses include the following headers to help you track your rate limit status:

- `X-RateLimit-Limit`: The maximum number of requests allowed per minute
- `X-RateLimit-Remaining`: The number of requests remaining in the current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets

## Rate Limit Response

When you exceed the rate limit, the API returns a `429 Too Many Requests` status with:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 5
}
```

Additional headers included:
- `Retry-After`: Number of seconds to wait before making another request

## Default Limits

### General API Endpoints
- **Requests per minute**: 60
- **Burst capacity**: 10

### Endpoint-Specific Limits

#### Cabin Motorcycles API

| Endpoint | Requests/Minute | Burst Capacity |
|----------|-----------------|----------------|
| `/api/cabin-motorcycles` | 120 | 20 |
| `/api/cabin-motorcycles/search` | 30 | 5 |
| `/api/cabin-motorcycles/stats` | 60 | 10 |
| `/api/cabin-motorcycles/{id}` | 120 | 20 |

#### Other Endpoints

| Endpoint Pattern | Requests/Minute | Burst Capacity |
|-----------------|-----------------|----------------|
| `/api/specs-submissions` | 10 | 2 |
| `/api/motorcycles/*` | 100 | 15 |
| `/api/bicycles/*` | 100 | 15 |
| `/api/electrified/*` | 100 | 15 |

## Exempt IPs

The following IP ranges are exempt from rate limiting:
- `127.0.0.1` (localhost IPv4)
- `::1` (localhost IPv6)
- Internal service IPs (configured by administrator)

## Best Practices

1. **Monitor Rate Limit Headers**: Always check the `X-RateLimit-Remaining` header to avoid hitting limits
2. **Implement Exponential Backoff**: When you receive a 429 response, wait for the time specified in `Retry-After` before retrying
3. **Cache Responses**: Cache API responses when possible to reduce the number of requests
4. **Batch Requests**: Where supported, use batch endpoints instead of making multiple individual requests

## Example Implementation

### JavaScript/Fetch
```javascript
async function fetchWithRateLimit(url, options = {}) {
  const response = await fetch(url, options);
  
  // Check rate limit headers
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const limit = response.headers.get('X-RateLimit-Limit');
  
  console.log(`Rate limit: ${remaining}/${limit} requests remaining`);
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return fetchWithRateLimit(url, options);
  }
  
  return response;
}
```

### Python/Requests
```python
import time
import requests

def fetch_with_rate_limit(url, **kwargs):
    response = requests.get(url, **kwargs)
    
    # Check rate limit headers
    remaining = response.headers.get('X-RateLimit-Remaining')
    limit = response.headers.get('X-RateLimit-Limit')
    
    print(f"Rate limit: {remaining}/{limit} requests remaining")
    
    if response.status_code == 429:
        retry_after = int(response.headers.get('Retry-After', 5))
        print(f"Rate limited. Retry after {retry_after} seconds")
        
        time.sleep(retry_after)
        return fetch_with_rate_limit(url, **kwargs)
    
    return response
```

## Rate Limit Violations

Repeated violations of rate limits are logged and may result in:
1. Temporary IP bans for severe abuse
2. Reduced rate limits for repeat offenders
3. Requirement to use authenticated requests with stricter limits

## Contact

If you need higher rate limits for your application, please contact the API team with:
- Your use case and expected request volume
- Your application details
- Contact information

## Implementation Details

The rate limiting system uses:
- **Algorithm**: Token bucket with configurable refill rate
- **Storage**: In-memory storage with automatic cleanup
- **Granularity**: Per IP address and endpoint combination
- **Clock**: Server-side UTC time

Rate limits are enforced at the API gateway level before requests reach the application servers.