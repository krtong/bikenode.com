import discord
from discord.ext import commands
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the bot token from environment variables
TOKEN = os.getenv('DISCORD_BOT_TOKEN')

# Create bot with all intents
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'Bot connected as {bot.user.name}')
    await bot.change_presence(activity=discord.Game('BikeNode Bot'))

@bot.command(name='hello')
async def hello(ctx):
    await ctx.send('Hello! I am the BikeNode Discord Bot.')

# Run the bot
if __name__ == "__main__":
    if not TOKEN:
        print("Error: DISCORD_BOT_TOKEN not set in environment variables")
        print("Make sure you have a .env file with your token")
        exit(1)
    bot.run(TOKEN)
