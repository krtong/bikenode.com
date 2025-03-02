import unittest
import json
import sys
import os
from time import sleep
import argparse

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.bicycles.scrape import NinetyNineSpokesScraper

class TestNinetyNineSpokesScraper(unittest.TestCase):
    
    def setUp(self):
        """Set up the scraper instance before each test"""
        # Check if we should allow manual intervention (from command line arg)
        allow_manual = getattr(self, 'allow_manual_intervention', False)
        headless = not allow_manual  # Use headless mode unless manual intervention is enabled
        
        self.scraper = NinetyNineSpokesScraper(
            headless=headless, 
            allow_manual_intervention=allow_manual
        )
    
    def tearDown(self):
        """Clean up after each test"""
        self.scraper.close()
    
    def test_search_bikes(self):
        """Test searching for bikes on 99spokes"""
        # First check if we're being blocked by bot protection
        test_url = "https://99spokes.com/bikes"
        navigation_success = self.scraper.navigate_to_url(test_url)
        
        if not navigation_success or self.scraper.is_bot_challenge_page():
            self.skipTest("Bot protection detected - skipping test that requires website access")
        
        # If we can access the site, proceed with the test
        results = self.scraper.search_bikes_content_based(year=2025, max_pages=1)
        
        # Verify we got results
        self.assertIsInstance(results, list)
        self.assertTrue(len(results) > 0)
        
        # Check structure of results
        if results:
            self.assertIn("make", results[0])
            self.assertIn("model", results[0])
    
    def test_bike_to_json(self):
        """Test converting bike data to JSON format"""
        # Create a sample bike data
        bike_data = {
            "make": "Trek",
            "model": "Domane SL 6",
            "type": "Road Bike",
            "specifications": {"frame": "Carbon", "groupset": "Shimano 105"}
        }
        
        # Convert to JSON
        json_str = self.scraper.bike_to_json(bike_data)
        
        # Verify it's valid JSON
        parsed = json.loads(json_str)
        self.assertEqual(parsed["make"], "Trek")
        self.assertEqual(parsed["model"], "Domane SL 6")
    
    def test_save_to_csv(self):
        """Test saving bike data to CSV"""
        # Add some test data
        self.scraper.bikes = [
            {"make": "Trek", "model": "Madone", "type": "Road"},
            {"make": "Specialized", "model": "Stumpjumper", "type": "MTB"}
        ]
        
        # Save to a test file
        test_file = "test_bikes.csv"
        result = self.scraper.save_to_csv(test_file)
        
        # Verify the save was successful
        self.assertTrue(result)
        
        # Verify the file exists
        self.assertTrue(os.path.exists(test_file))
        
        # Clean up the test file
        if os.path.exists(test_file):
            os.remove(test_file)


if __name__ == "__main__":
    # Add command-line argument to enable manual intervention
    parser = argparse.ArgumentParser()
    parser.add_argument('--manual', action='store_true', help='Allow manual intervention for CAPTCHA/challenge solving')
    
    # Parse arguments before unittest's own argument parser runs
    args, remaining = parser.parse_known_args()
    
    # Update sys.argv to remove our custom arguments
    sys.argv = sys.argv[:1] + remaining
    
    # Set the flag on the test class
    TestNinetyNineSpokesScraper.allow_manual_intervention = args.manual
    
    # Run the tests
    unittest.main()
