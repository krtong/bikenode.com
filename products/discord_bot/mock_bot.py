#!/usr/bin/env python3
"""
Mock implementation of the Discord bot for testing purposes.
This doesn't require a valid Discord token.
"""

import logging
import yaml
import os
from dotenv import load_dotenv
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('BikeRoleBot')

# Load environment variables
load_dotenv()

# Load configuration from config.yaml
with open('config/config.yaml', 'r') as config_file:
    config = yaml.safe_load(config_file)

class MockBot:
    """Mock implementation of the Discord bot for testing"""
    
    def __init__(self):
        self.name = "BikeNode Bot"
        self.prefix = config['commands']['prefix']
        logger.info(f"Initializing {self.name} with prefix '{self.prefix}'")
        
    async def start(self):
        """Start the mock bot"""
        logger.info(f"Bot connected as {self.name}")
        logger.info(f"Activity: {config['bot']['activity_message']}")
        
        # Print available commands
        logger.info("Available commands:")
        logger.info(f"  {self.prefix}bike - Get information about a specific bike")
        logger.info(f"  {self.prefix}link - Link your Discord account to BikeNode")
        logger.info(f"  {self.prefix}addbike - Add a motorcycle to your BikeNode profile")
        logger.info(f"  {self.prefix}removebike - Remove a motorcycle from your BikeNode profile")
        logger.info(f"  {self.prefix}findmoto - Search for a motorcycle using interactive menus")
        logger.info(f"  {self.prefix}stats - Display motorcycle statistics [brands|categories|years]")
        logger.info(f"  {self.prefix}compare - Compare two motorcycles side by side")
        
        # Keep the bot running
        while True:
            logger.info("Bot is running... (Press Ctrl+C to stop)")
            await asyncio.sleep(10)

async def run_bot():
    """Run the mock bot"""
    bot = MockBot()
    await bot.start()

if __name__ == "__main__":
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")