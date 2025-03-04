# This file handles message-related events (e.g., responding to messages).
# Update this file to modify or add message event handlers.
# Do not create new files for message events; update this one or add new functions here.

import discord
from discord.ext import commands
import logging

logger = logging.getLogger('BikeRoleBot')

class MessageEvents(commands.Cog):
    """Handles message-related events"""
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message):
        """Process messages"""
        if message.author == self.bot.user:
            return
        if message.content.startswith('!bike'):
            logger.info(f"Bike command used in {message.guild.name} by {message.author.name}")

async def setup(bot):
    # Register this cog with the bot
    await bot.add_cog(MessageEvents(bot))
