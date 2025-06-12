package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiter(t *testing.T) {
	// Create a test configuration
	config := &RateLimitConfig{
		RequestsPerMinute: 6, // 1 request per 10 seconds
		BurstCapacity:     2,
		ExemptIPs:         []string{"192.168.1.1"},
		EndpointLimits: map[string]EndpointLimit{
			"/api/test": {
				RequestsPerMinute: 3,
				BurstCapacity:     1,
			},
		},
	}

	rl := NewRateLimiter(config)

	// Create a test handler
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Wrap with rate limiter
	handler := rl.RateLimitMiddleware(testHandler)

	t.Run("AllowsBurstRequests", func(t *testing.T) {
		// Should allow burst capacity requests immediately
		for i := 0; i < config.BurstCapacity; i++ {
			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = "10.0.0.1:1234"
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Errorf("Request %d failed, expected 200, got %d", i+1, rec.Code)
			}
		}

		// Next request should be rate limited
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = "10.0.0.1:1234"
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusTooManyRequests {
			t.Errorf("Expected rate limit, got %d", rec.Code)
		}
	})

	t.Run("ExemptIPsNotLimited", func(t *testing.T) {
		// Exempt IPs should not be rate limited
		for i := 0; i < 10; i++ {
			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = "192.168.1.1:1234"
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Errorf("Exempt IP request %d failed, got %d", i+1, rec.Code)
			}
		}
	})

	t.Run("EndpointSpecificLimits", func(t *testing.T) {
		// Test endpoint-specific rate limit
		req := httptest.NewRequest("GET", "/api/test", nil)
		req.RemoteAddr = "10.0.0.2:1234"
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("First request failed, got %d", rec.Code)
		}

		// Second request should be rate limited (burst capacity is 1)
		req = httptest.NewRequest("GET", "/api/test", nil)
		req.RemoteAddr = "10.0.0.2:1234"
		rec = httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusTooManyRequests {
			t.Errorf("Expected rate limit, got %d", rec.Code)
		}
	})

	t.Run("RateLimitHeaders", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = "10.0.0.3:1234"
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		// Check rate limit headers
		if rec.Header().Get("X-RateLimit-Limit") == "" {
			t.Error("Missing X-RateLimit-Limit header")
		}
		if rec.Header().Get("X-RateLimit-Remaining") == "" {
			t.Error("Missing X-RateLimit-Remaining header")
		}
		if rec.Header().Get("X-RateLimit-Reset") == "" {
			t.Error("Missing X-RateLimit-Reset header")
		}
	})

	t.Run("RateLimitErrorResponse", func(t *testing.T) {
		// Exhaust rate limit
		for i := 0; i < 3; i++ {
			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = "10.0.0.4:1234"
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
		}

		// This request should be rate limited
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = "10.0.0.4:1234"
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusTooManyRequests {
			t.Errorf("Expected 429, got %d", rec.Code)
		}

		// Check Retry-After header
		if rec.Header().Get("Retry-After") == "" {
			t.Error("Missing Retry-After header")
		}

		// Check response body
		var response map[string]interface{}
		if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
			t.Errorf("Failed to decode response: %v", err)
		}

		if response["error"] != "Too Many Requests" {
			t.Errorf("Unexpected error message: %v", response["error"])
		}
	})
}

func TestTokenRefill(t *testing.T) {
	// Test that tokens refill over time
	config := &RateLimitConfig{
		RequestsPerMinute: 60, // 1 per second
		BurstCapacity:     1,
	}

	rl := NewRateLimiter(config)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := rl.RateLimitMiddleware(testHandler)

	// Make first request
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.5:1234"
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("First request failed, got %d", rec.Code)
	}

	// Immediate second request should be rate limited
	req = httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.5:1234"
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("Expected rate limit, got %d", rec.Code)
	}

	// Wait for token refill
	time.Sleep(1100 * time.Millisecond)

	// Should be able to make another request
	req = httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.5:1234"
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Request after refill failed, got %d", rec.Code)
	}
}

func TestGetClientIP(t *testing.T) {
	tests := []struct {
		name           string
		headers        map[string]string
		remoteAddr     string
		expectedIP     string
	}{
		{
			name: "X-Forwarded-For single IP",
			headers: map[string]string{
				"X-Forwarded-For": "192.168.1.1",
			},
			remoteAddr: "10.0.0.1:1234",
			expectedIP: "192.168.1.1",
		},
		{
			name: "X-Forwarded-For multiple IPs",
			headers: map[string]string{
				"X-Forwarded-For": "192.168.1.1, 10.0.0.2, 172.16.0.1",
			},
			remoteAddr: "10.0.0.1:1234",
			expectedIP: "192.168.1.1",
		},
		{
			name: "X-Real-IP",
			headers: map[string]string{
				"X-Real-IP": "192.168.1.2",
			},
			remoteAddr: "10.0.0.1:1234",
			expectedIP: "192.168.1.2",
		},
		{
			name:       "RemoteAddr with port",
			headers:    map[string]string{},
			remoteAddr: "192.168.1.3:1234",
			expectedIP: "192.168.1.3",
		},
		{
			name:       "RemoteAddr without port",
			headers:    map[string]string{},
			remoteAddr: "192.168.1.4",
			expectedIP: "192.168.1.4",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = tt.remoteAddr
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}

			ip := getClientIP(req)
			if ip != tt.expectedIP {
				t.Errorf("Expected IP %s, got %s", tt.expectedIP, ip)
			}
		})
	}
}