#!/usr/bin/env python3

import discord
from discord.ext import commands
import os
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create bot instance with minimal setup
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Bot connected as {bot.user.name}")
    print(f"🌍 Bot is in {len(bot.guilds)} servers")
    
    # Test API connection
    print("\n🔗 Testing BikeNode API connection...")
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get("http://localhost:8080/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ API connection successful: {data['status']}")
                else:
                    print(f"❌ API connection failed: {response.status}")
        except Exception as e:
            print(f"❌ API connection error: {e}")

@bot.command(name="test")
async def test_command(ctx):
    """Test command to verify bot is working"""
    await ctx.send("🚴‍♂️ BikeNode bot is working! Testing API integration...")
    
    # Test API call
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"http://localhost:8080/api/discord/user/{ctx.author.id}") as response:
                if response.status == 200:
                    data = await response.json()
                    await ctx.send(f"✅ API Test: {data['message']}")
                else:
                    await ctx.send(f"❌ API Error: Status {response.status}")
        except Exception as e:
            await ctx.send(f"❌ API Error: {e}")

@bot.command(name="my-bikes-test")
async def test_bikes_command(ctx):
    """Test the bikes API endpoint"""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"http://localhost:8080/api/discord/user/{ctx.author.id}/bikes") as response:
                if response.status == 200:
                    data = await response.json()
                    embed = discord.Embed(
                        title=f"🚴‍♂️ {ctx.author.display_name}'s Bike Collection (Test)",
                        description=data['message'],
                        color=discord.Color.blue()
                    )
                    embed.add_field(
                        name="API Response", 
                        value=f"Discord ID: {data['discord_id']}\nBikes found: {len(data['bicycles'])}", 
                        inline=False
                    )
                    await ctx.send(embed=embed)
                else:
                    await ctx.send(f"❌ API Error: Status {response.status}")
        except Exception as e:
            await ctx.send(f"❌ API Error: {e}")

if __name__ == "__main__":
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        print("❌ No DISCORD_BOT_TOKEN found in .env file")
        exit(1)
    
    print(f"🤖 Starting BikeNode bot integration test...")
    print(f"🔗 Backend server: http://localhost:8080")
    print(f"⚠️  Make sure the Go backend is running!")
    print(f"📱 Test commands: !test, !my-bikes-test\n")
    
    try:
        bot.run(token)
    except Exception as e:
        print(f"❌ Failed to start bot: {e}")