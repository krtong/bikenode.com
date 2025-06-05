import discord
from discord import app_commands
from discord.ext import commands
import logging
import aiohttp
from typing import Optional

logger = logging.getLogger('BikeRoleBot')

class SlashCommands(commands.Cog):
    """Slash commands for BikeNode bot"""
    
    def __init__(self, bot):
        self.bot = bot
        
    @app_commands.command(name="test", description="Test if the BikeNode bot is working")
    async def test(self, interaction: discord.Interaction):
        """Test command to verify bot is working"""
        embed = discord.Embed(
            title="✅ Bot Status",
            description="BikeNode bot is working correctly!",
            color=discord.Color.green()
        )
        embed.add_field(name="Bot Name", value=self.bot.user.name, inline=True)
        embed.add_field(name="Bot ID", value=self.bot.user.id, inline=True)
        embed.add_field(name="Latency", value=f"{round(self.bot.latency * 1000)}ms", inline=True)
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @app_commands.command(name="api_test", description="Test BikeNode API connectivity")
    async def api_test(self, interaction: discord.Interaction):
        """Test API connectivity"""
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Test API connection
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.bot.config['api']['base_url']}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        embed = discord.Embed(
                            title="✅ API Connection Successful",
                            description=f"Connected to BikeNode API",
                            color=discord.Color.green()
                        )
                        embed.add_field(name="Status", value="Online", inline=True)
                        embed.add_field(name="Endpoint", value=self.bot.config['api']['base_url'], inline=True)
                        await interaction.followup.send(embed=embed, ephemeral=True)
                    else:
                        await interaction.followup.send(
                            f"❌ API returned status code: {response.status}", 
                            ephemeral=True
                        )
        except Exception as e:
            logger.error(f"API test failed: {e}")
            await interaction.followup.send(
                f"❌ Failed to connect to API: {str(e)}", 
                ephemeral=True
            )
    
    @app_commands.command(name="bikes", description="Show your bike collection from BikeNode")
    async def bikes(self, interaction: discord.Interaction):
        """Show user's bike collection"""
        await interaction.response.defer(ephemeral=True)
        
        # For now, return a placeholder message
        # In the future, this would fetch from the API using the user's Discord ID
        embed = discord.Embed(
            title="🏍️ Your Bike Collection",
            description="You haven't added any bikes yet!",
            color=discord.Color.blue()
        )
        embed.add_field(
            name="How to add bikes",
            value="Use `/search` to find bikes and add them to your collection",
            inline=False
        )
        await interaction.followup.send(embed=embed, ephemeral=True)
    
    @app_commands.command(name="profile", description="Create or manage your BikeNode profile")
    async def profile(self, interaction: discord.Interaction):
        """Create or manage user profile"""
        await interaction.response.defer(ephemeral=True)
        
        # Placeholder for profile management
        embed = discord.Embed(
            title="👤 BikeNode Profile",
            description=f"Profile for {interaction.user.mention}",
            color=discord.Color.blue()
        )
        embed.add_field(name="Discord ID", value=interaction.user.id, inline=True)
        embed.add_field(name="Username", value=interaction.user.name, inline=True)
        embed.add_field(name="Bikes", value="0", inline=True)
        embed.set_thumbnail(url=interaction.user.avatar.url if interaction.user.avatar else None)
        
        await interaction.followup.send(embed=embed, ephemeral=True)
    
    @app_commands.command(name="search", description="Search the BikeNode bicycle database")
    @app_commands.describe(query="Search for a bike by make, model, or year")
    async def search(self, interaction: discord.Interaction, query: str):
        """Search for bikes in the database"""
        await interaction.response.defer(ephemeral=True)
        
        # Search in the motorcycle data
        try:
            # Use the existing bike data manager
            results = []
            query_lower = query.lower()
            
            # Search through the loaded data
            if hasattr(self.bot, 'bike_data') and self.bot.bike_data is not None:
                for _, bike in self.bot.bike_data.iterrows():
                    if (query_lower in str(bike.get('Make', '')).lower() or 
                        query_lower in str(bike.get('Model', '')).lower() or
                        query_lower in str(bike.get('Year', ''))):
                        results.append(bike)
                        if len(results) >= 10:  # Limit results
                            break
            
            if results:
                embed = discord.Embed(
                    title=f"🔍 Search Results for '{query}'",
                    description=f"Found {len(results)} bikes",
                    color=discord.Color.green()
                )
                
                for bike in results[:5]:  # Show first 5
                    name = f"{bike.get('Year', 'Unknown')} {bike.get('Make', 'Unknown')} {bike.get('Model', 'Unknown')}"
                    value = f"Category: {bike.get('Category', 'Unknown')}"
                    embed.add_field(name=name, value=value, inline=False)
                
                if len(results) > 5:
                    embed.add_field(
                        name="More Results",
                        value=f"Showing 5 of {len(results)} results",
                        inline=False
                    )
                
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.followup.send(
                    f"No bikes found matching '{query}'", 
                    ephemeral=True
                )
                
        except Exception as e:
            logger.error(f"Search error: {e}")
            await interaction.followup.send(
                "❌ An error occurred while searching", 
                ephemeral=True
            )

async def setup(bot):
    await bot.add_cog(SlashCommands(bot))