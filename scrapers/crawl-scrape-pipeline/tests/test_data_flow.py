#!/usr/bin/env python3
"""
Tests to verify correct data flow between pipeline steps.
"""

import sys
import pytest
from pathlib import Path
import csv
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))


class TestDataFlow:
    """Test suite to verify data flows correctly between steps."""
    
    @pytest.fixture
    def pipeline_root(self):
        """Get pipeline root directory."""
        return Path(__file__).parent.parent
    
    def test_01_to_02_flow(self, pipeline_root):
        """Test that 02_filter reads from 01_map/dump.csv."""
        # Check that filter_urls.py references the correct input
        filter_script = pipeline_root / '02_filter' / 'filter_urls.py'
        
        with open(filter_script, 'r') as f:
            content = f.read()
            assert "'01_map' / 'dump.csv'" in content, \
                "02_filter should read from 01_map/dump.csv"
    
    def test_02_to_08_flow(self, pipeline_root):
        """Test that 08_fetch reads from 02_filter/all_urls.txt."""
        fetch_script = pipeline_root / '08_fetch' / 'crawl_full.py'
        
        with open(fetch_script, 'r') as f:
            content = f.read()
            assert "'02_filter' / 'all_urls.txt'" in content, \
                "08_fetch should read from 02_filter/all_urls.txt"
    
    def test_08_to_09_flow(self, pipeline_root):
        """Test that 09_scrape reads from 08_fetch directories."""
        parse_dom = pipeline_root / '09_scrape' / 'parse_dom.py'
        parse_json = pipeline_root / '09_scrape' / 'parse_json.py'
        
        with open(parse_dom, 'r') as f:
            content = f.read()
            assert "'08_fetch' / 'html'" in content, \
                "parse_dom.py should read from 08_fetch/html"
        
        with open(parse_json, 'r') as f:
            content = f.read()
            assert "'08_fetch' / 'json'" in content, \
                "parse_json.py should read from 08_fetch/json"
    
    def test_09_to_10_flow(self, pipeline_root):
        """Test that 10_dedupe reads from 09_scrape/parsed.ndjson."""
        dedupe_script = pipeline_root / '10_dedupe' / 'dedupe.py'
        
        with open(dedupe_script, 'r') as f:
            content = f.read()
            assert "'09_scrape' / 'parsed.ndjson'" in content, \
                "10_dedupe should read from 09_scrape/parsed.ndjson"
    
    def test_10_to_11_flow(self, pipeline_root):
        """Test that 11_clean reads from 10_dedupe/deduped.ndjson."""
        clean_script = pipeline_root / '11_clean' / 'clean.py'
        
        with open(clean_script, 'r') as f:
            content = f.read()
            assert "'10_dedupe' / 'deduped.ndjson'" in content, \
                "11_clean should read from 10_dedupe/deduped.ndjson"
    
    def test_11_to_12_flow(self, pipeline_root):
        """Test that 12_load reads from 11_clean/clean.csv."""
        load_script = pipeline_root / '12_load' / 'load_db.py'
        
        with open(load_script, 'r') as f:
            content = f.read()
            assert "'11_clean' / 'clean.csv'" in content, \
                "12_load should read from 11_clean/clean.csv"
    
    def test_13_qc_inputs(self, pipeline_root):
        """Test that 13_qc reads from both DB and clean.csv."""
        qc_script = pipeline_root / '13_qc' / 'tests.py'
        
        with open(qc_script, 'r') as f:
            content = f.read()
            # Should check clean.csv file
            assert "'11_clean' / 'clean.csv'" in content, \
                "13_qc should check 11_clean/clean.csv"
            # Should connect to database
            assert "psycopg2.connect" in content, \
                "13_qc should connect to database"
    
    def test_03_group_patterns(self, pipeline_root):
        """Test that 03_group reads from 02_filter and outputs patterns."""
        group_script = pipeline_root / '03_group' / 'group_urls.py'
        
        with open(group_script, 'r') as f:
            content = f.read()
            assert "'02_filter' / 'all_urls.txt'" in content, \
                "03_group should read from 02_filter/all_urls.txt"
            assert "by_template" in content, \
                "03_group should output to by_template directory"
    
    def test_04_probe_patterns(self, pipeline_root):
        """Test that 04_probe reads patterns from 03_group."""
        probe_script = pipeline_root / '04_probe' / 'probe_template.py'
        
        with open(probe_script, 'r') as f:
            content = f.read()
            assert "'03_group' / 'patterns_to_probe.json'" in content or \
                   "'03_group' / 'by_template'" in content, \
                "04_probe should read patterns from 03_group"
    
    def test_07_sample_inputs(self, pipeline_root):
        """Test that 07_sample reads from multiple sources."""
        sample_script = pipeline_root / '07_sample' / 'crawl_sample.py'
        
        with open(sample_script, 'r') as f:
            content = f.read()
            # Should read patterns
            assert "'03_group' / 'by_template'" in content, \
                "07_sample should read from 03_group/by_template"
            # Should read probe findings
            assert "'04_probe' / 'findings.json'" in content, \
                "07_sample should read from 04_probe/findings.json"
            # Should read selectors
            assert "'06_plan' / 'css_selectors.yaml'" in content, \
                "07_sample should read from 06_plan/css_selectors.yaml"
    
    def test_14_refresh_inputs(self, pipeline_root):
        """Test that 14_refresh reads from previous dump.csv."""
        remap_script = pipeline_root / '14_refresh' / 'remap.py'
        
        with open(remap_script, 'r') as f:
            content = f.read()
            assert "'01_map' / 'dump.csv'" in content, \
                "14_refresh/remap.py should read from 01_map/dump.csv"


class TestPipelineIntegration:
    """End-to-end integration tests."""
    
    @pytest.fixture
    def sample_data(self, tmp_path):
        """Create sample test data."""
        # Create a minimal dump.csv
        dump_csv = tmp_path / 'dump.csv'
        with open(dump_csv, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['url', 'status_code', 'content_type', 'size', 'last_modified'])
            writer.writerow(['https://example.com/product/1', '200', 'text/html', '1024', '2024-01-01'])
            writer.writerow(['https://example.com/product/2', '200', 'text/html', '2048', '2024-01-01'])
            writer.writerow(['https://example.com/api/data', '200', 'application/json', '512', '2024-01-01'])
            writer.writerow(['https://example.com/404', '404', 'text/html', '256', '2024-01-01'])
        
        return dump_csv
    
    def test_filter_logic(self, sample_data, tmp_path):
        """Test that filter correctly filters dump.csv."""
        # Simulate filter logic
        filtered_urls = []
        
        with open(sample_data, 'r', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                status_code = int(row.get('status_code', 0))
                content_type = row.get('content_type', '').lower()
                
                if status_code == 200 and content_type.startswith('text/html'):
                    filtered_urls.append(row['url'])
        
        assert len(filtered_urls) == 2, "Should filter to 2 HTML URLs"
        assert 'https://example.com/product/1' in filtered_urls
        assert 'https://example.com/product/2' in filtered_urls
        assert 'https://example.com/api/data' not in filtered_urls
        assert 'https://example.com/404' not in filtered_urls


if __name__ == '__main__':
    pytest.main([__file__, '-v'])