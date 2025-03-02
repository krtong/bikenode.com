import os
import discord
from discord.ext import commands
from discord import app_commands
import asyncio
import logging
from bike_lookup_extended import ExtendedBikeDatabase, create_discord_bot_role_helper

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('BikeRoleBot')

# Bot configuration
BOT_NAME = "BikeRole"
BOT_DESC = "A bot for motorcycle and bicycle enthusiasts to add their rides as roles."
APPLICATION_ID = 1345714686078746644

# Initialize the database and helper functions
vehicle_db = ExtendedBikeDatabase()
vehicle_helpers = create_discord_bot_role_helper()

# Set up Discord bot with proper intents
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

# Server-specific settings
server_settings = {}

@bot.event
async def on_ready():
    """When the bot starts up"""
    logger.info(f'{bot.user.name} is connected to Discord!')
    logger.info(f'Bot ID: {bot.user.id}')
    logger.info(f'Connected to {len(bot.guilds)} servers')
    logger.info(f'Serving approximately {sum(guild.member_count for guild in bot.guilds)} users')
    
    # Set custom status
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching, 
            name="for !bike and !bicycle commands"
        )
    )
    
    # Try to sync slash commands (only needed occasionally)
    # try:
    #     await bot.tree.sync()
    #     logger.info("Successfully synced application commands")
    # except Exception as e:
    #     logger.error(f"Failed to sync application commands: {e}")
    #     pass

#------------------------------------------------
# Basic commands
#------------------------------------------------

@bot.command(name="help")
async def help_command(ctx):
    """Display help information about BikeRole commands"""
    embed = discord.Embed(
        title="BikeRole Bot Commands",
        description="Here are the available commands for BikeRole:",
        color=discord.Color.blue()
    )
    
    # Motorcycle commands
    embed.add_field(
        name="🏍️ Motorcycle Commands",
        value=(
            "`!bike <query>` - Search for motorcycles\n"
            "`!makes` - List motorcycle manufacturers\n"
            "`!models <make>` - List models for a manufacturer\n"
            "`!packages <make> <model>` - List packages for a model\n"
            "`!addbike <make> <model> <year> [package]` - Add a motorcycle role\n"
            "`!mybikes` - Show your motorcycles"
        ),
        inline=False
    )
    
    # Bicycle commands
    embed.add_field(
        name="🚲 Bicycle Commands",
        value=(
            "`!bicycle <query>` - Search for bicycles\n"
            "`!bikemakes` - List bicycle manufacturers\n"
            "`!bicyclemodels <make>` - List models for a manufacturer\n"
            "`!bicyclepackages <make> <model>` - List packages for a model\n"
            "`!addbicycle <make> <model> <year> [package]` - Add a bicycle role\n"
            "`!mybicycles` - Show your bicycles"
        ),
        inline=False
    )
    
    # Community commands
    embed.add_field(
        name="🌐 Community Commands",
        value=(
            "`!riders <query>` - Find members with matching bikes\n"
            "`!vehiclestats` - Show bike statistics in the server"
        ),
        inline=False
    )
    
    # Admin commands
    embed.add_field(
        name="⚙️ Admin Commands",
        value=(
            "`!bikerole-setup` - Set up the bot for your server\n"
            "`!bikerole-config` - Configure bot settings"
        ),
        inline=False
    )
    
    embed.set_footer(text="For more detailed help, check out the documentation.")
    
    await ctx.send(embed=embed)

#------------------------------------------------
# Motorcycle Commands
#------------------------------------------------

@bot.command(name='bike')
async def motorcycle_search(ctx, *, query):
    """Search for a motorcycle in the database"""
    await vehicle_search(ctx, query, 'motorcycle')

@bot.command(name='makes')
async def list_motorcycle_makes(ctx):
    """List all available motorcycle manufacturers"""
    await list_makes(ctx, 'motorcycle')

@bot.command(name='models')
async def list_motorcycle_models(ctx, *, make):
    """List all models for a specific motorcycle manufacturer"""
    await list_models(ctx, make, 'motorcycle')

@bot.command(name='packages')
async def list_motorcycle_packages(ctx, make, *, model):
    """List all packages for a specific motorcycle model"""
    await list_packages(ctx, make, model, 'motorcycle')

@bot.command(name='addbike')
async def add_motorcycle_role(ctx, make, model, year=None, package=None):
    """Add a motorcycle to your profile"""
    await add_vehicle_role(ctx, make, model, year, package, 'motorcycle')

@bot.command(name='mybikes')
async def list_user_motorcycles(ctx, member: discord.Member = None):
    """Show all motorcycles a user has added to their profile"""
    await list_user_vehicles(ctx, member, 'motorcycle')

#------------------------------------------------
# Bicycle Commands
#------------------------------------------------

@bot.command(name='bicycle')
async def bicycle_search(ctx, *, query):
    """Search for a bicycle in the database"""
    await vehicle_search(ctx, query, 'bicycle')

@bot.command(name='bikemakes')
async def list_bicycle_makes(ctx):
    """List all available bicycle manufacturers"""
    await list_makes(ctx, 'bicycle')

@bot.command(name='bicyclemodels')
async def list_bicycle_models(ctx, *, make):
    """List all models for a specific bicycle manufacturer"""
    await list_models(ctx, make, 'bicycle')

@bot.command(name='bicyclepackages')
async def list_bicycle_packages(ctx, make, *, model):
    """List all packages for a specific bicycle model"""
    await list_packages(ctx, make, model, 'bicycle')

@bot.command(name='addbicycle')
async def add_bicycle_role(ctx, make, model, year=None, package=None):
    """Add a bicycle to your profile"""
    await add_vehicle_role(ctx, make, model, year, package, 'bicycle')

@bot.command(name='mybicycles')
async def list_user_bicycles(ctx, member: discord.Member = None):
    """Show all bicycles a user has added to their profile"""
    await list_user_vehicles(ctx, member, 'bicycle')

#------------------------------------------------
# Community Commands
#------------------------------------------------

@bot.command(name='riders')
async def list_riders_with_vehicle(ctx, *, query=None):
    """Show all members with a specific make or model of vehicle"""
    if not query:
        await ctx.send("Please specify a make or model to find riders. Example: `!riders Trek` or `!riders Harley-Davidson`")
        return
    
    query_lower = query.lower()
    matching_members = []
    
    for member in ctx.guild.members:
        for role in member.roles:
            # Check if the role name contains the query
            if query_lower in role.name.lower():
                # Make sure it's a vehicle role (starts with 4-digit year)
                parts = role.name.split()
                if len(parts) >= 3 and parts[0].isdigit() and len(parts[0]) == 4:
                    matching_members.append((member, role.name))
    
    if not matching_members:
        await ctx.send(f"No riders found with vehicles matching '{query}'.")
        return
    
    embed = discord.Embed(
        title=f"Riders with {query}",
        description=f"Found {len(matching_members)} vehicles",
        color=discord.Color.gold()
    )
    
    # Group by member
    riders_by_member = {}
    for member, vehicle in matching_members:
        if member.display_name not in riders_by_member:
            riders_by_member[member.display_name] = []
        
        riders_by_member[member.display_name].append(vehicle)
    
    # Add fields for each rider
    for rider, vehicles in riders_by_member.items():
        vehicles_text = "\n".join(vehicles[:5])
        if len(vehicles) > 5:
            vehicles_text += f"\n...and {len(vehicles) - 5} more"
        embed.add_field(name=rider, value=vehicles_text, inline=False)
    
    await ctx.send(embed=embed)

@bot.command(name='vehiclestats')
async def vehicle_stats(ctx):
    """Show statistics about vehicles in the server"""
    # Count roles by type and by make
    roles = ctx.guild.roles
    
    # Find all vehicle roles (matching year + make + model pattern)
    vehicle_roles = []
    for role in roles:
        parts = role.name.split()
        # Check if first part looks like a year (4 digits)
        if len(parts) >= 3 and parts[0].isdigit() and len(parts[0]) == 4:
            vehicle_roles.append(role)
    
    if not vehicle_roles:
        await ctx.send("No vehicle roles found in the server yet. Use `!addbike` or `!addbicycle` to add some!")
        return
    
    embed = discord.Embed(
        title="🏍️ Vehicle Statistics",
        description=f"Stats for {ctx.guild.name}",
        color=discord.Color.gold()
    )
    
    # Count vehicles by make
    makes_count = {}
    years_count = {}
    
    for role in vehicle_roles:
        parts = role.name.split()
        year = parts[0]
        make = parts[1]
        
        # Count by make
        makes_count[make] = makes_count.get(make, 0) + 1
        
        # Group by decade
        decade = year[:3] + "0s"
        years_count[decade] = years_count.get(decade, 0) + 1
    
    # Sort by popularity
    sorted_makes = sorted(makes_count.items(), key=lambda x: x[1], reverse=True)
    sorted_years = sorted(years_count.items(), key=lambda x: x[0])
    
    # Add top makes
    makes_list = "\n".join([f"{make}: {count}" for make, count in sorted_makes[:10]])
    embed.add_field(
        name="Top Manufacturers",
        value=makes_list if makes_list else "None yet",
        inline=True
    )
    
    # Add years breakdown
    years_list = "\n".join([f"{decade}: {count}" for decade, count in sorted_years])
    embed.add_field(
        name="Vehicles by Decade",
        value=years_list if years_list else "None yet",
        inline=True
    )
    
    # Add total count
    embed.add_field(
        name="Total",
        value=f"{len(vehicle_roles)} vehicles across {len(makes_count)} manufacturers",
        inline=False
    )
    
    await ctx.send(embed=embed)

#------------------------------------------------
# Admin Commands
#------------------------------------------------

@bot.command(name='bikerole-setup')
@commands.has_permissions(administrator=True)
async def setup_bikerole(ctx):
    """Initial setup for BikeRole in your server"""
    server_id = str(ctx.guild.id)
    
    # Create default settings for this server if they don't exist
    if server_id not in server_settings:
        server_settings[server_id] = {
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
    
    embed.add_field(
        name="Available Vehicles", 
        value=(f"🏍️ Motorcycles: {len(vehicle_db.vehicles['motorcycle']['makes'])} makes, "
               f"{len(vehicle_db.vehicles['motorcycle']['models'])} models\n"
               f"🚲 Bicycles: {len(vehicle_db.vehicles['bicycle']['makes'])} makes, "
               f"{len(vehicle_db.vehicles['bicycle']['models'])} models"),
        inline=False
    )
    
    embed.add_field(
        name="Commands for Members", 
        value="`!bike`, `!bicycle`, `!addbike`, `!addbicycle`, `!mybikes`, etc.",
        inline=False
    )
    
    embed.add_field(
        name="Admin Commands", 
        value="`!bikerole-config`, `!vehiclestats`",
        inline=False
    )
                    
    await ctx.send(embed=embed)

@bot.command(name='bikerole-config')
@commands.has_permissions(administrator=True)
async def config_bikerole(ctx, setting=None, *, value=None):
    """Configure BikeRole for your server"""
    server_id = str(ctx.guild.id)
    
    # Create settings if they don't exist
    if server_id not in server_settings:
        await ctx.send("Please run `!bikerole-setup` first.")
        return
    
    # If no arguments, show current settings
    if setting is None:
        embed = discord.Embed(
            title="BikeRole Configuration",
            description="Current settings for this server:",
            color=discord.Color.blue()
        )
        
        for k, v in server_settings[server_id].items():
            embed.add_field(name=k, value=str(v), inline=False)
            
        embed.add_field(
            name="How to Change",
            value="Use `!bikerole-config <setting> <value>`",
            inline=False
        )
        
        await ctx.send(embed=embed)
        return
        
    # Update the specific setting
    if setting in server_settings[server_id]:
        if setting == 'role_color':
            # Convert string to color
            try:
                color = discord.Color(int(value.strip('#'), 16))
                server_settings[server_id][setting] = color.value
            except:
                await ctx.send("Invalid color. Use hex format like `#FF0000`.")
                return
        elif setting == 'auto_approve':
            server_settings[server_id][setting] = value.lower() == 'true'
        elif setting == 'max_bikes_per_user':
            try:
                server_settings[server_id][setting] = int(value)
            except:
                await ctx.send("Invalid number. Please use a number like `5`.")
                return
        elif setting == 'restricted_categories':
            # Comma separated list of categories to restrict
            server_settings[server_id][setting] = [c.strip() for c in value.split(',')]
        else:
            server_settings[server_id][setting] = value
            
        await ctx.send(f"Updated `{setting}` to `{value}`")
    else:
        await ctx.send(f"Unknown setting: `{setting}`")

#------------------------------------------------
# Helper Functions (used by commands)
#------------------------------------------------

async def vehicle_search(ctx, query, vehicle_type):
    """Generic vehicle search function"""
    vehicles = await vehicle_helpers['search_vehicles'](ctx, query, vehicle_type)
    
    if not vehicles:
        vehicle_name = "motorcycles" if vehicle_type == "motorcycle" else "bicycles"
        await ctx.send(f"No {vehicle_name} found for that query. Try a different search term.")
        return
        
    # Create a nice embed for the results
    embed = discord.Embed(
        title=f"{vehicle_type.capitalize()} Search Results",
        description=f"Found {len(vehicles)} {vehicle_type}s for '{query}'",
        color=discord.Color.blue()
    )
    
    # Show first 5 results with details
    for i, vehicle in enumerate(vehicles[:5]):
        # Different fields based on vehicle type
        if vehicle_type == 'motorcycle':
            details = f"Category: {vehicle['category']}\nEngine: {vehicle['engine']}"
        else:  # bicycle
            details = f"Category: {vehicle['category']}\nFrame: {vehicle['frame']}"
        
        # Add package if available
        if vehicle['package']:
            command = f"!add{vehicle_type} {vehicle['make']} {vehicle['model']} {vehicle['year']} {vehicle['package']}"
            details += f"\nPackage: {vehicle['package']}"
            name = f"{vehicle['year']} {vehicle['make']} {vehicle['model']} {vehicle['package']}"
        else:
            command = f"!add{vehicle_type} {vehicle['make']} {vehicle['model']} {vehicle['year']}"
            name = f"{vehicle['year']} {vehicle['make']} {vehicle['model']}"
            
        embed.add_field(
            name=name,
            value=f"{details}\nUse `{command}` to add to your profile",
            inline=False
        )
    
    # If there are more results, mention it
    if len(vehicles) > 5:
        embed.set_footer(text=f"Showing 5 of {len(vehicles)} results. Refine your search to see other matches.")
    
    await ctx.send(embed=embed)

async def add_vehicle_role(ctx, make, model, year=None, package=None, vehicle_type='motorcycle'):
    """Generic function to add a vehicle role to a user"""
    role_name = await vehicle_helpers['fetch_vehicle_role'](ctx, make, model, year, package, vehicle_type)
    
    if not role_name:
        vehicle_name = "motorcycle" if vehicle_type == "motorcycle" else "bicycle"
        await ctx.send(f"Couldn't find a {vehicle_name} matching {make} {model} {year if year else ''} {package if package else ''}. Try checking the exact spelling with `!{vehicle_type} {make} {model}`")
        return
    
    # Check if the role already exists
    role = discord.utils.get(ctx.guild.roles, name=role_name)
    if role is None:
        # Create the role with better formatting based on vehicle type and category
        vehicles = []
        if year and package:
            vehicles = vehicle_db.find_by_make_model_year_package(make, model, year, package, vehicle_type)
        elif year:
            vehicles = vehicle_db.find_by_make_model_year_package(make, model, year, None, vehicle_type)
        else:
            vehicles = vehicle_db.find_by_make_and_model(make, model, vehicle_type)
        
        if vehicles:
            vehicle = vehicles[0]
            # Choose color based on category
            color = discord.Color.blue()  # Default color
            category = vehicle['category'].lower() if vehicle['category'] else ""
            
            if vehicle_type == 'motorcycle':
                # Motorcycle category colors
                if "sport" in category:
                    color = discord.Color.red()
                elif "touring" in category:
                    color = discord.Color.green()
                elif "custom" in category or "cruiser" in category:
                    color = discord.Color.purple()
                elif "enduro" in category or "off" in category:
                    color = discord.Color.dark_gold()
            else:
                # Bicycle category colors
                if "road" in category:
                    color = discord.Color.red()
                elif "mtb" in category or "mountain" in category:
                    color = discord.Color.dark_gold()
                elif "gravel" in category:
                    color = discord.Color.dark_orange()
                elif "hybrid" in category:
                    color = discord.Color.green()
            
            role = await ctx.guild.create_role(name=role_name, color=color)
        else:
            role = await ctx.guild.create_role(name=role_name)
    
    # Check if user already has this role
    if role in ctx.author.roles:
        await ctx.send(f"You already have the {role_name} role!")
        return
    
    # Check if user has reached maximum allowed bikes (if set)
    server_id = str(ctx.guild.id)
    if server_id in server_settings:
        max_bikes = server_settings[server_id].get('max_bikes_per_user', 0)
        if max_bikes > 0:
            # Count user's current vehicle roles
            vehicle_count = 0
            for user_role in ctx.author.roles:
                parts = user_role.name.split()
                if len(parts) >= 3 and parts[0].isdigit() and len(parts[0]) == 4:
                    vehicle_count += 1
            
            if vehicle_count >= max_bikes:
                await ctx.send(f"You've reached the maximum of {max_bikes} vehicles allowed per user on this server. "
                              f"Please remove an existing vehicle role before adding a new one.")
                return
        
    # Add the role to the user
    await ctx.author.add_roles(role)
    
    vehicle_emoji = "🏍️" if vehicle_type == "motorcycle" else "🚲"
    embed = discord.Embed(
        title=f"{vehicle_emoji} New {vehicle_type.capitalize()} Added!",
        description=f"Added the {role_name} to {ctx.author.mention}'s profile!",
        color=role.color
    )
    embed.set_footer(text=f"Use !my{vehicle_type}s to see all your {vehicle_type}s")
    
    await ctx.send(embed=embed)

async def list_user_vehicles(ctx, member=None, vehicle_type='motorcycle'):
    """Generic function to list a user's vehicles"""
    if member is None:
        member = ctx.author
    
    # Get all roles that could be vehicles
    vehicle_roles = []
    for role in member.roles:
        # Check if role name has year-like format (4 digits)
        parts = role.name.split()
        if len(parts) >= 3 and parts[0].isdigit() and len(parts[0]) == 4:
            # This is an approximation - in a real system we'd have a better way to
            # differentiate between motorcycle and bicycle roles
            vehicle_roles.append(role)
    
    if not vehicle_roles:
        if member == ctx.author:
            await ctx.send(f"You don't have any {vehicle_type}s in your profile yet. Use `!add{vehicle_type}` to add one!")
        else:
            await ctx.send(f"{member.display_name} doesn't have any {vehicle_type}s in their profile.")
        return
    
    vehicle_emoji = "🏍️" if vehicle_type == "motorcycle" else "🚲"
    embed = discord.Embed(
        title=f"{vehicle_emoji} {member.display_name}'s {vehicle_type.capitalize()}s",
        description=f"Showing {len(vehicle_roles)} {vehicle_type}s",
        color=discord.Color.blue()
    )
    
    # Group by manufacturer
    vehicles_by_make = {}
    for role in vehicle_roles:
        parts = role.name.split()
        year = parts[0]
        make = parts[1]
        
        # For roles with package information (4+ parts)
        if len(parts) >= 4:
            # Last part is the package
            package = parts[-1]
            # Everything in between is the model
            model = " ".join(parts[2:-1])
            display_text = f"{year} {model} {package}"
        else:
            # No package, everything after make is model
            model = " ".join(parts[2:])
            display_text = f"{year} {model}"
        
        if make not in vehicles_by_make:
            vehicles_by_make[make] = []
        
        vehicles_by_make[make].append(display_text)
    
    # Add fields for each manufacturer
    for make, models in vehicles_by_make.items():
        models_text = "\n".join(sorted(models))
        embed.add_field(name=make, value=models_text, inline=False)
    
    embed.set_footer(text=f"Use !add{vehicle_type} to add more {vehicle_type}s")
    
    await ctx.send(embed=embed)

async def list_makes(ctx, vehicle_type='motorcycle'):
    """Generic function to list all manufacturers of a vehicle type"""
    makes = await vehicle_helpers['get_vehicle_makes'](ctx, vehicle_type)
    
    if not makes:
        await ctx.send(f"No {vehicle_type} manufacturers found in the database.")
        return
    
    # Show an interactive paginated list
    makes_per_page = 20
    pages = [makes[i:i+makes_per_page] for i in range(0, len(makes), makes_per_page)]
    
    current_page = 0
    
    vehicle_emoji = "🏍️" if vehicle_type == "motorcycle" else "🚲"
    embed = discord.Embed(
        title=f"{vehicle_emoji} Available {vehicle_type.capitalize()} Manufacturers",
        description=f"Page {current_page+1}/{len(pages)}",
        color=discord.Color.blue()
    )
    
    embed.add_field(
        name=f"Makes ({current_page*makes_per_page+1}-{min((current_page+1)*makes_per_page, len(makes))})",
        value="\n".join(pages[current_page]),
        inline=False
    )
    
    # Different command based on vehicle type
    model_command = "!models" if vehicle_type == "motorcycle" else f"!{vehicle_type}models"
    embed.set_footer(text=f"Use {model_command} <make> to see available models")
    
    message = await ctx.send(embed=embed)
    
    # Add reactions for navigation if more than one page
    if len(pages) > 1:
        await message.add_reaction("⬅️")
        await message.add_reaction("➡️")
        
        def check(reaction, user):
            return user == ctx.author and str(reaction.emoji) in ["⬅️", "➡️"] and reaction.message.id == message.id
        
        while True:
            try:
                reaction, user = await bot.wait_for("reaction_add", timeout=60.0, check=check)
                
                if str(reaction.emoji) == "➡️" and current_page < len(pages) - 1:
                    current_page += 1
                elif str(reaction.emoji) == "⬅️" and current_page > 0:
                    current_page -= 1
                
                embed = discord.Embed(
                    title=f"{vehicle_emoji} Available {vehicle_type.capitalize()} Manufacturers",
                    description=f"Page {current_page+1}/{len(pages)}",
                    color=discord.Color.blue()
                )
                
                embed.add_field(
                    name=f"Makes ({current_page*makes_per_page+1}-{min((current_page+1)*makes_per_page, len(makes))})",
                    value="\n".join(pages[current_page]),
                    inline=False
                )
                
                embed.set_footer(text=f"Use {model_command} <make> to see available models")
                
                await message.edit(embed=embed)
                await message.remove_reaction(reaction.emoji, user)
                
            except asyncio.TimeoutError:
                break

async def list_models(ctx, make, vehicle_type='motorcycle'):
    """Generic function to list models for a manufacturer"""
    models = await vehicle_helpers['get_vehicle_models'](ctx, make, vehicle_type)
    
    if not models:
        await ctx.send(f"No {vehicle_type} models found for {make}.")
        return
    
    # Show an interactive paginated list for many models
    models_per_page = 15
    pages = [models[i:i+models_per_page] for i in range(0, len(models), models_per_page)]
    
    current_page = 0
    
    vehicle_emoji = "🏍️" if vehicle_type == "motorcycle" else "🚲"
    embed = discord.Embed(
        title=f"{vehicle_emoji} {make} {vehicle_type.capitalize()} Models",
        description=f"Page {current_page+1}/{len(pages)}",
        color=discord.Color.blue()
    )
    
    embed.add_field(
        name=f"Models ({current_page*models_per_page+1}-{min((current_page+1)*models_per_page, len(models))})",
        value="\n".join(pages[current_page]),
        inline=False
    )
    
    # Different command based on vehicle type
    packages_command = "!packages" if vehicle_type == "motorcycle" else f"!{vehicle_type}packages"
    embed.set_footer(text=f"Use {packages_command} {make} <model> to see packages")
    
    message = await ctx.send(embed=embed)
    
    # Add reactions for pagination if needed
    if len(pages) > 1:
        await message.add_reaction("⬅️")
        await message.add_reaction("➡️")
        
        def check(reaction, user):
            return user == ctx.author and str(reaction.emoji) in ["⬅️", "➡️"] and reaction.message.id == message.id
        
        while True:
            try:
                reaction, user = await bot.wait_for("reaction_add", timeout=60.0, check=check)
                
                if str(reaction.emoji) == "➡️" and current_page < len(pages) - 1:
                    current_page += 1
                