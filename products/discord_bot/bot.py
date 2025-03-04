import discord
from discord.ext import commands
import os
import yaml
import logging
from commands.bike import BikeCommands
from commands.server_management import ServerManagementCommands
from commands.story import StoryCommands
from events.message import MessageEvents
from utils.role_manager import RoleManager
from api.bikenode_client import BikeNodeAPI
from api.webhook_handler import WebhookHandler
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, filename='bot.log', format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('BikeRoleBot')

# Load configuration from config.yaml
with open('config/config.yaml', 'r') as config_file:
    config = yaml.safe_load(config_file)

# Get the bot token from environment variables
TOKEN = os.getenv('DISCORD_BOT_TOKEN')

# Initialize the bot with the prefix from config
bot = commands.Bot(command_prefix=config['commands']['prefix'], intents=discord.Intents.all())

@bot.event
async def on_ready():
    # Log when the bot is ready and set its activity
    logger.info(f'Bot connected as {bot.user.name}')
    await bot.change_presence(activity=discord.Game(config['bot']['activity_message']))

@bot.command(name='hello')
async def hello(ctx):
    await ctx.send('Hello! I am the BikeNode Discord Bot.')

async def setup_bot():
    # Initialize API client
    bot.bikenode_api = BikeNodeAPI(
        config['api']['base_url'],
        config['api']['api_key']
    )
    
    # Initialize role manager
    bot.role_manager = RoleManager(bot, bot.bikenode_api)
    
    # Load command and event cogs
    await bot.add_cog(BikeCommands(bot))
    await bot.add_cog(ServerManagementCommands(bot))
    await bot.add_cog(StoryCommands(bot))
    await bot.add_cog(MessageEvents(bot))
    
    # Start webhook handler if enabled
    if config['webhooks']['enabled']:
        bot.webhook_handler = WebhookHandler(
            bot, 
            bot.bikenode_api,
            config['webhooks']['port']
        )
        await bot.webhook_handler.start()
    
    logger.info("All cogs loaded successfully")

# Run the bot setup and start it
if __name__ == "__main__":
    bot.loop.run_until_complete(setup_bot())
    if not TOKEN:
        logger.error("DISCORD_BOT_TOKEN not set in environment variables")
        raise ValueError("Please set the DISCORD_BOT_TOKEN environment variable")
    bot.run(TOKEN)
