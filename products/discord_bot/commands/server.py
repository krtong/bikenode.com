import discord
from discord.ext import commands
import logging
from pathlib import Path
import json
import asyncio
from utils.helpers import load_server_settings, save_server_settings

logger = logging.getLogger('BikeRoleBot')

class ServerCommands(commands.Cog):
    """Commands for server configuration and role management"""
    
    def __init__(self, bot):
        self.bot = bot
        self.data_dir = Path(__file__).parent.parent / 'data'
        self.data_dir.mkdir(exist_ok=True)
    
    @commands.command(name="setrolecreation")
    @commands.has_permissions(administrator=True)
    async def set_role_creation(self, ctx, mode: str = None):
        """Set how bike roles are created (brand, type, or model)
        
        Usage: !setrolecreation brand|type|model
        - brand: Creates roles like "Bike-Honda"
        - type: Creates roles like "Bike-Cruiser"
        - model: Creates roles like "Bike-2020-Honda-CBR1000RR-SP"
        """
        if not mode or mode.lower() not in ['brand', 'type', 'model']:
            await ctx.send("Please specify a valid role mode: `brand`, `type`, or `model`")
            return
        
        server_id = str(ctx.guild.id)
        settings = load_server_settings(server_id)
        
        # Update role mode
        settings['role_mode'] = mode.lower()
        save_server_settings(server_id, settings)
        
        await ctx.send(f"✅ Bike roles will now be created based on {mode}.")
        
        # Ask if they want to update roles now
        await ctx.send("Do you want to update all member roles now? This may take some time. (yes/no)")
        
        def check(m):
            return m.author == ctx.author and m.channel == ctx.channel and m.content.lower() in ['yes', 'no', 'y', 'n']
        
        try:
            msg = await self.bot.wait_for('message', check=check, timeout=30.0)
            if msg.content.lower() in ['yes', 'y']:
                status_msg = await ctx.send("Updating roles for all members... This may take a while.")
                
                if hasattr(self.bot, 'role_manager'):
                    await self.bot.role_manager.update_roles_for_guild(ctx.guild)