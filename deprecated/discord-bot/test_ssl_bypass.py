#!/usr/bin/env python3

import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
import ssl
import aiohttp

# Load environment variables
load_dotenv()

# Create a custom SSL context that's more permissive (for testing only)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Create bot instance with default settings (we'll modify the connector in the run function)
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Bot connected successfully!")
    print(f"🤖 Bot name: {bot.user.name}")
    print(f"🆔 Bot ID: {bot.user.id}")
    print(f"🌍 Connected to {len(bot.guilds)} servers:")
    for guild in bot.guilds:
        print(f"  - {guild.name} (ID: {guild.id}, Members: {guild.member_count})")

@bot.command(name="test")
async def test_command(ctx):
    """Test command to verify bot is working"""
    await ctx.send("🚴‍♂️ BikeNode bot is working! Ready for bicycle integration testing.")

if __name__ == "__main__":
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        print("❌ No DISCORD_BOT_TOKEN found in .env file")
        exit(1)
    
    print(f"🚀 Starting bot test...")
    try:
        bot.run(token)
    except Exception as e:
        print(f"❌ Failed to start bot: {e}")