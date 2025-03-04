# This file contains commands for bike-related operations (e.g., searching and adding bikes).
# Update this file to modify or add bike-related commands.
# Do not create new files for bike commands; update this one or add new functions here.

import discord
from discord.ext import commands
import json
from pathlib import Path
import logging

logger = logging.getLogger('BikeRoleBot')

class BikeCommands(commands.Cog):
    """Commands for bike information and management"""
    def __init__(self, bot):
        self.bot = bot
        self.bike_data = self._load_bike_data()

    def _load_bike_data(self):
        # Load bike data from JSON files in 'data/bikedata/'
        # Update this function if the data loading logic changes.
        bike_data = {}
        try:
            data_dir = Path(__file__).parent.parent / 'data' / 'bikedata'
            for file in data_dir.glob('*.json'):
                with open(file, 'r') as f:
                    data = json.load(f)
                    bike_data.update(data)
            logger.info(f"Loaded {len(bike_data)} bikes")
        except Exception as e:
            logger.error(f"Error loading bike data: {e}")
        return bike_data

    @commands.command(name="bike")
    async def bike_info(self, ctx, *, bike_name: str):
        """Get information about a specific bike"""
        bike_name_lower = bike_name.lower()
        for bike_id, bike_data in self.bike_data.items():
            if bike_name_lower in bike_data['name'].lower():
                embed = discord.Embed(
                    title=bike_data['name'],
                    description=bike_data.get('description', 'No description available'),
                    color=discord.Color.blue()
                )
                embed.add_field(name="Type", value=bike_data.get('type', 'Unknown'), inline=True)
                embed.add_field(name="Brand", value=bike_data.get('brand', 'Unknown'), inline=True)
                await ctx.send(embed=embed)
                return
        await ctx.send(f"No bike found matching '{bike_name}'")

async def setup(bot):
    # Register this cog with the bot
    await bot.add_cog(BikeCommands(bot))
