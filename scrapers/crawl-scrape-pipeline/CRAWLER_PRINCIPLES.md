# Crawler Design Principles

## Core Philosophy

**Build universal crawlers, not site-specific workarounds.**

This document defines the architectural principles for the crawl-scrape pipeline to ensure we maintain robust, generalizable crawlers rather than falling into the trap of site-specific hacks.

## Fundamental Principles

### 1. No Site-Specific Adapters

- **Never** create adapters like `RevZillaAdapter`, `CycleGearAdapter`, etc.
- **Never** hardcode site-specific logic or configurations
- If a crawler fails on a specific site, the solution is to improve the crawler, not create a workaround
- Site-specific code is a code smell indicating crawler weakness

### 2. Universal Crawling

Every crawler should:
- Work on any site without prior knowledge
- Automatically discover optimal strategies through intelligent probing
- Adapt to different site behaviors dynamically
- Learn from failures and adjust approach

### 3. Acceptable vs Unacceptable Practices

#### ✅ Acceptable (Universal Techniques)
- Automatically trying multiple user agents in sequence
- Detecting bot detection patterns and adapting
- Learning from HTTP response codes and content patterns  
- Implementing progressive enhancement (simple → complex strategies)
- Building robust retry and fallback mechanisms
- Using multiple crawling strategies (sitemap, DOM traversal, API discovery)

#### ❌ Unacceptable (Site-Specific Hacks)
- Hardcoding "use curl/7.64.1 for RevZilla"
- Creating per-site configuration files
- Building if/else chains based on domain names
- Maintaining lists of "protected sites"
- Writing custom parsers for specific sites
- Adding site-specific delays or rate limits

### 4. When Crawlers Fail

The correct response to crawler failure:

1. **Analyze** why the crawler failed
2. **Identify** the general pattern (not site-specific issue)
3. **Enhance** the crawler's detection capabilities
4. **Implement** universal solutions that work everywhere
5. **Test** on multiple sites to ensure generalizability

**Wrong response**: Creating a quick fix for that specific site.

### 5. Crawler Evolution

Crawlers should evolve through:
- **Intelligence**: Better detection of bot countermeasures
- **Adaptability**: More strategies to try when blocked
- **Resilience**: Graceful handling of failures
- **Learning**: Building better heuristics from experience

NOT through:
- Accumulating site-specific knowledge
- Building bypass lists
- Creating workaround databases

## Example: The RevZilla Case

When we discovered RevZilla blocks most user agents but allows curl:

**Wrong approach**: 
```python
if 'revzilla' in domain:
    headers['User-Agent'] = 'curl/7.64.1'
```

**Right approach**:
```python
# Try different user agents until one works
for user_agent in self.user_agent_strategies:
    response = self.try_request(url, user_agent)
    if response.success:
        self.remember_working_strategy(domain, user_agent)
        break
```

## Implementation Guidelines

1. **Strategy Pattern**: Use strategies for different approaches, not different sites
2. **Automatic Escalation**: Start simple, escalate to complex methods as needed
3. **Pattern Recognition**: Detect bot protection patterns, not site names
4. **Universal Headers**: Build realistic headers that work everywhere
5. **Adaptive Timing**: Learn optimal delays through response analysis

## Testing Philosophy

- Test crawlers on diverse sites without site-specific tuning
- Success metric: Can crawl any new site without code changes
- Failure analysis: Why did the universal approach fail?
- Never accept "it works if we special-case this site"

## Maintenance

When maintaining crawlers:
- Resist the urge to add "just one exception"
- Every site-specific fix weakens the architecture
- Time spent on universal solutions pays off long-term
- Document patterns discovered, not site-specific tricks

## Conclusion

The goal is crawlers that can walk into any website blind and figure out how to crawl it successfully. Site-specific knowledge is a crutch that prevents crawlers from developing true adaptability.

**Remember**: Every site-specific hack is a missed opportunity to build a better universal crawler.