from aiohttp import web
import json
import logging
from pathlib import Path
import discord

logger = logging.getLogger('BikeRoleBot')

class WebhookHandler:
    """Handle webhooks from BikeNode"""
    
    def __init__(self, bot, api, port=8080):
        self.bot = bot
        self.api = api
        self.port = port
        self.app = web.Application()
        self.app.add_routes([
            web.post('/webhook/story', self.handle_story_webhook)
        ])
        self.runner = None
        self.site = None
        
        # Load story mapping
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
                logger.error(f"Error loading stories mapping: {e}")
        return {}
    
    def _save_stories(self):
        """Save stories mapping to JSON file"""
        try:
            with open(self.stories_file, 'w') as f:
                json.dump(self.stories, f)
        except Exception as e:
            logger.error(f"Error saving stories mapping: {e}")
    
    async def start(self):
        """Start the webhook server"""
        try:
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            self.site = web.TCPSite(self.runner, '0.0.0.0', self.port)
            await self.site.start()
            logger.info(f"Webhook server started on port {self.port}")
        except Exception as e:
            logger.error(f"Failed to start webhook server: {e}")
    
    async def stop(self):
        """Stop the webhook server"""
        if self.site:
            await self.site.stop()
        if self.runner:
            await self.runner.cleanup()
    
    async def handle_story_webhook(self, request):
        """Handle story webhook from BikeNode"""
        try:
            # Verify webhook signature (implement proper validation)
            if 'X-BikeNode-Signature' not in request.headers:
                return web.Response(status=401, text="Unauthorized")
            
            data = await request.json()
            if data.get('action') == 'publish':
                await self._handle_story_publish(data)
            elif data.get('action') == 'delete':
                await self._handle_story_delete(data)
            
            return web.Response(status=200, text="OK")
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            return web.Response(status=500, text="Server Error")
    
    async def _handle_story_publish(self, data):
        """Handle story publish action"""
        story_id = data.get('story_id')
        content = data.get('content')
        media_url = data.get('media_url')
        allowed_servers = data.get('allowed_servers', [])
        author_discord_id = data.get('discord_id')
        
        if not story_id or not allowed_servers:
            return
        
        # For each allowed server, find the story channel and post
        for server_id in allowed_servers:
            guild = self.bot.get_guild(int(server_id))
            if not guild:
                continue
            
            # Load server settings
            settings_file = self.data_dir / 'settings.json'
            settings = {}
            if settings_file.exists():
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
            
            channel_id = settings.get(str(server_id), {}).get('story_channel_id')
            if not channel_id:
                continue
                
            channel = guild.get_channel(int(channel_id))
            if not channel:
                continue
            
            # Create message embed
            author = guild.get_member(int(author_discord_id))
            if not author:
                continue
                
            embed = discord.Embed(
                title=f"Motorcycle Story from {author.display_name}",
                description=content,
                color=discord.Color.blue()
            )
            embed.set_author(name=author.display_name, icon_url=author.avatar.url if author.avatar else None)
            
            if media_url:
                embed.set_image(url=media_url)
            
            try:
                message = await channel.send(embed=embed)
                
                # Store mapping of story to Discord messages
                if story_id not in self.stories:
                    self.stories[story_id] = {}
                self.stories[story_id][str(server_id)] = str(message.id)
                self._save_stories()
            except Exception as e:
                logger.error(f"Error sending story to channel {channel_id}: {e}")
    
    async def _handle_story_delete(self, data):
        """Handle story delete action"""
        story_id = data.get('story_id')
        if not story_id or story_id not in self.stories:
            return
        
        # For each server where the story was posted, delete the message
        for server_id, message_id in self.stories[story_id].items():
            try:
                guild = self.bot.get_guild(int(server_id))
                if not guild:
                    continue
                
                settings_file = self.data_dir / 'settings.json'
                settings = {}
                if settings_file.exists():
                    with open(settings_file, 'r') as f:
                        settings = json.load(f)
                
                channel_id = settings.get(server_id, {}).get('story_channel_id')
                if not channel_id:
                    continue
                    
                channel = guild.get_channel(int(channel_id))
                if not channel:
                    continue
                
                message = await channel.fetch_message(int(message_id))
                if message:
                    await message.delete()
            except Exception as e:
                logger.error(f"Error deleting message {message_id}: {e}")
        
        # Remove story from mapping
        del self.stories[story_id]
        self._save_stories()
