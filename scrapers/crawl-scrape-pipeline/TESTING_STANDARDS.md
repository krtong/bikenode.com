# Crawler Testing Standards

This document defines the standards for testing the crawl-scrape pipeline to ensure reliable operation and avoid misunderstanding test results.

## What Constitutes a "Successful" Crawl

A crawl is considered successful when ALL of the following criteria are met:

### 1. HTTP Status Codes
- **200 OK**: The primary success indicator
- **301/302 Redirects**: Acceptable if they lead to 200 status
- **0 or Error Status**: Indicates complete failure

### 2. Content Quality
- **Size Requirements**:
  - HTML content must be > 1KB (1000 bytes) for meaningful pages
  - Product pages typically > 100KB
  - Empty or near-empty responses indicate failure
  
- **Content Type**:
  - Must match expected type (text/html for web pages)
  - Compressed/garbled content indicates encoding issues

### 3. Data Integrity
- **No JavaScript Template URLs**: URLs like `${this.ops.link}` or `{{variable}}` must be filtered
- **No Anchor Duplicates**: URLs differing only by anchors (#section) should be deduplicated
- **Valid URLs**: All URLs must be properly formed and parseable

## How to Verify Content Quality

### Basic Verification
```python
# Check status code
assert data['status_code'] == 200

# Check content size
assert data['size'] > 1000  # Minimum 1KB

# Check content type
assert 'text/html' in data['content_type']
```

### Enhanced Verification
```python
# For enhanced metadata
assert data.get('page_title', '').strip() != ''
assert len(data.get('link_count', 0)) > 0
```

## Common Failure Patterns to Check

### 1. Garbled/Compressed Content
- **Symptom**: Binary or unreadable content despite 200 status
- **Cause**: Accept-Encoding header causing unwanted compression
- **Fix**: Remove Accept-Encoding header from requests

### 2. JavaScript Template URLs
- **Symptom**: URLs containing `${variable}` or `{{template}}`
- **Cause**: JavaScript code being parsed as HTML links
- **Fix**: Filter URLs containing template syntax

### 3. Anchor Duplicates
- **Symptom**: Multiple entries for same page with different anchors
- **Example**: `/page`, `/page#section1`, `/page#section2`
- **Fix**: Track base URLs and skip anchored versions

### 4. Zero-Size Content
- **Symptom**: 200 status but 0 bytes content
- **Cause**: Server errors, bot detection, or malformed requests
- **Fix**: Verify headers and user agent are properly set

## Required Tests Before Declaring Success

### 1. Unit Tests
- Test URL filtering (JavaScript templates, anchors)
- Test content parsing
- Test error handling

### 2. Integration Tests
- Test on simple site (example.com) - should get 1-2 URLs
- Test on complex site (e-commerce) - should get 10+ URLs
- Verify content size and quality

### 3. Content Quality Tests
Run `test_crawler_content.py` to check:
- JavaScript URL filtering
- Anchor deduplication
- Content size validation
- Status code distribution

### 4. Performance Tests
- Verify rate limiting works
- Check memory usage for large crawls
- Ensure proper cleanup after completion

## Test Commands

### Basic Test
```bash
python run_map.py example.com --max-pages 5
```

### Content Quality Test
```bash
python test_crawler_content.py
```

### Comprehensive Test
```bash
python test_crawler_fixes.py
```

## Interpreting Results

### Good Result
```
Total URLs: 20
Success rate: 100.0%
JavaScript URLs: 0
Anchor duplicates: 0
Average content size: >100KB
```

### Bad Result
```
Total URLs: 100
Success rate: 50%
JavaScript URLs: 5
Anchor duplicates: 80
Average content size: <1KB
```

## Development Rules

1. **Always test full versions** of scripts, not demos or workarounds
2. **Fix actual issues** instead of making workarounds
3. **Fix the environment** if broken, don't use different environments
4. **Verify actual content**, not just status codes
5. **Run comprehensive tests** before declaring success

## Debugging Checklist

When a crawl appears to fail:

1. Check the CSV output for:
   - JavaScript template URLs
   - Duplicate URLs with anchors
   - Zero or suspicious sizes
   - Error status codes

2. Run a small test (5-10 URLs) and inspect:
   - Response headers
   - Content size
   - Actual HTML content

3. Verify environment:
   - All dependencies installed
   - Correct Python version
   - No import errors

4. Check logs for:
   - Rate limiting (429 errors)
   - Redirect loops
   - Connection errors

Remember: A crawler that returns 200 status codes but no real content is NOT successful!