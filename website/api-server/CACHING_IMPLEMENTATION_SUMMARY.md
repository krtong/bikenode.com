# Cabin Motorcycles API Caching Implementation

## Overview

I've successfully implemented a comprehensive caching solution for the cabin motorcycles API using Redis with an automatic in-memory fallback. This implementation provides improved performance and reduced database load while maintaining data freshness through configurable TTLs.

## Files Created/Modified

### 1. **middleware/cache.go** (New)
- Complete caching middleware implementation
- Redis-based caching with in-memory fallback
- Automatic cache invalidation on modifications
- Cache status headers for monitoring

### 2. **main.go** (Modified)
- Added cache middleware initialization
- Applied caching to all cabin motorcycle endpoints
- Configured endpoint-specific TTLs

### 3. **middleware/cache_test.go** (New)
- Comprehensive unit tests for cache functionality
- Tests for cache hits/misses, expiration, and key generation

### 4. **Documentation Files**
- `middleware/CACHE_MIDDLEWARE.md` - Complete usage documentation
- `api/CACHE_INVALIDATION_EXAMPLE.md` - Examples for future modifications
- `test_cache.sh` - Integration test script

## Key Features

### 1. **Dual-Layer Caching**
- **Primary**: Redis for distributed caching across multiple servers
- **Fallback**: In-memory cache when Redis is unavailable
- Automatic failover with graceful degradation

### 2. **Configurable TTLs**
```
List endpoints:   5 minutes
Detail endpoints: 10 minutes  
Stats endpoint:   30 minutes
Search endpoint:  1 minute
```

### 3. **Cache Headers**
Every response includes:
- `X-Cache-Hit`: "true" or "false"
- `X-Cache-Source`: "redis" or "memory" (on hits)
- `X-Cache-Age`: Age in seconds (on hits)

### 4. **Automatic Invalidation**
- POST/PUT/DELETE requests automatically invalidate related caches
- Pattern-based invalidation for efficient cache clearing

## Configuration

### Environment Variables
```bash
REDIS_ADDR=localhost:6379      # Redis server address
REDIS_PASSWORD=                 # Redis password (optional)
```

### Default Configuration
- Redis address: localhost:6379
- Max memory items: 1000
- Memory TTL: 5 minutes
- Cleanup interval: 1 minute

## Usage

The caching is automatically applied to all cabin motorcycle GET endpoints:
- `/api/cabin-motorcycles` - List all cabin motorcycles
- `/api/cabin-motorcycles/makes` - List manufacturers
- `/api/cabin-motorcycles/stats` - Get statistics
- `/api/cabin-motorcycles/search` - Search functionality
- `/api/cabin-motorcycles/{id}` - Get specific motorcycle

## Testing

### Run Unit Tests
```bash
cd /Users/kevintong/Documents/Code/bikenode.com/website/api-server
go test ./middleware -v
```

### Run Integration Tests
```bash
# Start the API server
go run main.go

# In another terminal
./test_cache.sh
```

## Performance Impact

Expected improvements:
- **Response time**: 10-100x faster for cached responses
- **Database load**: Reduced by 80-95% for read operations
- **Scalability**: Better handling of traffic spikes

## Monitoring

Monitor cache effectiveness through:
1. Cache hit ratio from X-Cache-Hit headers
2. Redis memory usage and key count
3. API response times
4. Database query reduction

## Future Enhancements

1. **Cache Warming**: Pre-populate cache on startup
2. **Cache Analytics**: Track hit rates per endpoint
3. **Smart Invalidation**: More granular cache invalidation
4. **Compression**: Compress cached responses for memory efficiency

## Troubleshooting

### Redis Connection Issues
- Middleware automatically falls back to in-memory cache
- Check logs for "Redis connection failed" messages
- Verify Redis is running: `redis-cli ping`

### Cache Not Working
- Check cache headers in responses
- Verify endpoints are using GET method
- Check TTL configuration

### Memory Issues
- Adjust `MaxMemoryItems` in configuration
- Monitor memory usage of the API process
- Consider reducing TTLs for less critical endpoints