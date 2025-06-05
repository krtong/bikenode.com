import discord
from discord.ext import commands
import logging
import yaml
import os
import ssl
import certifi
import platform
from dotenv import load_dotenv
from commands.claude_fixed import ClaudeFixed

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
bot = commands.Bot(command_prefix=config['commands']['prefix'], intents=intents)
bot.config = config  # Make config accessible to all cogs

@bot.event
async def on_ready():
    # Log when the bot is ready and set its activity
    logger.info(f'Bot connected as {bot.user.name} ({bot.user.id})')
    print(f'✅ Bot connected as {bot.user.name}')
    await bot.change_presence(activity=discord.Game(config['bot']['activity_message']))

async def setup_bot():
    # Load only the working Claude command
    await bot.add_cog(ClaudeFixed(bot))
    logger.info("Claude commands loaded successfully")
    print("✅ Claude commands loaded")

# Function to run the bot
async def run_bot():
    await setup_bot()
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        logger.error("DISCORD_BOT_TOKEN not set in environment variables")
        raise ValueError("Please set the DISCORD_BOT_TOKEN environment variable")
    
    print("🔗 Connecting to Discord...")
    # Connect to Discord
    await bot.start(token, reconnect=True)

# Run the bot setup and start it
if __name__ == "__main__":
    import asyncio
    asyncio.run(run_bot())