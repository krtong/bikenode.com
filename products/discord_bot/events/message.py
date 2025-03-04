# This file handles message-related events (e.g., responding to messages).
# Update this file to modify or add message event handlers.
# Do not create new files for message events; update this one or add new functions here.

import discord
from discord.ext import commands
import logging
import asyncio
import re
from datetime import datetime

logger = logging.getLogger('BikeRoleBot')

class MessageEvents(commands.Cog):
    """Handle message events for BikeRole bot"""
    
    def __init__(self, bot):
        self.bot = bot
        self.cooldowns = {}
        
    @commands.Cog.listener()
    async def on_message(self, message):
        # Ignore messages from bots
        if message.author.bot:
            return
            
        # Handle automatic responses if enabled
        if hasattr(self.bot, 'api') and message.guild:
            server_id = str(message.guild.id)
            settings = await self._get_server_settings(server_id)
            
            # Auto-detect motorcycle mentions if enabled
            if settings.get('auto_detect_bikes', False):
                await self._detect_motorcycle_mentions(message)
            
            # Handle URL recognition for bike media if enabled
            if settings.get('auto_detect_media', False):
                await self._detect_bike_media(message)
    
    async def _get_server_settings(self, server_id):
        """Get settings for a server from local storage or API"""
        try:
            if hasattr(self.bot, 'server_settings') and server_id in self.bot.server_settings:
                return self.bot.server_settings[server_id]
            else:
                # Default settings
                return {
                    'auto_detect_bikes': False,
                    'auto_detect_media': False,
                    'story_channel_id': None,
                    'role_mode': 'brand'
                }
        except Exception as e:
            logger.error(f"Error getting server settings: {e}")
            return {}
    
    async def _detect_motorcycle_mentions(self, message):
        """Detect and respond to motorcycle mentions in messages"""
        # Simple regex to match potential motorcycle patterns: YYYY Make Model
        bike_pattern = r'\b(19|20)\d{2}\s+([A-Z][a-z]+|[A-Z]{2,})\s+([A-Z][a-zA-Z0-9]+)'
        matches = re.findall(bike_pattern, message.content)
        
        if not matches:
            return
            
        # Avoid spamming with too many responses
        if len(matches) > 3:
            matches = matches[:3]
        
        for match in matches:
            year, make, model = match
            
            # Check cooldown for this specific motorcycle
            cooldown_key = f"{message.guild.id}_{year}_{make}_{model}"
            if cooldown_key in self.cooldowns:
                if datetime.now().timestamp() - self.cooldowns[cooldown_key] < 300:  # 5 minute cooldown
                    continue
            
            # Look up the motorcycle if we have an API client
            if hasattr(self.bot, 'api'):
                try:
                    bike_data = await self.bot.api.lookup_bike(year, make, model)
                    if bike_data:
                        # Create an embed with bike info
                        embed = discord.Embed(
                            title=f"{year} {make} {model}",
                            description=f"I noticed you mentioned this motorcycle. Here's some information about it:",
                            color=discord.Color.blue()
                        )
                        if 'category' in bike_data:
                            embed.add_field(name="Category", value=bike_data['category'], inline=True)
                        if 'engine' in bike_data:
                            embed.add_field(name="Engine", value=bike_data['engine'], inline=True)
                        
                        embed.set_footer(text="Use !lookup for more detailed information")
                        
                        await message.channel.send(embed=embed)
                        
                        # Set cooldown
                        self.cooldowns[cooldown_key] = datetime.now().timestamp()
                except Exception as e:
                    logger.error(f"Error looking up bike data: {e}")
    
    async def _detect_bike_media(self, message):
        """Detect motorcycle media links and handle them if appropriate"""
        # Look for image or video links
        media_pattern = r'(https?://\S+\.(jpg|jpeg|png|gif|mp4|webm))\b'
        matches = re.findall(media_pattern, message.content)
        
        # Also check for YouTube links
        youtube_pattern = r'(https?://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[a-zA-Z0-9_-]+)'
        youtube_matches = re.findall(youtube_pattern, message.content)
        
        if not matches and not youtube_matches:
            return
            
        # Find potential motorcycle mentions near the links
        bike_pattern = r'\b(19|20)\d{2}\s+([A-Z][a-z]+|[A-Z]{2,})\s+([A-Z][a-zA-Z0-9]+)'
        bike_matches = re.findall(bike_pattern, message.content)
        
        if bike_matches:
            # Create a message with reaction options to save to their BikeNode profile
            confirmation = await message.channel.send(
                f"I noticed you shared media with a motorcycle mention. React with 🏍️ if you'd like to save this to your BikeNode profile."
            )
            await confirmation.add_reaction("🏍️")
            
            def check(reaction, user):
                return user == message.author and str(reaction.emoji) == "🏍️" and reaction.message.id == confirmation.id
            
            try:
                # Wait for a reaction
                reaction, user = await self.bot.wait_for('reaction_add', timeout=60.0, check=check)
                
                # Check if user is linked
                if hasattr(self.bot, 'api'):
                    user_id = await self.bot.api.get_user_id(str(message.author.id))
                    if not user_id:
                        await message.channel.send("Your Discord account isn't linked to BikeNode yet! Use `!link` to connect your accounts.")
                        return
                    
                    # Get the media URL
                    media_url = ""
                    if matches:
                        media_url = matches[0][0]
                    elif youtube_matches:
                        media_url = youtube_matches[0][0]
                    
                    # Extract the first bike mention
                    year, make, model = bike_matches[0]
                    
                    # Ask which bike this media belongs to
                    await message.channel.send("Which motorcycle does this media belong to? Reply with the number:")
                    
                    # Get user's bikes
                    bikes = await self.bot.api.get_user_bikes(user_id)
                    if not bikes:
                        await message.channel.send("You don't have any motorcycles in your profile yet! Use `!addbike` to add one.")
                        return
                    
                    # List bikes
                    bike_list = ""
                    for i, bike in enumerate(bikes, 1):
                        bike_list += f"{i}. {bike['year']} {bike['make']} {bike['model']}"
                        if bike.get('package'):
                            bike_list += f" ({bike['package']})"
                        bike_list += "\n"
                    
                    await message.channel.send(bike_list)
                    
                    def msg_check(m):
                        return m.author == message.author and m.channel == message.channel and m.content.isdigit()
                    
                    # Wait for user to select a bike
                    try:
                        msg = await self.bot.wait_for('message', check=msg_check, timeout=60.0)
                        selection = int(msg.content)
                        
                        if 1 <= selection <= len(bikes):
                            selected_bike = bikes[selection-1]
                            
                            # Add the media to the user's bike
                            result = await self.bot.api.add_bike_media(
                                user_id, 
                                selected_bike['id'], 
                                {
                                    'url': media_url,
                                    'type': 'image' if any(ext in media_url.lower() for ext in ['jpg', 'jpeg', 'png', 'gif']) else 'video',
                                    'caption': message.content,
                                    'source': 'discord'
                                }
                            )
                            
                            if result and not result.get('error'):
                                await message.channel.send("✅ Media saved to your BikeNode profile!")
                            else:
                                error_msg = result.get('message', 'Unknown error')
                                await message.channel.send(f"Failed to save media: {error_msg}")
                        else:
                            await message.channel.send("Invalid selection")
                    except asyncio.TimeoutError:
                        await message.channel.send("Timed out waiting for a response.")
                    
            except asyncio.TimeoutError:
                # User didn't react in time
                pass

    @commands.Cog.listener()
    async def on_command_error(self, ctx, error):
        """Handle command errors"""
        if isinstance(error, commands.CommandNotFound):
            return
        elif isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(f"Missing required argument: {error.param}")
        elif isinstance(error, commands.BadArgument):
            await ctx.send(f"Bad argument: {error}")
        elif isinstance(error, commands.MissingPermissions):
            await ctx.send("You don't have permission to use this command.")
        else:
            logger.error(f"Command error in {ctx.command}: {error}")
            await ctx.send("An error occurred while processing this command.")

async def setup(bot):
    await bot.add_cog(MessageEvents(bot))
