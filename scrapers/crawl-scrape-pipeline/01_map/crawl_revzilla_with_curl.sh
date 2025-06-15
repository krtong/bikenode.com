#!/bin/bash
# Actually crawl RevZilla using curl since Python is broken

echo "Crawling RevZilla with curl..."

# Create dump.csv header
echo "url,status_code,content_type,size,last_modified" > dump.csv

# Start with homepage
urls=("https://www.revzilla.com/")
visited=()
count=0
max_pages=50

USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

while [ ${#urls[@]} -gt 0 ] && [ $count -lt $max_pages ]; do
    # Get next URL
    url="${urls[0]}"
    urls=("${urls[@]:1}")
    
    # Skip if already visited
    if [[ " ${visited[@]} " =~ " ${url} " ]]; then
        continue
    fi
    
    visited+=("$url")
    ((count++))
    
    echo "[$count/$max_pages] Crawling: $url"
    
    # Get page with headers
    response=$(curl -s -D - \
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
        --compressed \
        -L "$url" 2>/dev/null)
    
    # Extract status code
    status_code=$(echo "$response" | grep -E "^HTTP" | tail -1 | awk '{print $2}')
    
    # Extract content type
    content_type=$(echo "$response" | grep -i "^content-type:" | cut -d' ' -f2 | cut -d';' -f1)
    
    # Get body size
    body=$(echo "$response" | sed -n '/^$/,$p')
    size=${#body}
    
    # Extract last modified
    last_modified=$(echo "$response" | grep -i "^last-modified:" | cut -d' ' -f2-)
    
    # Save to CSV
    echo "\"$url\",$status_code,\"$content_type\",$size,\"$last_modified\"" >> dump.csv
    
    # Extract links if successful HTML page
    if [ "$status_code" = "200" ] && [[ "$content_type" == *"text/html"* ]]; then
        # Extract href links
        new_links=$(echo "$body" | grep -oE 'href="[^"]+' | cut -d'"' -f2 | grep -E '^(https://www\.revzilla\.com|/)' | head -20)
        
        for link in $new_links; do
            # Convert relative to absolute
            if [[ "$link" == /* ]]; then
                link="https://www.revzilla.com$link"
            fi
            
            # Add if not visited and is RevZilla URL
            if [[ "$link" == *"revzilla.com"* ]] && [[ ! " ${visited[@]} " =~ " ${link} " ]] && [[ ! " ${urls[@]} " =~ " ${link} " ]]; then
                urls+=("$link")
            fi
        done
    fi
    
    sleep 0.5
done

echo ""
echo "Crawl complete!"
echo "Pages crawled: $count"
echo "Results saved to: dump.csv"

# Show summary
success_count=$(grep -c ",200," dump.csv)
echo "Success rate: $success_count/$count pages returned 200"