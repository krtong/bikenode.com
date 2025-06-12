# Cache Middleware for BikeNode API

This middleware provides Redis-based caching with automatic in-memory fallback for the BikeNode API endpoints.

## Features

- **Redis-based caching** for distributed cache across multiple servers
- **In-memory fallback** when Redis is unavailable
- **Configurable TTLs** per endpoint
- **Automatic cache invalidation** on POST/PUT/DELETE requests
- **Cache status headers** (X-Cache-Hit/Miss, X-Cache-Source, X-Cache-Age)
- **Graceful degradation** - continues working even if Redis fails

## Configuration

The cache middleware can be configured through environment variables:

- `REDIS_ADDR`: Redis server address (default: "localhost:6379")
- `REDIS_PASSWORD`: Redis password (optional)

## Cache TTLs

The middleware uses different cache durations for different endpoint types:

- **List endpoints** (`/api/cabin-motorcycles`, `/api/cabin-motorcycles/makes`): 5 minutes
- **Detail endpoints** (`/api/cabin-motorcycles/{id}`): 10 minutes
- **Stats endpoint** (`/api/cabin-motorcycles/stats`): 30 minutes
- **Search endpoint** (`/api/cabin-motorcycles/search`): 1 minute

## Cache Headers

The middleware adds the following headers to responses:

- `X-Cache-Hit`: "true" if served from cache, "false" if cache miss
- `X-Cache-Source`: "redis" or "memory" (only present on cache hits)
- `X-Cache-Age`: Age of cached response in seconds (only present on cache hits)

## Usage

```go
// Initialize cache middleware
cacheConfig := &middleware.CacheConfig{
    RedisAddr:      os.Getenv("REDIS_ADDR"),
    RedisPassword:  os.Getenv("REDIS_PASSWORD"),
    RedisDB:        0,
    DefaultTTL:     5 * time.Minute,
    MaxMemoryItems: 1000,
    MemoryTTL:      5 * time.Minute,
    EndpointTTLs: map[string]time.Duration{
        "/api/cabin-motorcycles":        5 * time.Minute,
        "/api/cabin-motorcycles/makes":  5 * time.Minute,
        "/api/cabin-motorcycles/stats":  30 * time.Minute,
        "/api/cabin-motorcycles/search": 1 * time.Minute,
        "/api/cabin-motorcycles/*":      10 * time.Minute,
    },
}

cacheMiddleware := middleware.NewCacheMiddleware(cacheConfig)

// Apply to routes
apiRouter.Handle("/cabin-motorcycles", cacheMiddleware.CacheHandler(handler)).Methods("GET")
```

## Cache Invalidation

The cache is automatically invalidated when:

1. A POST, PUT, or DELETE request is made to a related endpoint
2. The cache entry expires based on its TTL
3. Redis is restarted (Redis cache only)

When a modification request is received, the middleware invalidates all cache entries that match the base path. For example, a POST to `/api/cabin-motorcycles` will invalidate all entries starting with `/api/cabin-motorcycles`.

## In-Memory Fallback

When Redis is unavailable, the middleware automatically falls back to an in-memory cache. The in-memory cache:

- Has a configurable maximum size (default: 1000 entries)
- Automatically removes expired entries
- Removes oldest entries when the cache is full
- Is local to each server instance (not distributed)

## Monitoring

The middleware logs:

- Redis connection status on startup
- Cache hits/misses (through headers)
- Redis errors (falls back gracefully)
- Cache invalidation events

## Performance Considerations

1. **Cache Key Generation**: Uses MD5 hashing for consistent, short cache keys
2. **Query Parameters**: Included in cache keys for proper differentiation
3. **Memory Management**: Automatic cleanup of expired entries
4. **Concurrent Access**: Thread-safe implementation using mutexes

## Testing

To test the cache middleware:

1. **With Redis**:
   ```bash
   # Start Redis
   docker run -d -p 6379:6379 redis:alpine
   
   # Set REDIS_ADDR environment variable
   export REDIS_ADDR=localhost:6379
   ```

2. **Without Redis**: The middleware will automatically use in-memory caching

3. **Verify cache headers**:
   ```bash
   # First request (cache miss)
   curl -I http://localhost:8080/api/cabin-motorcycles
   # X-Cache-Hit: false
   
   # Second request (cache hit)
   curl -I http://localhost:8080/api/cabin-motorcycles
   # X-Cache-Hit: true
   # X-Cache-Source: redis
   # X-Cache-Age: 2
   ```