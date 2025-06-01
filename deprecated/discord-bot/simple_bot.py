#!/usr/bin/env python3

import discord
from discord.ext import commands
import os
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create bot with minimal intents (no privileged intents required)
intents = discord.Intents.default()
# Note: Without message_content intent, bot may not see command content
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f"✅ BikeNode bot connected as {bot.user.name}")
    print(f"🌍 Bot is in {len(bot.guilds)} servers")
    print(f"🔗 API: http://localhost:8080")
    print(f"📱 Commands: !test, !api-test, !bikes")

@bot.command(name="test")
async def test_command(ctx):
    """Test basic bot functionality"""
    await ctx.send("🚴‍♂️ BikeNode bot is working!")

@bot.command(name="api-test")
async def api_test(ctx):
    """Test API connectivity"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8080/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    await ctx.send(f"✅ API Connected: {data['status']}")
                else:
                    await ctx.send(f"❌ API Error: Status {response.status}")
    except Exception as e:
        await ctx.send(f"❌ API Error: {str(e)}")

@bot.command(name="bikes")
async def bikes_command(ctx):
    """Test user bikes endpoint"""
    try:
        async with aiohttp.ClientSession() as session:
            url = f"http://localhost:8080/api/discord/user/{ctx.author.id}/bikes"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    embed = discord.Embed(
                        title=f"🚴‍♂️ {ctx.author.display_name}'s Bikes",
                        description=data.get('message', 'No message'),
                        color=discord.Color.blue()
                    )
                    embed.add_field(
                        name="Status",
                        value=f"Discord ID: {data.get('discord_id', 'Unknown')}\nBikes: {len(data.get('bicycles', []))}"
                    )
                    await ctx.send(embed=embed)
                else:
                    await ctx.send(f"❌ API Error: Status {response.status}")
    except Exception as e:
        await ctx.send(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        print("❌ No DISCORD_BOT_TOKEN found")
        exit(1)
    
    print("🚴‍♂️ Starting BikeNode Discord Bot...")
    print("🔧 Using minimal intents (no privileged access needed)")
    
    try:
        bot.run(token)
    except Exception as e:
        print(f"❌ Bot failed: {e}")