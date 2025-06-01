#!/usr/bin/env python3

import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
import ssl
import certifi

# Load environment variables
load_dotenv()

# Fix SSL on macOS
import platform
if platform.system() == 'Darwin':  # macOS
    ssl_cert_file = certifi.where()
    os.environ['SSL_CERT_FILE'] = ssl_cert_file
    os.environ['REQUESTS_CA_BUNDLE'] = ssl_cert_file
    
    # Create SSL context
    ssl_context = ssl.create_default_context(cafile=ssl_cert_file)
    ssl._create_default_https_context = lambda: ssl_context

# Create bot instance
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Bot connected as {bot.user.name} (ID: {bot.user.id})")
    print(f"🌍 Bot is in {len(bot.guilds)} servers")
    for guild in bot.guilds:
        print(f"  - {guild.name} (ID: {guild.id})")
    
    # Test if bicycle commands are available
    print(f"📋 Commands loaded: {len(bot.commands)}")
    for command in bot.commands:
        print(f"  - {command.name}: {command.help or 'No description'}")

@bot.event
async def on_command_error(ctx, error):
    print(f"❌ Command error: {error}")

# Simple test command
@bot.command(name="test")
async def test_command(ctx):
    """Test command to verify bot is working"""
    await ctx.send("🚴‍♂️ BikeNode bot is working! Use `!bike-info trek` to search bicycles.")

if __name__ == "__main__":
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        print("❌ No DISCORD_BOT_TOKEN found in .env file")
        exit(1)
    
    print(f"🤖 Starting bot with token: {token[:20]}...")
    try:
        bot.run(token)
    except Exception as e:
        print(f"❌ Failed to start bot: {e}")