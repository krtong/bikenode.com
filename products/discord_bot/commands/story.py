import discord
from discord.ext import commands
import logging
import asyncio
from datetime import datetime
from pathlib import Path
import json

logger = logging.getLogger('BikeRoleBot')

class StoryCommands(commands.Cog):
    """Commands for managing and sharing motorcycle stories"""
    
    def __init__(self, bot):
        self.bot = bot
        self.api = getattr(bot, 'api', None)
        self.data_dir = Path(__file__).parent.parent / 'data'
        self.data_dir.mkdir(exist_ok=True)
        self.stories_file = self.data_dir / 'stories.json'
        self.stories = self._load_stories()
    
    def _load_stories(self):
        """Load stories mapping from JSON file"""
        if self.stories_file.exists():
            try:
                with open(self.stories_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.exception("Error loading stories mapping")
                # Return an empty dictionary to avoid crashing
                return {}
        return {}
    
    def _save_stories(self):
        """Save stories mapping to JSON file"""
        try:
            with open(self.stories_file, 'w') as f:
                json.dump(self.stories, f)
        except Exception as e:
            logger.error(f"Error saving stories mapping: {e}")
    
    @commands.command(name="recent")
    async def recent_story(self, ctx):
        """Share your most recent BikeNode story in the current channel"""
        if not self.api:
            await ctx.send("BikeNode API integration is not configured.")
            return
        
        try:
            # Check if account is linked
            user_id = await self.api.get_user_id(str(ctx.author.id))
            if not user_id:
                await ctx.send("Your Discord account is not linked to BikeNode! Use `!link` to link your account first.")
                return
            
            # Get user's most recent story
            stories = await self.api.get_user_stories(user_id, limit=1)
            if not stories:
                await ctx.send("You don't have any recent stories on BikeNode.")
                return
            
            recent_story = stories[0]
            
            # Check if this server is allowed
            allowed_servers = await self.api.get_allowed_servers(user_id)
            if str(ctx.guild.id) not in allowed_servers:
                await ctx.send("You haven't allowed sharing your BikeNode profile with this server. You can change this in your BikeNode settings.")
                return
            
            # Create an embed with the story content
            embed = discord.Embed(
                title=f"Motorcycle Story by {ctx.author.display_name}",
                description=recent_story.get('content', 'No content'),
                color=discord.Color.blue(),
                timestamp=datetime.fromisoformat(recent_story.get('created_at', datetime.utcnow().isoformat()))
            )
            
            embed.set_author(name=ctx.author.display_name, icon_url=ctx.author.avatar.url if ctx.author.avatar else None)
            
            # Add media if present
            if recent_story.get('media_url'):
                if any(ext in recent_story['media_url'].lower() for ext in ['jpg', 'jpeg', 'png', 'gif']):
                    embed.set_image(url=recent_story['media_url'])
                else:
                    embed.add_field(name="Media", value=recent_story['media_url'], inline=False)
            
            # Add bike information if associated with a bike
            if recent_story.get('bike_id'):
                bike_data = await self.api.get_bike(user_id, recent_story['bike_id'])
                if bike_data:
                    bike_str = f"{bike_data.get('year')} {bike_data.get('make')} {bike_data.get('model')}"
                    if bike_data.get('package'):
                        bike_str += f" ({bike_data['package']})"
                    embed.add_field(name="Motorcycle", value=bike_str, inline=True)
            
            # Add footer with source information
            embed.set_footer(text="Shared from BikeNode • View more at bikenode.com")
            
            # Send the story
            message = await ctx.send(embed=embed)
            
            # Store mapping for potential future deletion
            story_id = recent_story.get('id')
            if story_id:
                if story_id not in self.stories:
                    self.stories[story_id] = {}
                self.stories[story_id][str(ctx.guild.id)] = str(message.id)
                self._save_stories()
        
        except Exception as e:
            logger.error(f"Error sharing recent story: {e}")
            await ctx.send("An error occurred while retrieving your recent story.")
    
    @commands.command(name="setstorychannel")
    @commands.has_permissions(administrator=True)
    async def set_story_channel(self, ctx, channel: discord.TextChannel = None):
        """Set the channel where BikeNode stories will be posted"""
        if not channel:
            channel = ctx.channel
        
        # Load settings
        settings_file = self.data_dir / 'settings.json'
        settings = {}
        if settings_file.exists():
            try:
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
            except Exception:
                settings = {}
        
        # Create or update server settings
        server_id = str(ctx.guild.id)
        if server_id not in settings:
            settings[server_id] = {}
        
        settings[server_id]['story_channel_id'] = str(channel.id)
        
        # Save settings
        with open(settings_file, 'w') as f:
            json.dump(settings, f)
        
        await ctx.send(f"📋 BikeNode stories will now be posted in {channel.mention}")
    
    @commands.command(name="story")
    async def create_story(self, ctx, *, content: str = None):
        """Create a new story on your BikeNode profile
        
        Usage: !story Your story content here
        You can also attach an image to include with your story.
        """
        if not self.api:
            await ctx.send("BikeNode API integration is not configured.")
            return
        
        if not content and not ctx.message.attachments:
            await ctx.send("Please provide content for your story or attach an image.")
            return
        
        try:
            # Check if account is linked
            user_id = await self.api.get_user_id(str(ctx.author.id))
            if not user_id:
                await ctx.send("Your Discord account is not linked to BikeNode! Use `!link` to link your account first.")
                return
            
            # Check if there are attachments
            media_url = None
            if ctx.message.attachments:
                # Only use the first attachment
                attachment = ctx.message.attachments[0]
                if any(attachment.filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm']):
                    media_url = attachment.url
            
            # Check if this story should be associated with a bike
            await ctx.send("Do you want to associate this story with one of your motorcycles? (yes/no)")
            
            def check(m):
                return m.author == ctx.author and m.channel == ctx.channel and m.content.lower() in ['yes', 'no', 'y', 'n']
            
            bike_id = None
            try:
                msg = await self.bot.wait_for('message', check=check, timeout=30.0)
                if msg.content.lower() in ['yes', 'y']:
                    # Get user's bikes
                    bikes = await self.api.get_user_bikes(user_id)
                    if not bikes:
                        await ctx.send("You don't have any motorcycles in your profile yet! Use `!addbike` to add one.")
                    else:
                        # List bikes for selection
                        bike_list = "Reply with the number of the motorcycle:\n"
                        for i, bike in enumerate(bikes, 1):
                            bike_str = f"{i}. {bike.get('year')} {bike.get('make')} {bike.get('model')}"
                            if bike.get('package'):
                                bike_str += f" ({bike['package']})"
                            bike_list += bike_str + "\n"
                        
                        await ctx.send(bike_list)
                        
                        def bike_check(m):
                            return m.author == ctx.author and m.channel == ctx.channel and m.content.isdigit()
                        
                        msg = await self.bot.wait_for('message', check=bike_check, timeout=30.0)
                        selection = int(msg.content)
                        
                        if 1 <= selection <= len(bikes):
                            bike_id = bikes[selection-1].get('id')
                        else:
                            await ctx.send("Invalid selection. Creating story without a motorcycle association.")
            except asyncio.TimeoutError:
                await ctx.send("No response received. Creating story without a motorcycle association.")
            
            # Create the story on BikeNode
            result = await self.api.create_story(
                user_id, 
                {
                    'content': content or '',
                    'media_url': media_url,
                    'bike_id': bike_id,
                    'source': 'discord'
                }
            )
            
            if result and not result.get('error'):
                await ctx.send("✅ Story created on your BikeNode profile!")
                
                # Ask if they want to share it now
                await ctx.send("Do you want to share this story in this channel now? (yes/no)")
                
                try:
                    msg = await self.bot.wait_for('message', check=check, timeout=30.0)
                    if msg.content.lower() in ['yes', 'y']:
                        await self.recent_story(ctx)
                except asyncio.TimeoutError:
                    pass
            else:
                error_msg = result.get('message', 'Unknown error')
                await ctx.send(f"Failed to create story: {error_msg}")
        
        except Exception as e:
            logger.error(f"Error creating story: {e}")
            await ctx.send("An error occurred while creating your story.")

async def setup(bot):
    await bot.add_cog(StoryCommands(bot))
