# This file contains admin commands for managing BikeRole settings.
# Update this file to modify or add admin commands.
# Do not create new files for admin commands; update this one or add new functions here.

import discord
from discord.ext import commands
import logging

logger = logging.getLogger('BikeRoleBot')

class BikeServerCommands(commands.Cog):
    """Commands for server administrators to manage BikeRole settings"""
    def __init__(self, bot):
        self.bot = bot
        self.settings = {}

    @commands.command(name='bikerole-setup')
    @commands.has_permissions(administrator=True)
    async def setup_bikerole(self, ctx):
        """Initial setup for BikeRole in your server"""
        server_id = str(ctx.guild.id)
        if server_id not in self.settings:
            self.settings[server_id] = {
                'role_color': discord.Color.blue().value,
                'auto_approve': True,
                'max_bikes_per_user': 5
            }
            embed = discord.Embed(
                title="BikeRole Setup",
                description="BikeRole has been set up for your server!",
                color=discord.Color.green()
            )
            await ctx.send(embed=embed)
            logger.info(f"Setup completed for server {server_id}")

async def setup(bot):
    # Register this cog with the bot
    await bot.add_cog(BikeServerCommands(bot))
