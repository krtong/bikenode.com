package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// TestCacheMiddleware tests the basic functionality of the cache middleware
func TestCacheMiddleware(t *testing.T) {
	// Create a test configuration (using only in-memory cache)
	config := &CacheConfig{
		RedisAddr:      "", // Empty to use only in-memory cache
		DefaultTTL:     2 * time.Second,
		MaxMemoryItems: 100,
		MemoryTTL:      2 * time.Second,
		EndpointTTLs: map[string]time.Duration{
			"/api/test": 1 * time.Second,
		},
	}
	
	cache := NewCacheMiddleware(config)
	
	// Counter to track handler calls
	handlerCalls := 0
	
	// Create a test handler
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalls++
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "test response",
			"calls":   handlerCalls,
		})
	})
	
	// Wrap the handler with cache middleware
	cachedHandler := cache.CacheHandler(testHandler)
	
	// Test 1: First request should be a cache miss
	t.Run("CacheMiss", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/test", nil)
		rr := httptest.NewRecorder()
		
		cachedHandler.ServeHTTP(rr, req)
		
		if rr.Header().Get("X-Cache-Hit") != "false" {
			t.Errorf("Expected cache miss, got hit")
		}
		
		if handlerCalls != 1 {
			t.Errorf("Expected handler to be called once, got %d", handlerCalls)
		}
	})
	
	// Test 2: Second request should be a cache hit
	t.Run("CacheHit", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/test", nil)
		rr := httptest.NewRecorder()
		
		cachedHandler.ServeHTTP(rr, req)
		
		if rr.Header().Get("X-Cache-Hit") != "true" {
			t.Errorf("Expected cache hit, got miss")
		}
		
		if rr.Header().Get("X-Cache-Source") != "memory" {
			t.Errorf("Expected cache source to be memory, got %s", rr.Header().Get("X-Cache-Source"))
		}
		
		if handlerCalls != 1 {
			t.Errorf("Expected handler to still be called once, got %d", handlerCalls)
		}
	})
	
	// Test 3: Different query parameters should result in different cache keys
	t.Run("DifferentQueryParams", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/test?param=value", nil)
		rr := httptest.NewRecorder()
		
		cachedHandler.ServeHTTP(rr, req)
		
		if rr.Header().Get("X-Cache-Hit") != "false" {
			t.Errorf("Expected cache miss for different query params")
		}
		
		if handlerCalls != 2 {
			t.Errorf("Expected handler to be called twice, got %d", handlerCalls)
		}
	})
	
	// Test 4: Cache expiration
	t.Run("CacheExpiration", func(t *testing.T) {
		// Wait for cache to expire (TTL is 1 second for /api/test)
		time.Sleep(2 * time.Second)
		
		req := httptest.NewRequest("GET", "/api/test", nil)
		rr := httptest.NewRecorder()
		
		cachedHandler.ServeHTTP(rr, req)
		
		if rr.Header().Get("X-Cache-Hit") != "false" {
			t.Errorf("Expected cache miss after expiration")
		}
		
		if handlerCalls != 3 {
			t.Errorf("Expected handler to be called 3 times, got %d", handlerCalls)
		}
	})
	
	// Test 5: POST request should not be cached
	t.Run("PostRequestNotCached", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/test", nil)
		rr := httptest.NewRecorder()
		
		cachedHandler.ServeHTTP(rr, req)
		
		// Should not have cache headers
		if rr.Header().Get("X-Cache-Hit") != "" {
			t.Errorf("POST request should not have cache headers")
		}
		
		if handlerCalls != 4 {
			t.Errorf("Expected handler to be called 4 times, got %d", handlerCalls)
		}
	})
}

// TestCacheKeyGeneration tests that cache keys are generated correctly
func TestCacheKeyGeneration(t *testing.T) {
	tests := []struct {
		name     string
		method   string
		path     string
		query    string
		expected string // We'll check that different requests generate different keys
	}{
		{
			name:   "Simple GET",
			method: "GET",
			path:   "/api/test",
			query:  "",
		},
		{
			name:   "GET with query",
			method: "GET",
			path:   "/api/test",
			query:  "param=value",
		},
		{
			name:   "Different path",
			method: "GET",
			path:   "/api/other",
			query:  "",
		},
		{
			name:   "Different method",
			method: "POST",
			path:   "/api/test",
			query:  "",
		},
	}
	
	keys := make(map[string]bool)
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path+"?"+tt.query, nil)
			key := generateCacheKey(req)
			
			if _, exists := keys[key]; exists {
				t.Errorf("Duplicate cache key generated for %s", tt.name)
			}
			keys[key] = true
			
			// Check key format
			if len(key) < 10 {
				t.Errorf("Cache key too short: %s", key)
			}
			if !strings.HasPrefix(key, "api_cache:") {
				t.Errorf("Cache key should start with 'api_cache:', got %s", key)
			}
		})
	}
}

// TestEndpointTTL tests that endpoint-specific TTLs are applied correctly
func TestEndpointTTL(t *testing.T) {
	config := &CacheConfig{
		DefaultTTL: 5 * time.Minute,
		EndpointTTLs: map[string]time.Duration{
			"/api/cabin-motorcycles":        5 * time.Minute,
			"/api/cabin-motorcycles/stats":  30 * time.Minute,
			"/api/cabin-motorcycles/search": 1 * time.Minute,
			"/api/cabin-motorcycles/*":      10 * time.Minute,
		},
	}
	
	cache := NewCacheMiddleware(config)
	
	tests := []struct {
		path        string
		expectedTTL time.Duration
	}{
		{"/api/cabin-motorcycles", 5 * time.Minute},
		{"/api/cabin-motorcycles/stats", 30 * time.Minute},
		{"/api/cabin-motorcycles/search", 1 * time.Minute},
		{"/api/cabin-motorcycles/123", 10 * time.Minute},
		{"/api/other", 5 * time.Minute}, // Default TTL
	}
	
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			ttl := cache.getEndpointTTL(tt.path)
			if ttl != tt.expectedTTL {
				t.Errorf("Expected TTL %v for path %s, got %v", tt.expectedTTL, tt.path, ttl)
			}
		})
	}
}

// TestResponseRecorder tests that the response recorder captures data correctly
func TestResponseRecorder(t *testing.T) {
	// Create a response recorder
	original := httptest.NewRecorder()
	recorder := &ResponseRecorder{
		ResponseWriter: original,
		StatusCode:     http.StatusOK,
		Headers:        make(http.Header),
	}
	
	// Write headers
	recorder.Header().Set("Content-Type", "application/json")
	recorder.Header().Set("X-Custom", "value")
	
	// Write status
	recorder.WriteHeader(http.StatusCreated)
	
	// Write body
	body := []byte(`{"test": "data"}`)
	n, err := recorder.Write(body)
	
	if err != nil {
		t.Errorf("Write error: %v", err)
	}
	
	if n != len(body) {
		t.Errorf("Expected to write %d bytes, wrote %d", len(body), n)
	}
	
	// Verify captured data
	if recorder.StatusCode != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, recorder.StatusCode)
	}
	
	if !bytes.Equal(recorder.Body, body) {
		t.Errorf("Body not captured correctly")
	}
	
	if recorder.Headers.Get("Content-Type") != "application/json" {
		t.Errorf("Headers not captured correctly")
	}
}