import discord
from discord.ext import commands
import logging
import asyncio
from pathlib import Path
import json

logger = logging.getLogger('BikeRoleBot')

class ServerManagementCommands(commands.Cog):
    """Commands for server administrators to manage BikeRole settings"""
    def __init__(self, bot):
        self.bot = bot
        self.settings = {}
        self.data_dir = Path(__file__).parent.parent / 'data'
        self.data_dir.mkdir(exist_ok=True)
        self.settings_file = self.data_dir / 'settings.json'
        self._load_settings()

    def _load_settings(self):
        """Load settings from JSON file"""
        if self.settings_file.exists():
            try:
                with open(self.settings_file, 'r') as f:
                    self.settings = json.load(f)
            except Exception as e:
                logger.error(f"Error loading settings: {e}")
                self.settings = {}

    def _save_settings(self):
        """Save settings to JSON file"""
        try:
            with open(self.settings_file, 'w') as f:
                json.dump(self.settings, f)
        except Exception as e:
            logger.error(f"Error saving settings: {e}")

    @commands.command(name='bikerole-setup')
    @commands.has_permissions(administrator=True)
    async def setup_bikerole(self, ctx):
        """Initial setup for BikeRole in your server"""
        server_id = str(ctx.guild.id)
        if server_id not in self.settings:
            self.settings[server_id] = {
                'role_color': discord.Color.blue().value,
                'auto_approve': True,
                'max_bikes_per_user': 5,
                'role_mode': 'brand'  # Set default role mode to 'brand'
            }
            self._save_settings()
            
            embed = discord.Embed(
                title="BikeRole Setup",
                description="BikeRole has been set up for your server with the following defaults:\n"
                           "• Role Creation Mode: Brand-based\n"
                           "• Role Color: Blue\n"
                           "• Auto-approve: Enabled\n"
                           "• Max Bikes per User: 5",
                color=discord.Color.green()
            )
            await ctx.send(embed=embed)
            logger.info(f"Setup completed for server {server_id}")
        else:
            await ctx.send("BikeRole is already set up for this server. Use `!bikerole-settings` to view or change settings.")

    @commands.command(name='setrolecreation')
    @commands.has_permissions(administrator=True)
    async def set_role_creation(self, ctx, mode: str = None):
        """Set how motorcycle roles are created in your server
        
        Usage: !setrolecreation [mode]
        Available modes:
        - brand: Create roles based on motorcycle brand (e.g., Bike-Honda)
        - category: Create roles based on motorcycle category (e.g., Bike-Sportbike)
        - none: Disable automatic role creation
        """
        valid_modes = ['brand', 'category', 'none']
        
        if not mode or mode.lower() not in valid_modes:
            await ctx.send(f"Please specify a valid role creation mode: {', '.join(valid_modes)}")
            return
        
        server_id = str(ctx.guild.id)
        if server_id not in self.settings:
            await ctx.send("Please run `!bikerole-setup` first to initialize settings for this server.")
            return
        
        # Update settings
        mode = mode.lower()
        self.settings[server_id]['role_mode'] = mode
        self._save_settings()
        
        if mode == 'none':
            await ctx.send("✅ Automatic role creation has been disabled.")
        else:
            await ctx.send(f"✅ Roles will now be created based on motorcycle {mode}.")
            
            # Offer to update existing members
            await ctx.send("Would you like to update roles for all existing members now? (yes/no)")
            
            def check(m):
                return m.author == ctx.author and m.channel == ctx.channel and m.content.lower() in ['yes', 'no', 'y', 'n']
            
            try:
                msg = await self.bot.wait_for('message', check=check, timeout=30.0)
                if msg.content.lower() in ['yes', 'y']:
                    await ctx.send("⏳ Updating roles for all members. This may take a while...")
                    
                    # Get the role manager
                    if hasattr(self.bot, 'role_manager'):
                        await self.bot.role_manager.update_roles_for_guild(ctx.guild)
                        await ctx.send("✅ Roles have been updated for all members.")
                    else:
                        await ctx.send("⚠️ Role manager not initialized. Please contact the bot administrator.")
            except asyncio.TimeoutError:
                await ctx.send("Role update cancelled.")

    @commands.command(name='bikerole-settings')
    @commands.has_permissions(administrator=True)
    async def show_settings(self, ctx):
        """Show current BikeRole settings for this server"""
        server_id = str(ctx.guild.id)
        if server_id not in self.settings:
            await ctx.send("BikeRole is not set up for this server yet. Use `!bikerole-setup` to get started.")
            return
        
        server_settings = self.settings[server_id]
        
        embed = discord.Embed(
            title="BikeRole Server Settings",
            description="Current configuration for this server:",
            color=discord.Color(server_settings.get('role_color', discord.Color.blue().value))
        )
        
        # Add settings fields
        embed.add_field(
            name="Role Creation Mode", 
            value=server_settings.get('role_mode', 'brand').capitalize(),
            inline=True
        )
        embed.add_field(
            name="Auto-Approve Members", 
            value="Enabled" if server_settings.get('auto_approve', True) else "Disabled",
            inline=True
        )
        embed.add_field(
            name="Max Bikes Per User", 
            value=server_settings.get('max_bikes_per_user', 5),
            inline=True
        )
        
        # Add story channel if set
        if 'story_channel_id' in server_settings:
            try:
                channel = ctx.guild.get_channel(int(server_settings['story_channel_id']))
                if channel:
                    embed.add_field(name="Story Channel", value=channel.mention, inline=True)
            except:
                pass
        
        await ctx.send(embed=embed)

async def setup(bot):
    # Register this cog with the bot
    await bot.add_cog(ServerManagementCommands(bot))
