#!/usr/bin/env python3
"""
Enhanced dump.csv format with comprehensive crawl metadata
"""

import csv
import json
from datetime import datetime
import socket
import os
import getpass

def create_crawl_metadata():
    """Generate comprehensive crawl session metadata"""
    return {
        # Session identification
        'crawl_id': datetime.now().strftime('%Y%m%d_%H%M%S'),
        'agent_name': os.environ.get('CLAUDE_AGENT_ID', 'unknown_agent'),
        'agent_instance': os.environ.get('CLAUDE_INSTANCE', 'instance_6'),
        'user': getpass.getuser(),
        'hostname': socket.gethostname(),
        
        # Timing information
        'crawl_start_time': datetime.now().isoformat(),
        'crawl_end_time': None,  # Updated when crawl completes
        'crawl_duration_seconds': None,
        
        # Crawl configuration
        'target_domain': None,
        'max_pages': None,
        'crawler_method': None,
        'rate_limit_delay': None,
        
        # Results summary
        'total_urls_crawled': 0,
        'successful_200s': 0,
        'rate_limited_429s': 0,
        'other_errors': 0,
        'success_rate_percent': 0.0,
        
        # Performance metrics
        'pages_per_second': 0.0,
        'total_bytes_downloaded': 0,
        'average_response_time': 0.0,
    }

def write_enhanced_dump(crawl_data, metadata, filename='dump_enhanced.csv'):
    """Write crawl data with enhanced metadata"""
    
    # First, write metadata as a comment block
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        # Write metadata as CSV comments
        f.write("# CRAWL SESSION METADATA\n")
        f.write(f"# Crawl ID: {metadata['crawl_id']}\n")
        f.write(f"# Agent: {metadata['agent_name']} ({metadata['agent_instance']})\n")
        f.write(f"# User: {metadata['user']}@{metadata['hostname']}\n")
        f.write(f"# Start Time: {metadata['crawl_start_time']}\n")
        f.write(f"# End Time: {metadata['crawl_end_time']}\n")
        f.write(f"# Duration: {metadata['crawl_duration_seconds']} seconds\n")
        f.write(f"# Domain: {metadata['target_domain']}\n")
        f.write(f"# Total URLs: {metadata['total_urls_crawled']}\n")
        f.write(f"# Success Rate: {metadata['success_rate_percent']:.1f}%\n")
        f.write(f"# Performance: {metadata['pages_per_second']:.2f} pages/sec\n")
        f.write("#\n")
        
        # Enhanced column headers
        fieldnames = [
            'url',
            'status_code',
            'content_type',
            'size_bytes',
            'last_modified',
            'crawl_timestamp',      # When this URL was crawled
            'response_time_ms',     # How long the request took
            'redirect_count',       # Number of redirects followed
            'final_url',           # After redirects
            'error_message',       # If failed
            'retry_count',         # How many retries
            'crawler_method',      # Which method succeeded
            'headers_sent',        # What headers were used
            'cache_status',        # Cache hit/miss
            'robots_txt_status',   # Allowed/disallowed
        ]
        
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        
        # Write the crawl data
        for row in crawl_data:
            # Add crawl timestamp if not present
            if 'crawl_timestamp' not in row:
                row['crawl_timestamp'] = datetime.now().isoformat()
            writer.writerow(row)
    
    # Also save metadata as separate JSON for easy parsing
    metadata_file = filename.replace('.csv', '_metadata.json')
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Enhanced dump saved to: {filename}")
    print(f"Metadata saved to: {metadata_file}")

def read_enhanced_dump(filename='dump_enhanced.csv'):
    """Read enhanced dump file and extract metadata"""
    metadata = {}
    data = []
    
    with open(filename, 'r', encoding='utf-8') as f:
        # Parse metadata from comments
        for line in f:
            if line.startswith('#'):
                if ':' in line:
                    key, value = line[1:].strip().split(':', 1)
                    metadata[key.strip()] = value.strip()
            else:
                # Reached data section
                break
        
        # Read the CSV data
        f.seek(0)
        reader = csv.DictReader(filter(lambda row: not row.startswith('#'), f))
        data = list(reader)
    
    return metadata, data

# Example usage
if __name__ == '__main__':
    # Create sample crawl data
    crawl_results = [
        {
            'url': 'https://revzilla.com/',
            'status_code': 200,
            'content_type': 'text/html',
            'size_bytes': 523655,
            'last_modified': '',
            'crawl_timestamp': '2025-06-15T01:15:30',
            'response_time_ms': 523,
            'redirect_count': 0,
            'final_url': 'https://revzilla.com/',
            'error_message': '',
            'retry_count': 0,
            'crawler_method': 'curl_cffi_chrome99',
            'headers_sent': 'Chrome/120.0.0.0',
            'cache_status': 'miss',
            'robots_txt_status': 'allowed'
        },
        {
            'url': 'https://revzilla.com/motorcycle-helmets',
            'status_code': 200,
            'content_type': 'text/html', 
            'size_bytes': 487932,
            'last_modified': '',
            'crawl_timestamp': '2025-06-15T01:15:32',
            'response_time_ms': 412,
            'redirect_count': 0,
            'final_url': 'https://revzilla.com/motorcycle-helmets',
            'error_message': '',
            'retry_count': 0,
            'crawler_method': 'curl_cffi_chrome99',
            'headers_sent': 'Chrome/120.0.0.0',
            'cache_status': 'miss',
            'robots_txt_status': 'allowed'
        }
    ]
    
    # Create metadata
    metadata = create_crawl_metadata()
    metadata.update({
        'agent_name': 'claude_opus_4',
        'agent_instance': 'instance_6_of_6',
        'target_domain': 'revzilla.com',
        'max_pages': 100,
        'crawler_method': 'universal_crawler',
        'rate_limit_delay': 0.5,
        'crawl_end_time': datetime.now().isoformat(),
        'crawl_duration_seconds': 120,
        'total_urls_crawled': 2,
        'successful_200s': 2,
        'rate_limited_429s': 0,
        'other_errors': 0,
        'success_rate_percent': 100.0,
        'pages_per_second': 0.017,
        'total_bytes_downloaded': 1011587,
        'average_response_time': 467.5
    })
    
    # Write enhanced dump
    write_enhanced_dump(crawl_results, metadata)
    
    # Read it back
    print("\nReading back the enhanced dump:")
    read_metadata, read_data = read_enhanced_dump()
    print(f"Crawl was run by: {read_metadata.get('Agent', 'unknown')}")
    print(f"Duration: {read_metadata.get('Duration', 'unknown')}")
    print(f"Success rate: {read_metadata.get('Success Rate', 'unknown')}")