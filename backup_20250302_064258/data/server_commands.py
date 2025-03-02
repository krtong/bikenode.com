import discord
from discord.ext import commands
from bike_lookup import BikeDatabase

class BikeServerCommands(commands.Cog):
    """Commands for server administrators to manage BikeRole settings"""
    
    def __init__(self, bot):
        self.bot = bot
        self.db = BikeDatabase()
        self.settings = {}  # Store server-specific settings
        
    @commands.command(name='bikerole-setup')
    @commands.has_permissions(administrator=True)
    async def setup_bikerole(self, ctx):
        """Initial setup for BikeRole in your server"""
        server_id = str(ctx.guild.id)
        
        # Create default settings for this server if they don't exist
        if server_id not in self.settings:
            self.settings[server_id] = {
                'role_color': discord.Color.blue().value,
                'auto_approve': True,
                'max_bikes_per_user': 5,
                'restricted_categories': []
            }
        
        embed = discord.Embed(
            title="BikeRole Setup",
            description="BikeRole has been set up for your server!",
            color=discord.Color.green()
        )
        
        embed.add_field(name="Available Bikes", 
                        value=f"{len(self.db.makes)} makes, {len(self.db.models)} models",
                        inline=False)
        
        embed.add_field(name="Commands for Members", 
                        value="`!bike`, `!addbike`, `!mybikes`, etc.",
                        inline=False)
        
        embed.add_field(name="Admin Commands", 
                        value="`!bikerole-config`, `!bikerole-stats`",
                        inline=False)
                        
        await ctx.send(embed=embed)
    
    @commands.command(name='bikerole-config')
    @commands.has_permissions(administrator=True)
    async def config_bikerole(self, ctx, setting=None, *, value=None):
        """Configure BikeRole for your server"""
        server_id = str(ctx.guild.id)
        
        # Create settings if they don't exist
        if server_id not in self.settings:
            await ctx.send("Please run `!bikerole-setup` first.")
            return
        
        # If no arguments, show current settings
        if setting is None:
            embed = discord.Embed(
                title="BikeRole Configuration",
                description="Current settings for this server:",
                color=discord.Color.blue()
            )
            
            for k, v in self.settings[server_id].items():
                embed.add_field(name=k, value=str(v), inline=False)
                
            embed.add_field(
                name="How to Change",
                value="Use `!bikerole-config <setting> <value>`",
                inline=False
            )
            
            await ctx.send(embed=embed)
            return
            
        # Update the specific setting
        if setting in self.settings[server_id]:
            if setting == 'role_color':
                # Convert string to color
                try:
                    color = discord.Color(int(value.strip('#'), 16))
                    self.settings[server_id][setting] = color.value
                except:
                    await ctx.send("Invalid color. Use hex format like `#FF0000`.")
                    return
            elif setting == 'auto_approve':
                self.settings[server_id][setting] = value.lower() == 'true'
            elif setting == 'max_bikes_per_user':
                try:
                    self.settings[server_id][setting] = int(value)
                except:
                    await ctx.send("Invalid number. Please use a number like `5`.")
                    return
            elif setting == 'restricted_categories':
                # Comma separated list of categories to restrict
                self.settings[server_id][setting] = [c.strip() for c in value.split(',')]
            else:
                self.settings[server_id][setting] = value
                
            await ctx.send(f"Updated `{setting}` to `{value}`")
        else:
            await ctx.send(f"Unknown setting: `{setting}`")
    
    @commands.command(name='bikerole-stats')
    @commands.has_permissions(administrator=True)
    async def bikerole_stats(self, ctx):
        """Show statistics about bike roles in your server"""
        roles = ctx.guild.roles
        
        # Find all bike roles (matching year + make + model pattern)
        bike_roles = []
        for role in roles:
            parts = role.name.split()
            # Check if first part looks like a year (4 digits)
            if len(parts) >= 3 and parts[0].isdigit() and len(parts[0]) == 4:
                bike_roles.append(role)
        
        # Count bikes by make
        makes_count = {}
        for role in bike_roles:
            make = role.name.split()[1]  # Second word is typically the make
            makes_count[make] = makes_count.get(make, 0) + 1
        
        # Sort by popularity
        sorted_makes = sorted(makes_count.items(), key=lambda x: x[1], reverse=True)
        
        embed = discord.Embed(
            title="BikeRole Statistics",
            description=f"Total bike roles: {len(bike_roles)}",
            color=discord.Color.gold()
        )
        
        if sorted_makes:
            makes_list = "\n".join([f"{make}: {count}" for make, count in sorted_makes[:10]])
            embed.add_field(
                name="Most Popular Manufacturers",
                value=makes_list if makes_list else "None yet",
                inline=False
            )
        
        # Get users with most bikes
        user_bikes = {}
        for member in ctx.guild.members:
            bike_count = sum(1 for role in member.roles if role in bike_roles)
            if bike_count > 0:
                user_bikes[member.display_name] = bike_count
        
        sorted_users = sorted(user_bikes.items(), key=lambda x: x[1], reverse=True)
        
        if sorted_users:
            users_list = "\n".join([f"{user}: {count}" for user, count in sorted_users[:5]])
            embed.add_field(
                name="Top Collectors",
                value=users_list if users_list else "None yet",
                inline=False
            )
            
        await ctx.send(embed=embed)

def setup(bot):
    bot.add_cog(BikeServerCommands(bot))
