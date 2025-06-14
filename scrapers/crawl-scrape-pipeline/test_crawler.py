#!/usr/bin/env python3
"""
Test crawler for the crawl-scrape pipeline.
Tests basic functionality of each step.
"""
import sys
import subprocess
import time
from pathlib import Path
import json


class TestCrawler:
    """Tests the crawl-scrape pipeline."""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.test_domain = "quotes.toscrape.com"
        self.passed = 0
        self.failed = 0
        
    def run_command(self, cmd: list, timeout: int = 60) -> tuple:
        """Run a command and return (success, output, error)."""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=True
            )
            return True, result.stdout, result.stderr
        except subprocess.CalledProcessError as e:
            return False, e.stdout, e.stderr
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
    
    def test_step_01_map(self):
        """Test site mapping."""
        print("\n=== Testing Step 01: Site Mapping ===")
        
        cmd = [
            sys.executable,
            str(self.base_dir / "01_map" / "simple_map.py"),
            self.test_domain
        ]
        
        success, stdout, stderr = self.run_command(cmd)
        
        if success:
            # Check output files
            sitemap = self.base_dir / "01_map" / "sitemap.txt"
            dump_csv = self.base_dir / "01_map" / "dump.csv"
            
            if sitemap.exists() and dump_csv.exists():
                urls = len(sitemap.read_text().strip().split('\n'))
                print(f"✓ Step 01 passed: Found {urls} URLs")
                self.passed += 1
                return True
            else:
                print("✗ Step 01 failed: Output files not created")
                self.failed += 1
                return False
        else:
            print(f"✗ Step 01 failed: {stderr}")
            self.failed += 1
            return False
    
    def test_step_02_filter(self):
        """Test URL filtering."""
        print("\n=== Testing Step 02: URL Filtering ===")
        
        cmd = [
            sys.executable,
            str(self.base_dir / "02_filter" / "filter_urls.py")
        ]
        
        success, stdout, stderr = self.run_command(cmd)
        
        if success:
            all_urls = self.base_dir / "02_filter" / "all_urls.txt"
            if all_urls.exists():
                urls = len(all_urls.read_text().strip().split('\n'))
                print(f"✓ Step 02 passed: {urls} URLs passed filter")
                self.passed += 1
                return True
            else:
                print("✗ Step 02 failed: Output file not created")
                self.failed += 1
                return False
        else:
            print(f"✗ Step 02 failed: {stderr}")
            self.failed += 1
            return False
    
    def test_step_03_group(self):
        """Test URL grouping."""
        print("\n=== Testing Step 03: URL Grouping ===")
        
        cmd = [
            sys.executable,
            str(self.base_dir / "03_group" / "group_urls.py"),
            "--domain", self.test_domain
        ]
        
        success, stdout, stderr = self.run_command(cmd)
        
        if success:
            summary = self.base_dir / "03_group" / "grouping_summary.json"
            if summary.exists():
                data = json.loads(summary.read_text())
                patterns = data.get("total_patterns", 0)
                print(f"✓ Step 03 passed: Found {patterns} URL patterns")
                self.passed += 1
                return True
            else:
                print("✗ Step 03 failed: Summary file not created")
                self.failed += 1
                return False
        else:
            print(f"✗ Step 03 failed: {stderr}")
            self.failed += 1
            return False
    
    def test_pipeline_runner(self):
        """Test the main pipeline runner."""
        print("\n=== Testing Pipeline Runner ===")
        
        cmd = [
            sys.executable,
            str(self.base_dir / "run_pipeline.py"),
            self.test_domain,
            "--start", "01_map",
            "--end", "03_group"
        ]
        
        success, stdout, stderr = self.run_command(cmd, timeout=120)
        
        if success:
            print("✓ Pipeline runner passed")
            self.passed += 1
            return True
        else:
            print(f"✗ Pipeline runner failed: {stderr}")
            self.failed += 1
            return False
    
    def cleanup(self):
        """Clean up test artifacts."""
        # Remove test output files
        test_files = [
            self.base_dir / "01_map" / "sitemap.txt",
            self.base_dir / "01_map" / "dump.csv",
            self.base_dir / "02_filter" / "all_urls.txt",
            self.base_dir / "03_group" / "grouping_summary.json",
            self.base_dir / "03_group" / "patterns_to_probe.json",
        ]
        
        for file in test_files:
            if file.exists():
                file.unlink()
        
        # Remove group files
        group_dir = self.base_dir / "03_group" / "by_template"
        if group_dir.exists():
            for file in group_dir.glob("*.txt"):
                file.unlink()
    
    def run_all_tests(self):
        """Run all tests."""
        print("Starting crawler pipeline tests...")
        print(f"Test domain: {self.test_domain}")
        
        # Run individual step tests
        self.test_step_01_map()
        self.test_step_02_filter()
        self.test_step_03_group()
        
        # Run pipeline test
        self.test_pipeline_runner()
        
        # Summary
        print("\n" + "="*50)
        print(f"Tests completed: {self.passed + self.failed}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        
        if self.failed == 0:
            print("\n✓ All tests passed!")
        else:
            print(f"\n✗ {self.failed} tests failed")
        
        # Cleanup
        print("\nCleaning up test artifacts...")
        self.cleanup()
        
        return self.failed == 0


def main():
    """Run the test suite."""
    tester = TestCrawler()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()