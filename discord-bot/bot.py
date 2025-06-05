import discord
from discord.ext import commands
import logging
import yaml
import os
import ssl
import certifi
import platform
from dotenv import load_dotenv
from commands.bike import BikeCommands
from commands.server_management import ServerManagementCommands
from commands.story import StoryCommands
from commands.stats import StatsCommands
from commands.compare import CompareCommands
# from commands.claude import ClaudeCommands
# from commands.claude_chat import ClaudeChatCommands
# from commands.claude_bridge import ClaudeBridge
# from commands.claude_simple import ClaudeSimple
from commands.claude_fixed import ClaudeFixed
from commands.slash_commands import SlashCommands
from events.message import MessageEvents
from utils.role_manager import RoleManager
from api.bikenode_client import BikeNodeAPI
from api.webhook_handler import WebhookHandler

# Set up logging
logging.basicConfig(level=logging.INFO, filename='bot.log', format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('BikeRoleBot')

# Fix SSL certificate issues (especially on macOS)
def setup_ssl():
    if platform.system() == 'Darwin':  # macOS
        logger.info("Detected macOS, setting up SSL certificates")
        ssl_cert_file = certifi.where()
        os.environ['SSL_CERT_FILE'] = ssl_cert_file
        os.environ['REQUESTS_CA_BUNDLE'] = ssl_cert_file
        
        # Create a default SSL context - this will apply globally
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        ssl._create_default_https_context = lambda: ssl_context
        
        logger.info(f"SSL certificate path: {ssl_cert_file}")
        return ssl_context
    return None

# Call SSL setup - this sets up SSL globally
setup_ssl()

# Load environment variables
load_dotenv()

# Load configuration from config.yaml
with open('config/config.yaml', 'r') as config_file:
    config = yaml.safe_load(config_file)

# Initialize the bot with the prefix from config
intents = discord.Intents.all()
# Get application ID from environment
app_id = os.getenv('APP_ID') or os.getenv('DISCORD_APPLICATION_ID')
if app_id:
    bot = commands.Bot(
        command_prefix=config['commands']['prefix'], 
        intents=intents,
        application_id=int(app_id)
    )
else:
    bot = commands.Bot(command_prefix=config['commands']['prefix'], intents=intents)
bot.config = config  # Make config accessible to all cogs

@bot.event
async def on_ready():
    # Log when the bot is ready and set its activity
    logger.info(f'Bot connected as {bot.user.name} ({bot.user.id})')
    await bot.change_presence(activity=discord.Game(config['bot']['activity_message']))
    
    # Sync slash commands
    try:
        synced = await bot.tree.sync()
        logger.info(f"Synced {len(synced)} slash commands")
        # Log command details
        for cmd in synced:
            logger.info(f"Registered command: /{cmd.name} - {cmd.description}")
    except Exception as e:
        logger.error(f"Failed to sync commands: {e}")

async def setup_bot():
    # Initialize API client - don't pass SSL context, it's set globally now
    bot.bikenode_api = BikeNodeAPI(
        config['api']['base_url'],
        config['api']['api_key']
    )
    
    # Load bike data for slash commands
    try:
        import pandas as pd
        from pathlib import Path
        data_path = Path('data/bikedata/motorcycles.csv')
        if data_path.exists():
            bot.bike_data = pd.read_csv(data_path, on_bad_lines='skip')
            logger.info(f"Loaded {len(bot.bike_data)} bikes for slash commands")
        else:
            bot.bike_data = None
            logger.warning("Motorcycle data file not found")
    except Exception as e:
        bot.bike_data = None
        logger.error(f"Error loading bike data: {e}")
    
    # Initialize role manager
    bot.role_manager = RoleManager(bot, bot.bikenode_api)
    
    # Load command and event cogs
    await bot.add_cog(BikeCommands(bot))
    await bot.add_cog(ServerManagementCommands(bot))
    await bot.add_cog(StoryCommands(bot))
    await bot.add_cog(StatsCommands(bot))
    await bot.add_cog(CompareCommands(bot))
    # await bot.add_cog(ClaudeCommands(bot))
    # await bot.add_cog(ClaudeChatCommands(bot))
    # await bot.add_cog(ClaudeBridge(bot))
    # await bot.add_cog(ClaudeSimple(bot))
    await bot.add_cog(ClaudeFixed(bot))
    await bot.add_cog(SlashCommands(bot))
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

# Function to run the bot (called from main.py)
async def run_bot():
    await setup_bot()
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        logger.error("DISCORD_BOT_TOKEN not set in environment variables")
        raise ValueError("Please set the DISCORD_BOT_TOKEN environment variable")
    
    # Connect to Discord - no need to pass the ssl context, it's set globally
    await bot.start(token, reconnect=True)

# Run the bot setup and start it
if __name__ == "__main__":
    import asyncio
    asyncio.run(run_bot())
