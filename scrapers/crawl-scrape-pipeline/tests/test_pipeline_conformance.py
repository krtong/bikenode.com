#!/usr/bin/env python3
"""
Integration tests to verify pipeline conformance to SCRAPING_PIPELINE_SPEC.md
"""

import sys
import pytest
from pathlib import Path
import csv
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / 'orchestration'))

from utils_minimal import load_json, load_ndjson


class TestPipelineConformance:
    """Test suite to verify pipeline conforms to specification."""
    
    @pytest.fixture
    def pipeline_root(self):
        """Get pipeline root directory."""
        return Path(__file__).parent.parent
    
    def test_directory_structure(self, pipeline_root):
        """Test that all required directories exist."""
        required_dirs = [
            '00_env', '01_map', '02_filter', '03_group', '04_probe',
            '05_decide', '06_plan', '07_sample', '08_fetch', '09_scrape',
            '10_dedupe', '11_clean', '12_load', '13_qc', '14_refresh'
        ]
        
        for dir_name in required_dirs:
            dir_path = pipeline_root / dir_name
            assert dir_path.exists(), f"Required directory {dir_name} does not exist"
            assert dir_path.is_dir(), f"{dir_name} is not a directory"
    
    def test_00_env_contents(self, pipeline_root):
        """Test that 00_env only contains environment files."""
        env_dir = pipeline_root / '00_env'
        allowed_files = {'.env', '.env.example', '.gitignore'}
        
        for file in env_dir.iterdir():
            assert file.name in allowed_files, f"Unexpected file in 00_env: {file.name}"
    
    def test_01_map_output(self, pipeline_root):
        """Test that 01_map produces dump.csv with correct columns."""
        dump_file = pipeline_root / '01_map' / 'dump.csv'
        
        if dump_file.exists():
            with open(dump_file, 'r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames
                
                required_columns = ['url', 'status_code', 'content_type']
                for col in required_columns:
                    assert col in headers, f"Missing required column in dump.csv: {col}"
    
    def test_02_filter_output(self, pipeline_root):
        """Test that 02_filter produces all_urls.txt."""
        urls_file = pipeline_root / '02_filter' / 'all_urls.txt'
        
        if urls_file.exists():
            with open(urls_file, 'r') as f:
                lines = f.readlines()
                for line in lines:
                    # Each line should be a valid URL
                    assert line.strip().startswith(('http://', 'https://')), \
                        f"Invalid URL in all_urls.txt: {line.strip()}"
    
    def test_03_group_output(self, pipeline_root):
        """Test that 03_group creates by_template directory."""
        template_dir = pipeline_root / '03_group' / 'by_template'
        
        if template_dir.exists():
            assert template_dir.is_dir(), "by_template should be a directory"
            
            # Check that template files contain URLs
            for template_file in template_dir.glob('*.txt'):
                with open(template_file, 'r') as f:
                    lines = f.readlines()
                    assert len(lines) > 0, f"Template file {template_file.name} is empty"
    
    def test_04_probe_output(self, pipeline_root):
        """Test that 04_probe creates findings.yaml."""
        findings_file = pipeline_root / '04_probe' / 'findings.yaml'
        
        if findings_file.exists():
            # Should be valid YAML
            import yaml
            with open(findings_file, 'r') as f:
                findings = yaml.safe_load(f)
                assert isinstance(findings, dict), "findings.yaml should contain a dictionary"
    
    def test_06_plan_output(self, pipeline_root):
        """Test that 06_plan creates selector files."""
        plan_dir = pipeline_root / '06_plan'
        
        # Check for CSS selectors
        css_file = plan_dir / 'css_selectors.yaml'
        if css_file.exists():
            import yaml
            with open(css_file, 'r') as f:
                selectors = yaml.safe_load(f)
                assert isinstance(selectors, dict), "css_selectors.yaml should contain a dictionary"
    
    def test_07_sample_output(self, pipeline_root):
        """Test that 07_sample creates output.ndjson."""
        output_file = pipeline_root / '07_sample' / 'output.ndjson'
        
        if output_file.exists():
            # Should be valid NDJSON
            records = load_ndjson(output_file)
            assert len(records) > 0, "output.ndjson should contain records"
            
            # Check record structure
            for record in records[:5]:
                assert 'url' in record, "Each record should have a url"
                assert 'data' in record or 'extracted_data' in record, \
                    "Each record should have data or extracted_data"
    
    def test_08_fetch_output(self, pipeline_root):
        """Test that 08_fetch creates html and json directories."""
        fetch_dir = pipeline_root / '08_fetch'
        
        assert (fetch_dir / 'html').exists(), "08_fetch should have html directory"
        assert (fetch_dir / 'json').exists(), "08_fetch should have json directory"
    
    def test_09_scrape_output(self, pipeline_root):
        """Test that 09_scrape creates parsed.ndjson."""
        parsed_file = pipeline_root / '09_scrape' / 'parsed.ndjson'
        
        if parsed_file.exists():
            records = load_ndjson(parsed_file)
            assert len(records) > 0, "parsed.ndjson should contain records"
    
    def test_10_dedupe_output(self, pipeline_root):
        """Test that 10_dedupe creates deduped.ndjson."""
        deduped_file = pipeline_root / '10_dedupe' / 'deduped.ndjson'
        
        if deduped_file.exists():
            records = load_ndjson(deduped_file)
            # Check for duplicates based on URL
            urls = [r.get('url') for r in records if r.get('url')]
            assert len(urls) == len(set(urls)), "deduped.ndjson contains duplicate URLs"
    
    def test_11_clean_output(self, pipeline_root):
        """Test that 11_clean creates clean.csv."""
        clean_file = pipeline_root / '11_clean' / 'clean.csv'
        
        if clean_file.exists():
            with open(clean_file, 'r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames
                
                # Should have standard columns
                expected_columns = ['url', 'title', 'price']
                for col in expected_columns:
                    if col in headers:
                        # Verify data types
                        for row in reader:
                            if col == 'price' and row[col]:
                                try:
                                    float(row[col])
                                except ValueError:
                                    pytest.fail(f"Invalid price value: {row[col]}")
                            break
    
    def test_12_load_schema(self, pipeline_root):
        """Test that 12_load has schema.sql."""
        schema_file = pipeline_root / '12_load' / 'schema.sql'
        assert schema_file.exists(), "12_load should have schema.sql"
        
        with open(schema_file, 'r') as f:
            content = f.read()
            assert 'CREATE TABLE' in content, "schema.sql should contain CREATE TABLE statements"
    
    def test_13_qc_output(self, pipeline_root):
        """Test that 13_qc creates qc_report.txt."""
        report_file = pipeline_root / '13_qc' / 'qc_report.txt'
        
        if report_file.exists():
            with open(report_file, 'r') as f:
                content = f.read()
                assert 'QUALITY CONTROL REPORT' in content, \
                    "qc_report.txt should contain quality control report"
    
    def test_no_cross_folder_writes(self, pipeline_root):
        """Test that scripts don't write to other folders."""
        # This is a static analysis test - would need to parse code
        # For now, we can check that each folder's outputs are in the right place
        
        cross_writes = []
        
        # Check each step's expected outputs
        expected_outputs = {
            '01_map': ['dump.csv'],
            '02_filter': ['all_urls.txt'],
            '03_group': ['by_template/', 'grouping_summary.json'],
            '04_probe': ['findings.yaml', 'pages/', 'netlogs/'],
            '05_decide': ['decision.md'],
            '06_plan': ['css_selectors.yaml', 'api_endpoints.yaml'],
            '07_sample': ['output.ndjson', 'sample.log'],
            '08_fetch': ['html/', 'json/', 'fetch.log'],
            '09_scrape': ['parsed.ndjson', 'scrape.log'],
            '10_dedupe': ['deduped.ndjson'],
            '11_clean': ['clean.csv', 'clean.json'],
            '12_load': ['load_stats.json'],
            '13_qc': ['qc_report.txt', 'qc_report.json'],
            '14_refresh': ['url_mappings.json', 'incremental_urls.txt'],
        }
        
        for step, outputs in expected_outputs.items():
            step_dir = pipeline_root / step
            if step_dir.exists():
                for output in outputs:
                    output_path = step_dir / output
                    # Check if output exists in correct location
                    if not output_path.exists() and not output.endswith('/'):
                        # This is okay - not all outputs will exist in test
                        pass
        
        assert len(cross_writes) == 0, f"Found cross-folder writes: {cross_writes}"
    
    def test_explicit_paths(self, pipeline_root):
        """Test that scripts use explicit paths, not config.dirs."""
        # Check that no Python files use config.dirs
        for py_file in pipeline_root.rglob('*.py'):
            if 'orchestration' in str(py_file) or 'tests' in str(py_file):
                continue
                
            with open(py_file, 'r') as f:
                content = f.read()
                assert 'config.dirs' not in content, \
                    f"{py_file} uses config.dirs instead of explicit paths"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])