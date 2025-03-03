import unittest
import json
import sys
import os
from time import sleep

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.bicycles.craigslist_scraper import CraigslistScraper

class TestCraigslistScraper(unittest.TestCase):
    
    def setUp(self):
        """Set up the scraper instance before each test"""
        self.scraper = CraigslistScraper(headless=False)  # Set to True for headless mode
    
    def tearDown(self):
        """Clean up after each test"""
        self.scraper.close()
    
    def test_search_bikes(self):
        """Test searching for bikes on Craigslist"""
        results = self.scraper.search_bikes(
            location="sfbay",
            query="mountain bike",
            max_results=3
        )
        
        # Verify we got results
        self.assertIsInstance(results, list)
        self.assertTrue(len(results) > 0)
        
        # Check structure of results
        for result in results:
            self.assertIn("title", result)
            self.assertIn("url", result)
            self.assertIn("price", result)
            
            # Verify the URLs are valid Craigslist URLs
            self.assertTrue(result["url"].startswith("https://"))
            self.assertIn("craigslist.org", result["url"])
    
    def test_get_listing_details(self):
        """Test getting details from a specific listing"""
        # First get some search results to find a valid listing URL
        results = self.scraper.search_bikes(max_results=1)
        
        if not results:
            self.skipTest("No listings found to test with")
            
        # Get the first listing URL
        listing_url = results[0]["url"]
        
        # Get details for this listing
        details = self.scraper.get_listing_details(listing_url)
        
        # Verify details structure
        self.assertIn("title", details)
        self.assertIn("description", details)
        self.assertIn("attributes", details)
    
    def test_listing_to_json(self):
        """Test converting listing to JSON format"""
        # Create a sample listing
        listing = {
            "title": "Test Bike",
            "price": "$500",
            "description": "A great bike for sale",
            "attributes": {"condition": "like new", "make": "Trek"}
        }
        
        # Convert to JSON
        json_str = self.scraper.listing_to_json(listing)
        
        # Verify it's valid JSON
        parsed = json.loads(json_str)
        self.assertEqual(parsed["title"], "Test Bike")
        self.assertEqual(parsed["price"], "$500")
    
    def test_end_to_end_process(self):
        """Test the complete workflow from search to JSON"""
        # Search for bikes
        results = self.scraper.search_bikes(
            location="sfbay",
            query="road bike",
            max_results=1
        )
        
        if not results:
            self.skipTest("No listings found to test with")
        
        # Get details for the first listing
        listing_url = results[0]["url"]
        details = self.scraper.get_listing_details(listing_url)
        
        # Convert to JSON
        json_str = self.scraper.listing_to_json(details)
        
        # Validate JSON format
        parsed = json.loads(json_str)
        self.assertEqual(parsed["title"], details["title"])


if __name__ == "__main__":
    unittest.main()
