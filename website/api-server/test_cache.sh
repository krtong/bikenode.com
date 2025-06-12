#!/bin/bash

# Test script for cabin motorcycles API caching

echo "Testing Cabin Motorcycles API Caching"
echo "====================================="

BASE_URL="http://localhost:8080/api"

# Function to check cache headers
check_cache_headers() {
    local url=$1
    local expected_hit=$2
    
    echo -e "\nTesting: $url"
    response=$(curl -s -I "$url")
    
    cache_hit=$(echo "$response" | grep -i "X-Cache-Hit:" | cut -d' ' -f2 | tr -d '\r')
    cache_source=$(echo "$response" | grep -i "X-Cache-Source:" | cut -d' ' -f2 | tr -d '\r')
    cache_age=$(echo "$response" | grep -i "X-Cache-Age:" | cut -d' ' -f2 | tr -d '\r')
    
    echo "X-Cache-Hit: $cache_hit"
    
    if [ "$cache_hit" = "true" ]; then
        echo "X-Cache-Source: $cache_source"
        echo "X-Cache-Age: $cache_age seconds"
    fi
    
    if [ "$cache_hit" != "$expected_hit" ]; then
        echo "ERROR: Expected X-Cache-Hit to be $expected_hit"
        return 1
    fi
    
    return 0
}

# Test 1: List endpoint
echo -e "\n1. Testing list endpoint (/cabin-motorcycles)"
check_cache_headers "$BASE_URL/cabin-motorcycles" "false" || exit 1
sleep 0.5
check_cache_headers "$BASE_URL/cabin-motorcycles" "true" || exit 1

# Test 2: Makes endpoint
echo -e "\n2. Testing makes endpoint (/cabin-motorcycles/makes)"
check_cache_headers "$BASE_URL/cabin-motorcycles/makes" "false" || exit 1
sleep 0.5
check_cache_headers "$BASE_URL/cabin-motorcycles/makes" "true" || exit 1

# Test 3: Stats endpoint
echo -e "\n3. Testing stats endpoint (/cabin-motorcycles/stats)"
check_cache_headers "$BASE_URL/cabin-motorcycles/stats" "false" || exit 1
sleep 0.5
check_cache_headers "$BASE_URL/cabin-motorcycles/stats" "true" || exit 1

# Test 4: Search endpoint with different queries
echo -e "\n4. Testing search endpoint with different queries"
check_cache_headers "$BASE_URL/cabin-motorcycles/search?q=bmw" "false" || exit 1
check_cache_headers "$BASE_URL/cabin-motorcycles/search?q=bmw" "true" || exit 1
check_cache_headers "$BASE_URL/cabin-motorcycles/search?q=honda" "false" || exit 1

# Test 5: Detail endpoint (assuming ID exists)
echo -e "\n5. Testing detail endpoint"
# First get an ID from the list
id=$(curl -s "$BASE_URL/cabin-motorcycles?limit=1" | jq -r '.data[0].id' 2>/dev/null)
if [ ! -z "$id" ] && [ "$id" != "null" ]; then
    check_cache_headers "$BASE_URL/cabin-motorcycles/$id" "false" || exit 1
    check_cache_headers "$BASE_URL/cabin-motorcycles/$id" "true" || exit 1
else
    echo "Skipping detail endpoint test (no data available)"
fi

echo -e "\n\nCache testing completed successfully!"
echo "====================================="

# Test cache expiration
echo -e "\n6. Testing cache expiration (search endpoint - 1 minute TTL)"
echo "Waiting 65 seconds for cache to expire..."
sleep 65
check_cache_headers "$BASE_URL/cabin-motorcycles/search?q=bmw" "false" || exit 1

echo -e "\nAll tests passed!"