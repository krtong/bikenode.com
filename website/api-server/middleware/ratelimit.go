package middleware

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	RequestsPerMinute int
	BurstCapacity     int
	CleanupInterval   time.Duration
	ExemptIPs         []string
	EndpointLimits    map[string]EndpointLimit
}

// EndpointLimit defines rate limiting for specific endpoints
type EndpointLimit struct {
	RequestsPerMinute int
	BurstCapacity     int
}

// TokenBucket implements the token bucket algorithm
type TokenBucket struct {
	tokens        float64
	capacity      float64
	refillRate    float64
	lastRefill    time.Time
	mu            sync.Mutex
}

// RateLimiter manages rate limiting for the API
type RateLimiter struct {
	config      *RateLimitConfig
	buckets     map[string]*TokenBucket
	bucketsMu   sync.RWMutex
	exemptIPMap map[string]bool
}

// NewRateLimiter creates a new rate limiter with the given configuration
func NewRateLimiter(config *RateLimitConfig) *RateLimiter {
	if config.CleanupInterval == 0 {
		config.CleanupInterval = 5 * time.Minute
	}

	rl := &RateLimiter{
		config:      config,
		buckets:     make(map[string]*TokenBucket),
		exemptIPMap: make(map[string]bool),
	}

	// Build exempt IP map for faster lookups
	for _, ip := range config.ExemptIPs {
		rl.exemptIPMap[ip] = true
	}

	// Start cleanup goroutine
	go rl.cleanupRoutine()

	return rl
}

// cleanupRoutine periodically removes old buckets to prevent memory leaks
func (rl *RateLimiter) cleanupRoutine() {
	ticker := time.NewTicker(rl.config.CleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		rl.cleanup()
	}
}

// cleanup removes buckets that haven't been used recently
func (rl *RateLimiter) cleanup() {
	rl.bucketsMu.Lock()
	defer rl.bucketsMu.Unlock()

	now := time.Now()
	for key, bucket := range rl.buckets {
		bucket.mu.Lock()
		// Remove buckets that are full and haven't been accessed in 10 minutes
		if bucket.tokens >= bucket.capacity && now.Sub(bucket.lastRefill) > 10*time.Minute {
			delete(rl.buckets, key)
		}
		bucket.mu.Unlock()
	}
}

// getClientIP extracts the client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxies/load balancers)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// Take the first IP in the chain
		ips := strings.Split(forwarded, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" && net.ParseIP(realIP) != nil {
		return realIP
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// getBucket retrieves or creates a token bucket for the given key
func (rl *RateLimiter) getBucket(key string, limit EndpointLimit) *TokenBucket {
	rl.bucketsMu.RLock()
	bucket, exists := rl.buckets[key]
	rl.bucketsMu.RUnlock()

	if exists {
		return bucket
	}

	// Create new bucket
	rl.bucketsMu.Lock()
	defer rl.bucketsMu.Unlock()

	// Double-check after acquiring write lock
	if bucket, exists = rl.buckets[key]; exists {
		return bucket
	}

	refillRate := float64(limit.RequestsPerMinute) / 60.0
	bucket = &TokenBucket{
		tokens:     float64(limit.BurstCapacity),
		capacity:   float64(limit.BurstCapacity),
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
	rl.buckets[key] = bucket
	return bucket
}

// consume attempts to consume a token from the bucket
func (b *TokenBucket) consume() (bool, int, time.Duration) {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastRefill)
	
	// Refill tokens based on time elapsed
	tokensToAdd := elapsed.Seconds() * b.refillRate
	b.tokens = min(b.capacity, b.tokens+tokensToAdd)
	b.lastRefill = now

	if b.tokens >= 1 {
		b.tokens--
		resetTime := time.Duration((b.capacity-b.tokens)/b.refillRate) * time.Second
		return true, int(b.tokens), resetTime
	}

	// Calculate time until next token is available
	timeToWait := time.Duration((1-b.tokens)/b.refillRate) * time.Second
	return false, 0, timeToWait
}

// getEndpointLimit returns the rate limit for a specific endpoint
func (rl *RateLimiter) getEndpointLimit(path string) EndpointLimit {
	// Check for specific endpoint limits
	for pattern, limit := range rl.config.EndpointLimits {
		if matched, _ := matchPath(pattern, path); matched {
			return limit
		}
	}

	// Return default limits
	return EndpointLimit{
		RequestsPerMinute: rl.config.RequestsPerMinute,
		BurstCapacity:     rl.config.BurstCapacity,
	}
}

// matchPath checks if a path matches a pattern (simple wildcard matching)
func matchPath(pattern, path string) (bool, error) {
	// Simple prefix matching with wildcard support
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(path, prefix), nil
	}
	return pattern == path, nil
}

// RateLimitMiddleware returns an HTTP middleware that enforces rate limiting
func (rl *RateLimiter) RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP := getClientIP(r)
		
		// Check if IP is exempt
		if rl.exemptIPMap[clientIP] {
			next.ServeHTTP(w, r)
			return
		}

		// Get endpoint-specific limits
		endpointLimit := rl.getEndpointLimit(r.URL.Path)
		
		// Create bucket key (IP + endpoint pattern)
		bucketKey := fmt.Sprintf("%s:%s", clientIP, r.URL.Path)
		bucket := rl.getBucket(bucketKey, endpointLimit)

		// Try to consume a token
		allowed, remaining, resetTime := bucket.consume()

		// Set rate limit headers
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(endpointLimit.RequestsPerMinute))
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(resetTime).Unix(), 10))

		if !allowed {
			// Log rate limit violation
			log.Printf("Rate limit exceeded for IP: %s, Path: %s, User-Agent: %s",
				clientIP, r.URL.Path, r.Header.Get("User-Agent"))

			// Return 429 Too Many Requests
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", strconv.Itoa(int(resetTime.Seconds())+1))
			w.WriteHeader(http.StatusTooManyRequests)

			response := map[string]interface{}{
				"error": "Too Many Requests",
				"message": "Rate limit exceeded. Please try again later.",
				"retryAfter": int(resetTime.Seconds()) + 1,
			}
			json.NewEncoder(w).Encode(response)
			return
		}

		// Continue to next handler
		next.ServeHTTP(w, r)
	})
}

// DefaultConfig returns a default rate limiting configuration
func DefaultConfig() *RateLimitConfig {
	return &RateLimitConfig{
		RequestsPerMinute: 60,
		BurstCapacity:     10,
		CleanupInterval:   5 * time.Minute,
		ExemptIPs: []string{
			"127.0.0.1",
			"::1",
			"10.0.0.0/8",
			"172.16.0.0/12",
			"192.168.0.0/16",
		},
		EndpointLimits: map[string]EndpointLimit{
			"/api/cabin-motorcycles/search": {
				RequestsPerMinute: 30,
				BurstCapacity:     5,
			},
			"/api/cabin-motorcycles": {
				RequestsPerMinute: 120,
				BurstCapacity:     20,
			},
			"/api/specs-submissions": {
				RequestsPerMinute: 10,
				BurstCapacity:     2,
			},
		},
	}
}

// min returns the minimum of two float64 values
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}