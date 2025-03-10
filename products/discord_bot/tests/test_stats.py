#!/usr/bin/env python3
"""
Test script for the motorcycle statistics commands.
This script tests the functionality of the StatsCommands class without requiring a Discord connection.
"""

import sys
import os
import pandas as pd
import matplotlib.pyplot as plt
import io
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the StatsCommands class
from commands.stats import StatsCommands

class MockBot:
    """Mock bot class for testing"""
    def __init__(self):
        self.name = "TestBot"

class MockContext:
    """Mock context class for testing"""
    def __init__(self):
        self.sent_messages = []
        self.sent_files = []
    
    async def send(self, content=None, embed=None, file=None):
        """Mock send method"""
        message = {
            "content": content,
            "embed": embed
        }
        self.sent_messages.append(message)
        if file:
            self.sent_files.append(file)
        print(f"Message sent: {content if content else 'Embed'}")
        if embed:
            print(f"Embed title: {embed.title}")
            print(f"Embed description: {embed.description}")
            for field in embed.fields:
                print(f"Field: {field.name} - {field.value}")
        return message

async def test_brand_stats():
    """Test the brand statistics command"""
    print("\n=== Testing Brand Statistics ===")
    bot = MockBot()
    ctx = MockContext()
    stats_commands = StatsCommands(bot)
    
    # Test if data was loaded
    if stats_commands.bike_data is not None and not stats_commands.bike_data.empty:
        print(f"Successfully loaded {len(stats_commands.bike_data)} motorcycle records")
        
        # Test brand stats
        await stats_commands.show_brand_stats(ctx)
        
        # Check results
        if ctx.sent_messages:
            print("Brand stats test passed!")
        else:
            print("Brand stats test failed: No messages sent")
    else:
        print("Test failed: No motorcycle data loaded")

async def test_category_stats():
    """Test the category statistics command"""
    print("\n=== Testing Category Statistics ===")
    bot = MockBot()
    ctx = MockContext()
    stats_commands = StatsCommands(bot)
    
    # Test category stats
    await stats_commands.show_category_stats(ctx)
    
    # Check results
    if ctx.sent_messages:
        print("Category stats test passed!")
    else:
        print("Category stats test failed: No messages sent")

async def test_year_stats():
    """Test the year statistics command"""
    print("\n=== Testing Year Statistics ===")
    bot = MockBot()
    ctx = MockContext()
    stats_commands = StatsCommands(bot)
    
    # Test year stats
    await stats_commands.show_year_stats(ctx)
    
    # Check results
    if ctx.sent_messages:
        print("Year stats test passed!")
    else:
        print("Year stats test failed: No messages sent")

async def run_tests():
    """Run all tests"""
    await test_brand_stats()
    await test_category_stats()
    await test_year_stats()

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_tests())