# Bicycle-specific commands for the BikeNode Discord bot
# Handles linking accounts and displaying bicycle profiles

import discord
from discord.ext import commands
import logging
import aiohttp
import json
from typing import Dict, Any, List, Optional

logger = logging.getLogger('BikeRoleBot')

class BicycleCommands(commands.Cog):
    """Commands for bicycle information and BikeNode account management"""
    
    def __init__(self, bot):
        self.bot = bot
        self.bikenode_api_base = "http://localhost:8080/api"  # Local development server
        
    async def make_api_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Make HTTP request to BikeNode API"""
        url = f"{self.bikenode_api_base}/{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                if method.upper() == "GET":
                    async with session.get(url, params=data) as response:
                        if response.status == 200:
                            return await response.json()
                        else:
                            return {"error": f"HTTP {response.status}"}
                            
                elif method.upper() == "POST":
                    async with session.post(url, json=data) as response:
                        if response.status in [200, 201]:
                            return await response.json()
                        else:
                            return {"error": f"HTTP {response.status}"}
                            
        except Exception as e:
            logger.error(f"API request failed: {e}")
            return {"error": str(e)}

    @commands.command(name="link-bikenode")
    async def link_bikenode_account(self, ctx):
        """Link your Discord account to BikeNode for bicycle profiles"""
        try:
            # Check if already linked
            result = await self.make_api_request("GET", f"discord/user/{ctx.author.id}")
            if result and not result.get("error"):
                await ctx.send("Your Discord account is already linked to BikeNode!")
                return
                
            # Request linking code
            link_data = {
                "discord_id": str(ctx.author.id),
                "discord_username": f"{ctx.author.name}#{ctx.author.discriminator}",
                "server_id": str(ctx.guild.id) if ctx.guild else None
            }
            
            result = await self.make_api_request("POST", "discord/link-request", link_data)
            
            if result and "code" in result and not result.get("error"):
                # Send linking instructions via DM
                try:
                    dm_embed = discord.Embed(
                        title="🚴‍♂️ Link Your BikeNode Account",
                        description=(
                            f"Visit **bikenode.com/link** and enter this code:\n\n"
                            f"**`{result['code']}`**\n\n"
                            f"This code will expire in 10 minutes.\n\n"
                            f"After linking, you can:\n"
                            f"• Add bicycles to your BikeNode profile\n"
                            f"• Display your bike collection in Discord\n"
                            f"• Get automatic server roles based on your bikes"
                        ),
                        color=discord.Color.blue()
                    )
                    dm_embed.set_footer(text="BikeNode Discord Integration")
                    
                    await ctx.author.send(embed=dm_embed)
                    await ctx.send("📧 Check your DMs for linking instructions!")
                    
                except discord.Forbidden:
                    # If DM fails, send in channel (less secure but functional)
                    embed = discord.Embed(
                        title="🚴‍♂️ Link Your BikeNode Account",
                        description=(
                            f"I couldn't send you a DM. Here's your linking code:\n\n"
                            f"**`{result['code']}`**\n\n"
                            f"Visit **bikenode.com/link** and enter this code.\n"
                            f"Code expires in 10 minutes."
                        ),
                        color=discord.Color.orange()
                    )
                    await ctx.send(embed=embed)
                    
            else:
                error_msg = result.get("message", "Failed to generate linking code")
                await ctx.send(f"❌ {error_msg}. Please try again later.")
                
        except Exception as e:
            logger.error(f"Error in link_bikenode_account: {e}")
            await ctx.send("❌ An error occurred while generating your linking code. Please try again later.")

    @commands.command(name="my-bikes")
    async def show_my_bikes(self, ctx):
        """Display your bicycle collection from BikeNode"""
        try:
            # Get user's BikeNode data
            result = await self.make_api_request("GET", f"discord/user/{ctx.author.id}/bikes")
            
            if result and result.get("error"):
                if "not found" in result["error"].lower():
                    await ctx.send("🔗 Your Discord account is not linked to BikeNode! Use `!link-bikenode` to get started.")
                else:
                    await ctx.send(f"❌ Error: {result['error']}")
                return
                
            if not result or not result.get("bicycles"):
                await ctx.send("🚴‍♂️ You don't have any bicycles in your BikeNode profile yet!\n\nVisit **bikenode.com** to add bikes to your collection.")
                return
                
            bikes = result["bicycles"]
            
            # Create embed
            embed = discord.Embed(
                title=f"🚴‍♂️ {ctx.author.display_name}'s Bicycle Collection",
                description=f"You have {len(bikes)} bicycle{'s' if len(bikes) != 1 else ''} in your collection:",
                color=discord.Color.green()
            )
            
            for i, bike_data in enumerate(bikes[:10], 1):  # Limit to 10 bikes to avoid embed limits
                bike = bike_data.get("bicycle", {})
                
                bike_name = bike.get("name", "Unknown Bike")
                specs = []
                
                if bike.get("year"):
                    specs.append(f"Year: {bike['year']}")
                if bike.get("frame_material"):
                    specs.append(f"Frame: {bike['frame_material']}")
                if bike.get("groupset"):
                    specs.append(f"Groupset: {bike['groupset']}")
                if bike.get("weight"):
                    specs.append(f"Weight: {bike['weight']}")
                if bike.get("price"):
                    specs.append(f"Price: {bike['price']}")
                    
                spec_text = "\n".join(specs) if specs else "No detailed specs available"
                
                embed.add_field(
                    name=f"{i}. {bike_name}",
                    value=spec_text,
                    inline=False
                )
                
            if len(bikes) > 10:
                embed.set_footer(text=f"Showing first 10 of {len(bikes)} bikes. Visit bikenode.com to see all your bikes.")
            else:
                embed.set_footer(text="Visit bikenode.com to manage your bicycle collection")
                
            await ctx.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Error in show_my_bikes: {e}")
            await ctx.send("❌ An error occurred while fetching your bicycle data.")

    @commands.command(name="bike-profile", aliases=["profile-bikes"])
    async def show_user_bikes(self, ctx, user: discord.Member = None):
        """Display another user's bicycle collection"""
        target_user = user or ctx.author
        
        try:
            # Get user's BikeNode data  
            result = await self.make_api_request("GET", f"discord/user/{target_user.id}/bikes")
            
            if result and result.get("error"):
                if target_user == ctx.author:
                    await ctx.send("🔗 Your Discord account is not linked to BikeNode! Use `!link-bikenode` to get started.")
                else:
                    await ctx.send(f"🔗 {target_user.display_name}'s Discord account is not linked to BikeNode.")
                return
                
            if not result or not result.get("bicycles"):
                if target_user == ctx.author:
                    await ctx.send("🚴‍♂️ You don't have any bicycles in your BikeNode profile yet!")
                else:
                    await ctx.send(f"🚴‍♂️ {target_user.display_name} doesn't have any bicycles in their BikeNode profile.")
                return
                
            bikes = result["bicycles"]
            
            # Check privacy settings (if implemented)
            privacy_result = await self.make_api_request("GET", f"discord/user/{target_user.id}/privacy/{ctx.guild.id}")
            if privacy_result and privacy_result.get("show_bikes") is False:
                await ctx.send(f"🔒 {target_user.display_name} has disabled bike profile sharing in this server.")
                return
            
            # Create embed
            embed = discord.Embed(
                title=f"🚴‍♂️ {target_user.display_name}'s Bicycle Collection",
                description=f"{target_user.display_name} has {len(bikes)} bicycle{'s' if len(bikes) != 1 else ''}:",
                color=discord.Color.blue()
            )
            
            for i, bike_data in enumerate(bikes[:8], 1):  # Limit to 8 for other users
                bike = bike_data.get("bicycle", {})
                
                bike_name = bike.get("name", "Unknown Bike")
                specs = []
                
                if bike.get("manufacturer"):
                    specs.append(f"Brand: {bike['manufacturer']}")
                if bike.get("year"):
                    specs.append(f"Year: {bike['year']}")
                if bike.get("drivetrain"):
                    specs.append(f"Drivetrain: {bike['drivetrain']}")
                if bike.get("suspension"):
                    specs.append(f"Type: {bike['suspension']}")
                    
                spec_text = "\n".join(specs) if specs else "No specs available"
                
                embed.add_field(
                    name=f"{i}. {bike_name}",
                    value=spec_text,
                    inline=True
                )
                
            if len(bikes) > 8:
                embed.set_footer(text=f"Showing first 8 of {len(bikes)} bikes")
            else:
                embed.set_footer(text="BikeNode Discord Integration")
                
            await ctx.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Error in show_user_bikes: {e}")
            await ctx.send("❌ An error occurred while fetching bicycle data.")

    @commands.command(name="bike-info")
    async def bicycle_info(self, ctx, *, search_term: str):
        """Search for bicycle information in the BikeNode database"""
        try:
            # Search bicycles via API
            search_params = {
                "q": search_term,
                "limit": 5
            }
            
            result = await self.make_api_request("GET", "bicycles/search", search_params)
            
            if result and result.get("error"):
                await ctx.send(f"❌ Search failed: {result['error']}")
                return
                
            if not result or not result.get("bicycles"):
                await ctx.send(f"🔍 No bicycles found matching '{search_term}'")
                return
                
            bikes = result["bicycles"]
            
            embed = discord.Embed(
                title=f"🔍 Bicycle Search Results for '{search_term}'",
                description=f"Found {result.get('total', len(bikes))} bicycle{'s' if result.get('total', len(bikes)) != 1 else ''}:",
                color=discord.Color.blue()
            )
            
            for bike in bikes:
                bike_title = f"{bike.get('year', '?')} {bike.get('manufacturer', 'Unknown')} {bike.get('model', bike.get('name', 'Unknown'))}"
                
                specs = []
                if bike.get("frame_material"):
                    specs.append(f"Frame: {bike['frame_material']}")
                if bike.get("drivetrain"):
                    specs.append(f"Drivetrain: {bike['drivetrain']}")
                if bike.get("groupset"):
                    specs.append(f"Groupset: {bike['groupset']}")
                if bike.get("weight"):
                    specs.append(f"Weight: {bike['weight']}")
                if bike.get("price"):
                    specs.append(f"MSRP: {bike['price']}")
                if bike.get("is_electric"):
                    specs.append("⚡ Electric")
                    
                spec_text = "\n".join(specs) if specs else "No specifications available"
                
                embed.add_field(
                    name=bike_title,
                    value=spec_text,
                    inline=False
                )
                
            embed.set_footer(text="Data from BikeNode bicycle database")
            await ctx.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Error in bicycle_info: {e}")
            await ctx.send("❌ An error occurred while searching for bicycles.")

    @commands.command(name="unlink-bikenode")
    async def unlink_bikenode_account(self, ctx):
        """Unlink your Discord account from BikeNode"""
        try:
            # Check if linked
            result = await self.make_api_request("GET", f"discord/user/{ctx.author.id}")
            if result and result.get("error"):
                await ctx.send("🔗 Your Discord account is not linked to BikeNode.")
                return
                
            # Confirm unlinking
            confirm_embed = discord.Embed(
                title="🚴‍♂️ Unlink BikeNode Account",
                description=(
                    "Are you sure you want to unlink your BikeNode account?\n\n"
                    "This will:\n"
                    "• Remove your bike profile from Discord\n"
                    "• Remove any automatic server roles\n"
                    "• Require re-linking to use BikeNode features\n\n"
                    "React with ✅ to confirm or ❌ to cancel."
                ),
                color=discord.Color.orange()
            )
            
            message = await ctx.send(embed=confirm_embed)
            await message.add_reaction("✅")
            await message.add_reaction("❌")
            
            def check(reaction, user):
                return (user == ctx.author and 
                       str(reaction.emoji) in ["✅", "❌"] and 
                       reaction.message.id == message.id)
            
            try:
                reaction, user = await self.bot.wait_for('reaction_add', timeout=30.0, check=check)
                
                if str(reaction.emoji) == "✅":
                    # Proceed with unlinking
                    unlink_result = await self.make_api_request("POST", f"discord/user/{ctx.author.id}/unlink", {
                        "server_id": str(ctx.guild.id) if ctx.guild else None
                    })
                    
                    if unlink_result and not unlink_result.get("error"):
                        await ctx.send("✅ Your BikeNode account has been unlinked from Discord.")
                    else:
                        error_msg = unlink_result.get("message", "Failed to unlink account")
                        await ctx.send(f"❌ {error_msg}")
                else:
                    await ctx.send("❌ Unlink cancelled.")
                    
            except Exception:
                await ctx.send("⏰ Unlink request timed out.")
                
        except Exception as e:
            logger.error(f"Error in unlink_bikenode_account: {e}")
            await ctx.send("❌ An error occurred while processing the unlink request.")

    @commands.command(name="bike-stats")
    async def bicycle_stats(self, ctx):
        """Show statistics about the bicycle database"""
        try:
            # Get database stats
            result = await self.make_api_request("GET", "bicycles/stats")
            
            if result and result.get("error"):
                await ctx.send(f"❌ Failed to get statistics: {result['error']}")
                return
                
            embed = discord.Embed(
                title="🚴‍♂️ BikeNode Database Statistics",
                color=discord.Color.green()
            )
            
            if result.get("total_bicycles"):
                embed.add_field(name="Total Bicycles", value=f"{result['total_bicycles']:,}", inline=True)
            if result.get("manufacturers"):
                embed.add_field(name="Manufacturers", value=str(len(result['manufacturers'])), inline=True)
            if result.get("year_range"):
                embed.add_field(name="Year Range", value=f"{result['year_range']['min']} - {result['year_range']['max']}", inline=True)
            if result.get("electric_bikes"):
                embed.add_field(name="Electric Bikes", value=f"{result['electric_bikes']:,}", inline=True)
                
            # Add top manufacturers if available
            if result.get("top_manufacturers"):
                top_brands = result['top_manufacturers'][:5]
                brands_text = "\n".join([f"{brand['name']}: {brand['count']:,} bikes" for brand in top_brands])
                embed.add_field(name="Top Manufacturers", value=brands_text, inline=False)
                
            embed.set_footer(text="Data continuously updated from 99spokes.com")
            await ctx.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Error in bicycle_stats: {e}")
            await ctx.send("❌ An error occurred while fetching database statistics.")

async def setup(bot):
    """Setup function to add this cog to the bot"""
    await bot.add_cog(BicycleCommands(bot))