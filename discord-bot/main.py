#!/usr/bin/env python3
"""
Main entry point for the Bikenode Discord Bot
"""

import sys
import os

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from bot.launch import main

if __name__ == "__main__":
    main()