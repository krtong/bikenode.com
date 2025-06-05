import discord
from discord import app_commands
from discord.ext import commands
import logging
import aiohttp
import json
import os
from datetime import datetime
from typing import Optional

logger = logging.getLogger('BikeRoleBot')

class SlashCommands(commands.Cog):
    """Slash commands for BikeNode bot"""
    
    def __init__(self, bot):
        self.bot = bot
        
    @app_commands.command(name="test", description="Test if the BikeNode bot is working")
    async def test(self, interaction: discord.Interaction):
        """Test command to verify bot is working"""
        embed = discord.Embed(
            title="✅ Bot Status",
            description="BikeNode bot is working correctly!",
            color=discord.Color.green()
        )
        embed.add_field(name="Bot Name", value=self.bot.user.name, inline=True)
        embed.add_field(name="Bot ID", value=self.bot.user.id, inline=True)
        embed.add_field(name="Latency", value=f"{round(self.bot.latency * 1000)}ms", inline=True)
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @app_commands.command(name="api_test", description="Test BikeNode API connectivity")
    async def api_test(self, interaction: discord.Interaction):
        """Test API connectivity"""
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Test API connection
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.bot.config['api']['base_url']}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        embed = discord.Embed(
                            title="✅ API Connection Successful",
                            description=f"Connected to BikeNode API",
                            color=discord.Color.green()
                        )
                        embed.add_field(name="Status", value="Online", inline=True)
                        embed.add_field(name="Endpoint", value=self.bot.config['api']['base_url'], inline=True)
                        await interaction.followup.send(embed=embed, ephemeral=True)
                    else:
                        await interaction.followup.send(
                            f"❌ API returned status code: {response.status}", 
                            ephemeral=True
                        )
        except Exception as e:
            logger.error(f"API test failed: {e}")
            await interaction.followup.send(
                f"❌ Failed to connect to API: {str(e)}", 
                ephemeral=True
            )
    
    @app_commands.command(name="bikes", description="Show your bike collection from BikeNode")
    async def bikes(self, interaction: discord.Interaction):
        """Show user's bike collection"""
        await interaction.response.defer(ephemeral=True)
        
        # For now, return a placeholder message
        # In the future, this would fetch from the API using the user's Discord ID
        embed = discord.Embed(
            title="🏍️ Your Bike Collection",
            description="You haven't added any bikes yet!",
            color=discord.Color.blue()
        )
        embed.add_field(
            name="How to add bikes",
            value="Use `/search` to find bikes and add them to your collection",
            inline=False
        )
        await interaction.followup.send(embed=embed, ephemeral=True)
    
    @app_commands.command(name="profile", description="Create or manage your BikeNode profile")
    async def profile(self, interaction: discord.Interaction):
        """Create or manage user profile"""
        await interaction.response.defer(ephemeral=True)
        
        # Placeholder for profile management
        embed = discord.Embed(
            title="👤 BikeNode Profile",
            description=f"Profile for {interaction.user.mention}",
            color=discord.Color.blue()
        )
        embed.add_field(name="Discord ID", value=interaction.user.id, inline=True)
        embed.add_field(name="Username", value=interaction.user.name, inline=True)
        embed.add_field(name="Bikes", value="0", inline=True)
        embed.set_thumbnail(url=interaction.user.avatar.url if interaction.user.avatar else None)
        
        await interaction.followup.send(embed=embed, ephemeral=True)
    
    @app_commands.command(name="search", description="Search the BikeNode bicycle database")
    @app_commands.describe(query="Search for a bike by make, model, or year")
    async def search(self, interaction: discord.Interaction, query: str):
        """Search for bikes in the database"""
        await interaction.response.defer(ephemeral=True)
        
        # Search in the motorcycle data
        try:
            # Use the existing bike data manager
            results = []
            query_lower = query.lower()
            
            # Search through the loaded data
            if hasattr(self.bot, 'bike_data') and self.bot.bike_data is not None:
                for _, bike in self.bot.bike_data.iterrows():
                    if (query_lower in str(bike.get('Make', '')).lower() or 
                        query_lower in str(bike.get('Model', '')).lower() or
                        query_lower in str(bike.get('Year', ''))):
                        results.append(bike)
                        if len(results) >= 10:  # Limit results
                            break
            
            if results:
                embed = discord.Embed(
                    title=f"🔍 Search Results for '{query}'",
                    description=f"Found {len(results)} bikes",
                    color=discord.Color.green()
                )
                
                for bike in results[:5]:  # Show first 5
                    name = f"{bike.get('Year', 'Unknown')} {bike.get('Make', 'Unknown')} {bike.get('Model', 'Unknown')}"
                    value = f"Category: {bike.get('Category', 'Unknown')}"
                    embed.add_field(name=name, value=value, inline=False)
                
                if len(results) > 5:
                    embed.add_field(
                        name="More Results",
                        value=f"Showing 5 of {len(results)} results",
                        inline=False
                    )
                
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.followup.send(
                    f"No bikes found matching '{query}'", 
                    ephemeral=True
                )
                
        except Exception as e:
            logger.error(f"Search error: {e}")
            await interaction.followup.send(
                "❌ An error occurred while searching", 
                ephemeral=True
            )
    
    @app_commands.command(name="claude", description="Send a message to Claude")
    @app_commands.describe(message="Your message to Claude")
    async def claude_message(self, interaction: discord.Interaction, message: str):
        """Send a message to Claude"""
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Load existing messages
            messages_file = "claude_messages.json"
            if os.path.exists(messages_file):
                with open(messages_file, 'r') as f:
                    messages = json.load(f)
            else:
                messages = []
            
            # Create message object
            msg_data = {
                'id': len(messages) + 1,
                'timestamp': datetime.now().isoformat(),
                'channel_id': interaction.channel.id,
                'user_id': interaction.user.id,
                'username': interaction.user.name,
                'message': message,
                'responded': False
            }
            
            # Append and save
            messages.append(msg_data)
            with open(messages_file, 'w') as f:
                json.dump(messages, f, indent=2)
            
            embed = discord.Embed(
                title="📨 Message Sent to Claude",
                description=f"Your message: '{message[:100]}{'...' if len(message) > 100 else ''}'",
                color=discord.Color.blue()
            )
            embed.add_field(name="Message ID", value=str(msg_data['id']), inline=True)
            embed.add_field(name="Status", value="Queued for Claude", inline=True)
            embed.add_field(name="Next Steps", value="Use `/claude_check` to see responses", inline=False)
            
            await interaction.followup.send(embed=embed, ephemeral=True)
            
        except Exception as e:
            logger.error(f"Claude message error: {e}")
            await interaction.followup.send("❌ Error sending message to Claude", ephemeral=True)
    
    @app_commands.command(name="claude_check", description="Check for Claude's responses")
    @app_commands.describe(message_id="Optional: Check specific message ID")
    async def claude_check(self, interaction: discord.Interaction, message_id: Optional[int] = None):
        """Check for Claude's responses"""
        await interaction.response.defer(ephemeral=True)
        
        try:
            responses_file = "claude_responses.json"
            if not os.path.exists(responses_file):
                await interaction.followup.send("No responses yet. Claude hasn't replied.", ephemeral=True)
                return
            
            with open(responses_file, 'r') as f:
                responses = json.load(f)
            
            if not responses:
                await interaction.followup.send("No responses yet. Claude hasn't replied.", ephemeral=True)
                return
            
            # Filter responses for this channel
            channel_responses = [r for r in responses if r['channel_id'] == interaction.channel.id]
            
            if not channel_responses:
                await interaction.followup.send("No responses for this channel yet.", ephemeral=True)
                return
            
            # If specific message ID requested
            if message_id:
                response = next((r for r in channel_responses if r['message_id'] == message_id), None)
                if not response:
                    await interaction.followup.send(f"No response found for message ID {message_id}", ephemeral=True)
                    return
            else:
                # Get latest response
                response = channel_responses[-1]
            
            # Create embed
            embed = discord.Embed(
                title="💬 Claude's Response",
                description=response['response'][:4000],  # Discord limit
                color=discord.Color.green()
            )
            embed.add_field(
                name="Your message", 
                value=response['original_message'][:200] + ('...' if len(response['original_message']) > 200 else ''),
                inline=False
            )
            embed.set_footer(text=f"Message ID: {response['message_id']} | {response['timestamp']}")
            
            await interaction.followup.send(embed=embed, ephemeral=True)
            
        except Exception as e:
            logger.error(f"Claude check error: {e}")
            await interaction.followup.send("❌ Error checking Claude responses", ephemeral=True)

async def setup(bot):
    await bot.add_cog(SlashCommands(bot))