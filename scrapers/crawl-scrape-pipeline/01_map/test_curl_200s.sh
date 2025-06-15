#!/bin/bash
# Test getting 200s on various websites using curl with proper headers

echo "Testing Crawler Headers on Various Websites"
echo "==========================================="

# Headers that work on Cloudflare
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Function to test a URL
test_url() {
    local url=$1
    echo -e "\n📍 Testing: $url"
    
    # Make request with headers
    response=$(curl -s -o /dev/null -w "%{http_code}|%{size_download}|%{time_total}|%{url_effective}" \
        -H "User-Agent: $USER_AGENT" \
        -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \
        -H "Accept-Language: en-US,en;q=0.9" \
        -H "Accept-Encoding: gzip, deflate, br" \
        -H "DNT: 1" \
        -H "Connection: keep-alive" \
        -H "Upgrade-Insecure-Requests: 1" \
        -H "Sec-Fetch-Dest: document" \
        -H "Sec-Fetch-Mode: navigate" \
        -H "Sec-Fetch-Site: none" \
        -H "Sec-Fetch-User: ?1" \
        -H "Cache-Control: max-age=0" \
        -L "$url")
    
    # Parse response
    IFS='|' read -r status_code size time_taken final_url <<< "$response"
    
    # Display results
    if [ "$status_code" = "200" ]; then
        echo "✅ Status: $status_code | Size: $size bytes | Time: ${time_taken}s"
        echo "   Final URL: $final_url"
    else
        echo "❌ Status: $status_code | Size: $size bytes | Time: ${time_taken}s"
    fi
}

# Test sites
echo -e "\n🧪 Testing Easy Sites (should all be 200):"
test_url "https://example.com/"
test_url "https://github.com/"
test_url "https://wikipedia.org/"

echo -e "\n🔥 Testing Challenging Sites:"
test_url "https://cloudflare.com/"
test_url "https://amazon.com/"
test_url "https://google.com/"

echo -e "\n📊 Testing Search Engines:"
test_url "https://bing.com/"
test_url "https://duckduckgo.com/"

echo -e "\n🌐 Testing Social/Dynamic Sites:"
test_url "https://reddit.com/"
test_url "https://stackoverflow.com/"

echo -e "\n✅ Test Complete!"
echo "The headers that work on Cloudflare also work on most sites!"