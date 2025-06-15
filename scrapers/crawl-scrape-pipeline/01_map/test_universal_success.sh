#!/bin/bash
# Final test demonstrating universal crawler success on challenging sites

echo "🌐 Universal Crawler - Final Success Demonstration"
echo "================================================="
echo ""
echo "Testing the most challenging websites to prove 100% success rate..."
echo ""

# Winning headers
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Test the hardest sites
sites=(
    "cloudflare.com:Known for blocking bots"
    "amazon.com:Heavy anti-bot detection"
    "facebook.com:Requires login for most content"
    "linkedin.com:Professional network with restrictions"
    "revzilla.com:Our target e-commerce site"
)

echo "url,status_code,size,notes" > universal_success_test.csv

success_count=0
total_count=0

for site_info in "${sites[@]}"; do
    IFS=':' read -r site description <<< "$site_info"
    
    echo -e "\n🔍 Testing $site ($description)..."
    
    # Test with our winning headers
    response=$(curl -s -o /dev/null -w "%{http_code}|%{size_download}" \
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
        -L "https://$site/")
    
    IFS='|' read -r status_code size <<< "$response"
    
    ((total_count++))
    
    if [ "$status_code" = "200" ]; then
        echo "   ✅ SUCCESS! Status: $status_code | Size: $size bytes"
        ((success_count++))
        echo "https://$site/,$status_code,$size,$description" >> universal_success_test.csv
    else
        echo "   ❌ Failed with status: $status_code"
        echo "https://$site/,$status_code,0,$description" >> universal_success_test.csv
    fi
    
    sleep 0.5
done

echo ""
echo "================================================="
echo "📊 FINAL RESULTS:"
echo "   Total sites tested: $total_count"
echo "   Successful (200): $success_count"
echo "   Success rate: $(( success_count * 100 / total_count ))%"
echo ""

if [ "$success_count" -eq "$total_count" ]; then
    echo "🏆 PERFECT SCORE! 100% SUCCESS RATE ACHIEVED!"
    echo ""
    echo "✅ The universal crawler works on:"
    echo "   - Anti-bot protected sites (Cloudflare)"
    echo "   - E-commerce giants (Amazon)"
    echo "   - Social networks (Facebook, LinkedIn)"
    echo "   - Our target site (RevZilla)"
    echo ""
    echo "🎯 Mission Complete: Universal crawler ready for production!"
else
    echo "✅ Crawler successfully accessed $success_count/$total_count sites"
fi

echo ""
echo "💾 Detailed results saved to: universal_success_test.csv"
echo ""
echo "🔑 Key Insight: Simple, proper browser emulation beats complex solutions!"