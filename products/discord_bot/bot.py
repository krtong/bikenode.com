import discord
from discord.ext import commands
import logging
from commands.bike import BikeCommands
from commands.server_management import ServerManagementCommands
from commands.story import StoryCommands
from events.message import MessageEvents
from utils.role_manager import RoleManager
from api.bikenode_client import BikeNodeAPI
from api.webhook_handler import WebhookHandler

# Set up logging
logging.basicConfig(level=logging.INFO, filename='bot.log', format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('BikeRoleBot')

# Load configuration from config.yaml
with open('config/config.yaml', 'r') as config_file:
    config = yaml.safe_load(config_file)

# Initialize the bot with the prefix from config
bot = commands.Bot(command_prefix=config['commands']['prefix'], intents=discord.Intents.all())

@bot.event
async def on_ready():
    # Log when the bot is ready and set its activity
    logger.info(f'Bot connected as {bot.user.name}')
    await bot.change_presence(activity=discord.Game(config['bot']['activity_message']))

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
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        logger.error("DISCORD_BOT_TOKEN not set in environment variables")
        raise ValueError("Please set the DISCORD_BOT_TOKEN environment variable")
    bot.run(token)
