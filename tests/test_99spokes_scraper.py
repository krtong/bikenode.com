import unittest
import json
import sys
import os
from time import sleep

# Add the parent directory to the path so we can import the module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.bicycles.scrape import NinetyNineSpokesScraper

class TestNinetyNineSpokesScraper(unittest.TestCase):
    
    def setUp(self):
        """Set up the scraper instance before each test"""
        self.scraper = NinetyNineSpokesScraper(headless=True)
    
    def tearDown(self):
        """Clean up after each test"""
        self.scraper.close()
    
    def test_search_bikes(self):
        """Test searching for bikes on 99spokes"""
        results = self.scraper.search_bikes(
            year=2025,
            max_pages=1
        )
        
        # Verify we got results
        self.assertIsInstance(results, list)
        self.assertTrue(len(results) > 0)
        
        # Check structure of results
        for result in results:
            self.assertIn("make", result)
            self.assertIn("model", result)
            self.assertIn("type", result)
    
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
    unittest.main()
