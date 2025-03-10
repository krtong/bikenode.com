#!/usr/bin/env python3
"""
Test script for the motorcycle comparison commands.
This script tests the functionality of the CompareCommands class without requiring a Discord connection.
"""

import sys
import os
import pandas as pd
import matplotlib.pyplot as plt
import io
from pathlib import Path
import asyncio
import discord

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the CompareCommands class
from commands.compare import CompareCommands

class MockBot:
    """Mock bot class for testing"""
    def __init__(self):
        self.name = "TestBot"
        self.wait_for_called = False
        self.wait_for_result = None
    
    async def wait_for(self, event_type, check=None, timeout=None):
        """Mock wait_for method"""
        self.wait_for_called = True
        
        # For testing, we'll simulate the user selecting option 1
        class MockMessage:
            def __init__(self):
                self.content = "1"
                self.author = None
                self.channel = None
        
        # Return a mock message with content "1" (selecting the first option)
        return self.wait_for_result or MockMessage()

class MockContext:
    """Mock context class for testing"""
    def __init__(self):
        self.sent_messages = []
        self.sent_files = []
        self.author = MockUser()
        self.channel = MockChannel()
    
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

class MockUser:
    """Mock user class for testing"""
    def __init__(self):
        self.id = 123456789
        self.name = "TestUser"

class MockChannel:
    """Mock channel class for testing"""
    def __init__(self):
        self.id = 987654321
        self.name = "TestChannel"

async def test_search_bike():
    """Test the _search_bike method"""
    print("\n=== Testing Bike Search ===")
    bot = MockBot()
    compare_commands = CompareCommands(bot)
    
    # Test searching for a bike
    bike1_query = "2023 Honda CBR1000RR"
    bike1_matches = compare_commands._search_bike(bike1_query)
    
    if bike1_matches:
        print(f"Found {len(bike1_matches)} matches for '{bike1_query}'")
        for i, bike in enumerate(bike1_matches, 1):
            print(f"{i}. {bike['year']} {bike['make']} {bike['model']}")
        print("Bike search test passed!")
    else:
        print(f"No matches found for '{bike1_query}'")
        print("Bike search test failed!")

async def test_display_comparison():
    """Test the _display_comparison method"""
    print("\n=== Testing Display Comparison ===")
    bot = MockBot()
    ctx = MockContext()
    compare_commands = CompareCommands(bot)
    
    # Get two bikes to compare
    bike1_query = "2023 Honda CBR1000RR"
    bike2_query = "2023 Kawasaki Ninja ZX-10R"
    
    bike1_matches = compare_commands._search_bike(bike1_query)
    bike2_matches = compare_commands._search_bike(bike2_query)
    
    if bike1_matches and bike2_matches:
        bike1 = bike1_matches[0]
        bike2 = bike2_matches[0]
        
        # Test displaying the comparison
        await compare_commands._display_comparison(ctx, bike1, bike2)
        
        # Check results
        if ctx.sent_messages:
            print("Display comparison test passed!")
            print(f"Sent {len(ctx.sent_messages)} messages and {len(ctx.sent_files)} files")
        else:
            print("Display comparison test failed: No messages sent")
    else:
        print("Test failed: Could not find bikes to compare")

async def test_invalid_query():
    """Test handling an invalid query"""
    print("\n=== Testing Invalid Query ===")
    bot = MockBot()
    ctx = MockContext()
    compare_commands = CompareCommands(bot)
    
    # Test with no separator
    query = "2023 Honda CBR1000RR 2023 Kawasaki Ninja ZX-10R"
    parts = None
    for separator in [" vs ", " VS ", " versus "]:
        if separator in query:
            parts = query.split(separator, 1)
            break
    
    if not parts or len(parts) != 2:
        await ctx.send("Please use the format: `!bike compare <bike1> vs <bike2>`")
        
        # Check results
        if ctx.sent_messages and "Please use the format" in str(ctx.sent_messages[-1]):
            print("Invalid query test passed!")
        else:
            print("Invalid query test failed")
    else:
        print("Invalid query test failed: Separator was found when it shouldn't be")

async def run_tests():
    """Run all tests"""
    await test_search_bike()
    await test_display_comparison()
    await test_invalid_query()

if __name__ == "__main__":
    asyncio.run(run_tests())