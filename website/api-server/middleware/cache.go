package middleware

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// CacheConfig holds configuration for caching
type CacheConfig struct {
	RedisAddr     string
	RedisPassword string
	RedisDB       int
	DefaultTTL    time.Duration
	
	// Endpoint-specific TTLs
	EndpointTTLs map[string]time.Duration
	
	// In-memory cache settings
	MaxMemoryItems int
	MemoryTTL      time.Duration
}

// CacheEntry represents a cached response
type CacheEntry struct {
	Body       []byte              `json:"body"`
	Headers    map[string][]string `json:"headers"`
	StatusCode int                 `json:"statusCode"`
	CachedAt   time.Time           `json:"cachedAt"`
	TTL        time.Duration       `json:"ttl"`
}

// MemoryCacheEntry represents an in-memory cache entry
type MemoryCacheEntry struct {
	Entry     CacheEntry
	ExpiresAt time.Time
}

// CacheMiddleware manages caching for API responses
type CacheMiddleware struct {
	config       *CacheConfig
	redisClient  *redis.Client
	memoryCache  map[string]*MemoryCacheEntry
	memoryCacheMu sync.RWMutex
	ctx          context.Context
}

// ResponseRecorder captures the response for caching
type ResponseRecorder struct {
	http.ResponseWriter
	Body       []byte
	StatusCode int
	Headers    http.Header
}

// NewCacheMiddleware creates a new cache middleware instance
func NewCacheMiddleware(config *CacheConfig) *CacheMiddleware {
	if config.MaxMemoryItems == 0 {
		config.MaxMemoryItems = 1000
	}
	if config.MemoryTTL == 0 {
		config.MemoryTTL = 5 * time.Minute
	}
	
	cm := &CacheMiddleware{
		config:      config,
		memoryCache: make(map[string]*MemoryCacheEntry),
		ctx:         context.Background(),
	}
	
	// Initialize Redis client if configuration is provided
	if config.RedisAddr != "" {
		cm.redisClient = redis.NewClient(&redis.Options{
			Addr:     config.RedisAddr,
			Password: config.RedisPassword,
			DB:       config.RedisDB,
		})
		
		// Test Redis connection
		if err := cm.redisClient.Ping(cm.ctx).Err(); err != nil {
			log.Printf("Redis connection failed: %v. Using in-memory cache only.", err)
			cm.redisClient = nil
		} else {
			log.Println("Redis cache connected successfully")
		}
	} else {
		log.Println("Redis not configured. Using in-memory cache only.")
	}
	
	// Start cleanup routine for memory cache
	go cm.memoryCleanupRoutine()
	
	return cm
}

// memoryCleanupRoutine periodically removes expired entries from memory cache
func (cm *CacheMiddleware) memoryCleanupRoutine() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		cm.cleanupMemoryCache()
	}
}

// cleanupMemoryCache removes expired entries from memory cache
func (cm *CacheMiddleware) cleanupMemoryCache() {
	cm.memoryCacheMu.Lock()
	defer cm.memoryCacheMu.Unlock()
	
	now := time.Now()
	for key, entry := range cm.memoryCache {
		if now.After(entry.ExpiresAt) {
			delete(cm.memoryCache, key)
		}
	}
	
	// If cache is too large, remove oldest entries
	if len(cm.memoryCache) > cm.config.MaxMemoryItems {
		// Find oldest entries
		type keyTime struct {
			key       string
			expiresAt time.Time
		}
		entries := make([]keyTime, 0, len(cm.memoryCache))
		for k, v := range cm.memoryCache {
			entries = append(entries, keyTime{k, v.ExpiresAt})
		}
		
		// Remove 10% of oldest entries
		toRemove := len(cm.memoryCache) / 10
		if toRemove < 1 {
			toRemove = 1
		}
		
		for i := 0; i < toRemove && i < len(entries); i++ {
			delete(cm.memoryCache, entries[i].key)
		}
	}
}

// generateCacheKey creates a cache key from request parameters
func generateCacheKey(r *http.Request) string {
	// Include method, path, and sorted query parameters
	parts := []string{
		r.Method,
		r.URL.Path,
	}
	
	// Sort query parameters for consistent cache keys
	if r.URL.RawQuery != "" {
		parts = append(parts, r.URL.RawQuery)
	}
	
	key := strings.Join(parts, ":")
	
	// Create MD5 hash for shorter keys
	hash := md5.Sum([]byte(key))
	return "api_cache:" + hex.EncodeToString(hash[:])
}

// getEndpointTTL returns the TTL for a specific endpoint
func (cm *CacheMiddleware) getEndpointTTL(path string) time.Duration {
	// Check for specific endpoint TTLs
	for pattern, ttl := range cm.config.EndpointTTLs {
		if matched := matchCachePath(pattern, path); matched {
			return ttl
		}
	}
	
	// Return default TTL
	return cm.config.DefaultTTL
}

// matchCachePath checks if a path matches a pattern (simple wildcard matching)
func matchCachePath(pattern, path string) bool {
	// Simple prefix matching with wildcard support
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(path, prefix)
	}
	return pattern == path
}

// getFromCache retrieves an entry from cache (Redis first, then memory)
func (cm *CacheMiddleware) getFromCache(key string) (*CacheEntry, bool, error) {
	// Try Redis first
	if cm.redisClient != nil {
		data, err := cm.redisClient.Get(cm.ctx, key).Result()
		if err == nil {
			var entry CacheEntry
			if err := json.Unmarshal([]byte(data), &entry); err == nil {
				return &entry, true, nil
			}
		} else if err != redis.Nil {
			log.Printf("Redis get error: %v", err)
		}
	}
	
	// Fallback to memory cache
	cm.memoryCacheMu.RLock()
	memEntry, exists := cm.memoryCache[key]
	cm.memoryCacheMu.RUnlock()
	
	if exists && time.Now().Before(memEntry.ExpiresAt) {
		return &memEntry.Entry, false, nil
	}
	
	return nil, false, nil
}

// setInCache stores an entry in cache (both Redis and memory)
func (cm *CacheMiddleware) setInCache(key string, entry *CacheEntry, ttl time.Duration) error {
	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	
	// Try to set in Redis
	if cm.redisClient != nil {
		if err := cm.redisClient.Set(cm.ctx, key, data, ttl).Err(); err != nil {
			log.Printf("Redis set error: %v", err)
		}
	}
	
	// Always set in memory cache as fallback
	cm.memoryCacheMu.Lock()
	cm.memoryCache[key] = &MemoryCacheEntry{
		Entry:     *entry,
		ExpiresAt: time.Now().Add(ttl),
	}
	cm.memoryCacheMu.Unlock()
	
	return nil
}

// invalidateCache removes entries from cache based on pattern
func (cm *CacheMiddleware) invalidateCache(pattern string) error {
	// For Redis, use SCAN to find and delete matching keys
	if cm.redisClient != nil {
		var cursor uint64
		for {
			var keys []string
			var err error
			keys, cursor, err = cm.redisClient.Scan(cm.ctx, cursor, "api_cache:"+pattern+"*", 100).Result()
			if err != nil {
				log.Printf("Redis scan error: %v", err)
				break
			}
			
			if len(keys) > 0 {
				if err := cm.redisClient.Del(cm.ctx, keys...).Err(); err != nil {
					log.Printf("Redis delete error: %v", err)
				}
			}
			
			if cursor == 0 {
				break
			}
		}
	}
	
	// Clear matching entries from memory cache
	cm.memoryCacheMu.Lock()
	for key := range cm.memoryCache {
		if strings.Contains(key, pattern) {
			delete(cm.memoryCache, key)
		}
	}
	cm.memoryCacheMu.Unlock()
	
	return nil
}

// CacheHandler returns an HTTP handler that implements caching
func (cm *CacheMiddleware) CacheHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only cache GET requests
		if r.Method != http.MethodGet {
			// For modification requests, invalidate related caches
			if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodDelete {
				// Extract the base path for invalidation
				pathParts := strings.Split(r.URL.Path, "/")
				if len(pathParts) >= 3 {
					basePath := strings.Join(pathParts[:3], "/")
					if err := cm.invalidateCache(basePath); err != nil {
						log.Printf("Cache invalidation error: %v", err)
					}
				}
			}
			next.ServeHTTP(w, r)
			return
		}
		
		// Generate cache key
		cacheKey := generateCacheKey(r)
		
		// Try to get from cache
		entry, fromRedis, err := cm.getFromCache(cacheKey)
		if err == nil && entry != nil {
			// Serve from cache
			for key, values := range entry.Headers {
				for _, value := range values {
					w.Header().Add(key, value)
				}
			}
			
			// Add cache headers
			w.Header().Set("X-Cache-Hit", "true")
			if fromRedis {
				w.Header().Set("X-Cache-Source", "redis")
			} else {
				w.Header().Set("X-Cache-Source", "memory")
			}
			w.Header().Set("X-Cache-Age", strconv.Itoa(int(time.Since(entry.CachedAt).Seconds())))
			
			w.WriteHeader(entry.StatusCode)
			w.Write(entry.Body)
			return
		}
		
		// Not in cache, record the response
		recorder := &ResponseRecorder{
			ResponseWriter: w,
			StatusCode:     http.StatusOK,
			Headers:        make(http.Header),
		}
		
		next.ServeHTTP(recorder, r)
		
		// Only cache successful responses
		if recorder.StatusCode >= 200 && recorder.StatusCode < 300 {
			ttl := cm.getEndpointTTL(r.URL.Path)
			
			entry := &CacheEntry{
				Body:       recorder.Body,
				Headers:    recorder.Headers,
				StatusCode: recorder.StatusCode,
				CachedAt:   time.Now(),
				TTL:        ttl,
			}
			
			if err := cm.setInCache(cacheKey, entry, ttl); err != nil {
				log.Printf("Failed to cache response: %v", err)
			}
		}
		
		// Add cache miss header
		w.Header().Set("X-Cache-Hit", "false")
	})
}

// Write captures the response body
func (rr *ResponseRecorder) Write(b []byte) (int, error) {
	rr.Body = append(rr.Body, b...)
	
	// Copy headers if not already done
	if len(rr.Headers) == 0 {
		for k, v := range rr.ResponseWriter.Header() {
			rr.Headers[k] = v
		}
	}
	
	return rr.ResponseWriter.Write(b)
}

// WriteHeader captures the status code
func (rr *ResponseRecorder) WriteHeader(statusCode int) {
	rr.StatusCode = statusCode
	
	// Copy headers before writing
	for k, v := range rr.ResponseWriter.Header() {
		rr.Headers[k] = v
	}
	
	rr.ResponseWriter.WriteHeader(statusCode)
}

// Header returns the header map
func (rr *ResponseRecorder) Header() http.Header {
	return rr.ResponseWriter.Header()
}

// DefaultCacheConfig returns a default cache configuration
func DefaultCacheConfig() *CacheConfig {
	return &CacheConfig{
		RedisAddr:      "localhost:6379",
		RedisPassword:  "",
		RedisDB:        0,
		DefaultTTL:     5 * time.Minute,
		MaxMemoryItems: 1000,
		MemoryTTL:      5 * time.Minute,
		EndpointTTLs: map[string]time.Duration{
			"/api/cabin-motorcycles":        5 * time.Minute,  // List endpoints
			"/api/cabin-motorcycles/makes":  5 * time.Minute,
			"/api/cabin-motorcycles/*":      10 * time.Minute, // Detail endpoints
			"/api/cabin-motorcycles/stats":  30 * time.Minute, // Stats endpoint
			"/api/cabin-motorcycles/search": 1 * time.Minute,  // Search endpoint
		},
	}
}