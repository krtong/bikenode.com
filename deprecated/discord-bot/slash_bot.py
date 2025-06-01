#!/usr/bin/env python3

import discord
from discord.ext import commands
from discord import app_commands
import os
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create bot with minimal intents - slash commands don't need message content
intents = discord.Intents.default()
bot = commands.Bot(command_prefix='/', intents=intents)

@bot.event
async def on_ready():
    print(f"✅ BikeNode bot connected as {bot.user.name}")
    print(f"🌍 Bot is in {len(bot.guilds)} servers")
    print(f"🔗 API: http://localhost:8080")
    print(f"⚡ Slash commands: /test, /api_test, /bikes")
    
    # Sync slash commands
    try:
        synced = await bot.tree.sync()
        print(f"🔄 Synced {len(synced)} slash commands")
    except Exception as e:
        print(f"❌ Failed to sync commands: {e}")

@bot.tree.command(name="test", description="Test if the BikeNode bot is working")
async def test_slash(interaction: discord.Interaction):
    """Test basic bot functionality"""
    await interaction.response.send_message("🚴‍♂️ BikeNode bot is working via slash commands!")

@bot.tree.command(name="api_test", description="Test BikeNode API connectivity")
async def api_test_slash(interaction: discord.Interaction):
    """Test API connectivity"""
    await interaction.response.defer()  # API calls take time
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8080/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    await interaction.followup.send(f"✅ API Connected: {data['status']}")
                else:
                    await interaction.followup.send(f"❌ API Error: Status {response.status}")
    except Exception as e:
        await interaction.followup.send(f"❌ API Error: {str(e)}")

@bot.tree.command(name="bikes", description="Show your bike collection from BikeNode")
async def bikes_slash(interaction: discord.Interaction):
    """Test user bikes endpoint"""
    await interaction.response.defer()  # API calls take time
    
    try:
        async with aiohttp.ClientSession() as session:
            url = f"http://localhost:8080/api/discord/user/{interaction.user.id}/bikes"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    embed = discord.Embed(
                        title=f"🚴‍♂️ {interaction.user.display_name}'s Bike Collection",
                        description=data.get('message', 'No message'),
                        color=discord.Color.blue()
                    )
                    embed.add_field(
                        name="Collection Status",
                        value=f"Discord ID: {data.get('discord_id', 'Unknown')}\nBikes found: {len(data.get('bicycles', []))}"
                    )
                    embed.set_footer(text="BikeNode Integration Test")
                    await interaction.followup.send(embed=embed)
                else:
                    await interaction.followup.send(f"❌ API Error: Status {response.status}")
    except Exception as e:
        await interaction.followup.send(f"❌ Error: {str(e)}")

@bot.tree.command(name="profile", description="Create or manage your BikeNode profile")
async def profile_slash(interaction: discord.Interaction):
    """Create BikeNode profile with secure link"""
    await interaction.response.defer()
    
    # Generate a unique profile creation token
    import secrets
    import hashlib
    
    # Create unique token for this user
    token = secrets.token_urlsafe(32)
    
    # Send to API to store the token temporarily
    try:
        async with aiohttp.ClientSession() as session:
            profile_data = {
                "discord_id": str(interaction.user.id),
                "discord_username": interaction.user.display_name,
                "discord_avatar": str(interaction.user.avatar.url) if interaction.user.avatar else None,
                "guild_id": str(interaction.guild.id) if interaction.guild else None,
                "token": token
            }
            
            async with session.post("http://localhost:8080/api/auth/discord/link", json=profile_data) as response:
                if response.status in [200, 201]:
                    signup_url = f"http://localhost:8080/signup?token={token}"
                    
                    embed = discord.Embed(
                        title="🚴‍♂️ Create Your BikeNode Profile",
                        description="Click the link below to create your BikeNode account and start building your bike collection!",
                        color=discord.Color.blue()
                    )
                    embed.add_field(
                        name="🔗 Your Personal Signup Link",
                        value=f"[**Create BikeNode Profile**]({signup_url})",
                        inline=False
                    )
                    embed.add_field(
                        name="⏰ Link Expires",
                        value="15 minutes",
                        inline=True
                    )
                    embed.add_field(
                        name="🎯 What You Can Do",
                        value="• Add your motorcycles & bicycles\n• Share your collection\n• Get automatic server roles\n• Track your bike journey",
                        inline=False
                    )
                    embed.set_footer(text="BikeNode - Connect Your Motorcycle Journey")
                    
                    await interaction.followup.send(embed=embed, ephemeral=True)
                else:
                    await interaction.followup.send("❌ Failed to generate profile link. Please try again.", ephemeral=True)
    except Exception as e:
        await interaction.followup.send(f"❌ Error creating profile link: {str(e)}", ephemeral=True)

@bot.tree.command(name="search", description="Search the BikeNode bicycle database")
@app_commands.describe(query="What bike are you looking for?")
async def search_slash(interaction: discord.Interaction, query: str):
    """Search bicycle database"""
    await interaction.response.defer()
    
    try:
        async with aiohttp.ClientSession() as session:
            url = f"http://localhost:8080/api/bicycles/search?q={query}"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    embed = discord.Embed(
                        title=f"🔍 Search Results for '{query}'",
                        description=data.get('message', 'No results'),
                        color=discord.Color.green()
                    )
                    embed.add_field(
                        name="Search Info",
                        value=f"Query: {data.get('query', 'Unknown')}\nTotal results: {data.get('total', 0)}"
                    )
                    await interaction.followup.send(embed=embed)
                else:
                    await interaction.followup.send(f"❌ Search failed: Status {response.status}")
    except Exception as e:
        await interaction.followup.send(f"❌ Search error: {str(e)}")

if __name__ == "__main__":
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        print("❌ No DISCORD_BOT_TOKEN found")
        exit(1)
    
    print("🚴‍♂️ Starting BikeNode Discord Bot with Slash Commands...")
    print("⚡ No privileged intents required!")
    
    try:
        bot.run(token)
    except Exception as e:
        print(f"❌ Bot failed: {e}")