#!/bin/bash
# Test RevZilla with our winning crawler configuration

echo "🏍️  Testing Universal Crawler on RevZilla"
echo "======================================="

# Our winning headers that work on Amazon, Cloudflare, etc.
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

echo -e "\n📍 Testing RevZilla homepage..."

# Test main URL
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
    -L "https://revzilla.com/")

IFS='|' read -r status_code size time_taken final_url <<< "$response"

if [ "$status_code" = "200" ]; then
    echo "✅ RevZilla Homepage: Status $status_code | Size: $size bytes | Time: ${time_taken}s"
else
    echo "❌ RevZilla Homepage: Status $status_code"
fi

# Test a product page
echo -e "\n📍 Testing RevZilla product page..."
response2=$(curl -s -o /dev/null -w "%{http_code}|%{size_download}|%{time_total}" \
    -H "User-Agent: $USER_AGENT" \
    -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \
    -H "Accept-Language: en-US,en;q=0.9" \
    -H "Accept-Encoding: gzip, deflate, br" \
    -H "DNT: 1" \
    -H "Connection: keep-alive" \
    -H "Upgrade-Insecure-Requests: 1" \
    -H "Referer: https://revzilla.com/" \
    -L "https://www.revzilla.com/motorcycle-helmets")

IFS='|' read -r status_code2 size2 time_taken2 <<< "$response2"

if [ "$status_code2" = "200" ]; then
    echo "✅ RevZilla Helmets: Status $status_code2 | Size: $size2 bytes | Time: ${time_taken2}s"
else
    echo "❌ RevZilla Helmets: Status $status_code2"
fi

# Save current configuration to CSV
echo -e "\n💾 Saving results to dump.csv..."
echo "url,status_code,content_type,size,last_modified,method" > dump_revzilla_test.csv
echo "https://revzilla.com/,$status_code,text/html,$size,,winning_headers" >> dump_revzilla_test.csv
echo "https://www.revzilla.com/motorcycle-helmets,$status_code2,text/html,$size2,,winning_headers" >> dump_revzilla_test.csv

echo -e "\n📊 Summary:"
if [ "$status_code" = "200" ] && [ "$status_code2" = "200" ]; then
    echo "🎉 SUCCESS! Universal crawler works on RevZilla!"
    echo "✅ Both homepage and product pages return 200"
    echo "🏆 The same headers that work on Amazon/Cloudflare work on RevZilla!"
else
    echo "⚠️  Mixed results - may need adjustments for RevZilla"
fi