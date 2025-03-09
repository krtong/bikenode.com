import asyncio
import logging
import json
import hmac
import hashlib
from aiohttp import web
import discord

logger = logging.getLogger('BikeRoleBot')

class WebhookHandler:
    """Handles webhooks from the BikeNode API"""
    
    def __init__(self, bot, api_client, port=5000, secret=None):
        self.bot = bot
        self.api = api_client
        self.port = port
        self.secret = secret
        self.app = web.Application()
        self.runner = None
        self.site = None
        
        # Set up webhook routes
        self.app.add_routes([
            web.post('/webhook', self.handle_webhook),
            web.get('/health', self.health_check)
        ])
    
    async def start(self):
        """Start the webhook server"""
        try:
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            self.site = web.TCPSite(self.runner, '0.0.0.0', self.port)
            await self.site.start()
            logger.info(f"Webhook server started on port {self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to start webhook server: {e}")
            return False
    
    async def stop(self):
        """Stop the webhook server"""
        if self.site:
            await self.site.stop()
        if self.runner:
            await self.runner.cleanup()
        logger.info("Webhook server stopped")
    
    async def handle_webhook(self, request):
        """Handle incoming webhook from BikeNode API"""
        try:
            # Verify webhook signature if secret is set
            if self.secret:
                signature = request.headers.get('X-BikeNode-Signature')
                if not signature or not self.verify_signature(await request.read(), signature):
                    logger.warning("Invalid webhook signature")
                    return web.Response(status=401, text="Invalid signature")
            
            # Parse the webhook data
            webhook_data = await request.json()
            event_type = webhook_data.get('event')
            
            # Process different event types
            if event_type == 'user.link':
                await self.handle_user_link_event(webhook_data)
            elif event_type == 'user.unlink':
                await self.handle_user_unlink_event(webhook_data)
            elif event_type == 'bike.add':
                await self.handle_bike_add_event(webhook_data)
            elif event_type == 'bike.remove':
                await self.handle_bike_remove_event(webhook_data)
            elif event_type == 'premium.change':
                await self.handle_premium_change_event(webhook_data)
            else:
                logger.warning(f"Unknown webhook event type: {event_type}")
            
            return web.Response(status=200, text="OK")
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            return web.Response(status=500, text="Internal server error")
    
    async def health_check(self, request):
        """Health check endpoint"""
        return web.Response(text="OK")
    
    def verify_signature(self, payload, signature):
        """Verify that the webhook came from BikeNode"""
        if not self.secret:
            return True
        
        # Compute HMAC signature
        computed = hmac.new(
            self.secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(computed, signature)
    
    async def handle_user_link_event(self, data):
        """Handle user account linking event"""
        try:
            discord_id = data.get('discord_id')
            user_id = data.get('user_id')
            
            if discord_id:
                # Update user roles across all servers
                for guild in self.bot.guilds:
                    member = guild.get_member(int(discord_id))
                    if member:
                        await self.bot.role_manager.update_user_roles(member)
                
                logger.info(f"Processed user link event for Discord ID {discord_id}")
        except Exception as e:
            logger.error(f"Error handling user link event: {e}")
    
    async def handle_user_unlink_event(self, data):
        """Handle user account unlinking event"""
        try:
            discord_id = data.get('discord_id')
            
            if discord_id:
                # Remove all BikeNode roles across all servers
                for guild in self.bot.guilds:
                    member = guild.get_member(int(discord_id))
                    if member:
                        # Get all roles that start with the role prefix
                        prefix_roles = [
                            role for role in member.roles 
                            if role.name.startswith(self.bot.role_manager.role_prefix)
                        ]
                        # Remove those roles
                        await member.remove_roles(*prefix_roles, reason="BikeNode account unlinked")
                
                logger.info(f"Processed user unlink event for Discord ID {discord_id}")
        except Exception as e:
            logger.error(f"Error handling user unlink event: {e}")
    
    async def handle_bike_add_event(self, data):
        """Handle bike add event"""
        try:
            discord_id = data.get('discord_id')
            
            if discord_id:
                # Update user roles across all servers
                for guild in self.bot.guilds:
                    member = guild.get_member(int(discord_id))
                    if member:
                        await self.bot.role_manager.update_user_roles(member)
                
                logger.info(f"Processed bike add event for Discord ID {discord_id}")
        except Exception as e:
            logger.error(f"Error handling bike add event: {e}")
    
    async def handle_bike_remove_event(self, data):
        """Handle bike remove event"""
        try:
            discord_id = data.get('discord_id')
            
            if discord_id:
                # Update user roles across all servers
                for guild in self.bot.guilds:
                    member = guild.get_member(int(discord_id))
                    if member:
                        await self.bot.role_manager.update_user_roles(member)
                
                logger.info(f"Processed bike remove event for Discord ID {discord_id}")
        except Exception as e:
            logger.error(f"Error handling bike remove event: {e}")
    
    async def handle_premium_change_event(self, data):
        """Handle premium status change event"""
        try:
            discord_id = data.get('discord_id')
            
            if discord_id:
                # Update premium role across all servers
                for guild in self.bot.guilds:
                    member = guild.get_member(int(discord_id))
                    if member:
                        await self.bot.role_manager.check_and_update_premium_role(member)
                
                logger.info(f"Processed premium change event for Discord ID {discord_id}")
        except Exception as e:
            logger.error(f"Error handling premium change event: {e}")
