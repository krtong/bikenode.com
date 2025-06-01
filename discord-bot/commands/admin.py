# This file contains admin commands for managing BikeRole settings.
# Update this file to modify or add admin commands.
# Do not create new files for admin commands; update this one or add new functions here.

import discord
from discord.ext import commands
import logging
from utils.helpers import create_embed, is_admin

logger = logging.getLogger('BikeRoleBot')

class AdminCommands(commands.Cog):
    """Commands for server administrators to manage BikeRole settings"""
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name='debug')
    @commands.has_permissions(administrator=True)
    async def debug_info(self, ctx):
        """Display debug information for troubleshooting"""
        embed = create_embed(
            title="BikeRole Debug Info",
            description="Technical information about the bot instance"
        )
        
        # Add bot info
        embed.add_field(
            name="Bot Version", 
            value=self.bot.config['bot']['version'],
            inline=True
        )
        
        # Add guild info
        embed.add_field(
            name="Guild Info", 
            value=f"ID: {ctx.guild.id}\nMembers: {ctx.guild.member_count}",
            inline=True
        )
        
        # Add API connection status
        api_status = "Connected" if hasattr(self.bot, 'bikenode_api') else "Not Connected"
        embed.add_field(
            name="API Connection", 
            value=api_status,
            inline=True
        )
        
        # Add role manager status
        role_mgr_status = "Initialized" if hasattr(self.bot, 'role_manager') else "Not Initialized"
        embed.add_field(
            name="Role Manager", 
            value=role_mgr_status,
            inline=True
        )
        
        # Add database status
        from utils.db_manager import BikeDatabase
        db = BikeDatabase()
        db_status = "Connected" if db.connect() else "Connection Failed"
        if db.connection:
            db.close()
        
        embed.add_field(
            name="Database", 
            value=db_status,
            inline=True
        )
        
        await ctx.send(embed=embed)
    
    @commands.command(name='stats')
    @commands.has_permissions(administrator=True)
    async def bot_stats(self, ctx):
        """Display bot statistics"""
        embed = create_embed(
            title="BikeRole Statistics",
            description="Usage statistics for BikeRole bot"
        )
        
        # Get stats from all guilds
        total_guilds = len(self.bot.guilds)
        total_members = sum(g.member_count for g in self.bot.guilds)
        
        embed.add_field(
            name="Servers", 
            value=str(total_guilds),
            inline=True
        )
        
        embed.add_field(
            name="Total Members", 
            value=str(total_members),
            inline=True
        )
        
        # Get uptime if available
        if hasattr(self.bot, 'start_time'):
            import datetime
            uptime = datetime.datetime.utcnow() - self.bot.start_time
            days, remainder = divmod(int(uptime.total_seconds()), 86400)
            hours, remainder = divmod(remainder, 3600)
            minutes, seconds = divmod(remainder, 60)
            
            embed.add_field(
                name="Uptime", 
                value=f"{days}d {hours}h {minutes}m {seconds}s",
                inline=True
            )
        
        await ctx.send(embed=embed)

async def setup(bot):
    # Register this cog with the bot
    await bot.add_cog(AdminCommands(bot))
