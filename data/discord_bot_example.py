import os
import discord
from discord.ext import commands
from bike_lookup import BikeDatabase, create_discord_bot_role_helper

# Initialize the database and the helper functions
bike_helpers = create_discord_bot_role_helper()

# Set up the Discord bot
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'{bot.user.name} has connected to Discord!')

@bot.command(name='bike')
async def bike_search(ctx, *, query):
    """Search for a bike by name, make, model, or year."""
    bikes = await bike_helpers['search_bikes'](ctx, query)
    
    if not bikes:
        await ctx.send("No motorcycles found for that query.")
        return
        
    if len(bikes) > 10:
        await ctx.send(f"Found {len(bikes)} motorcycles. Showing the first 10:")
        bikes = bikes[:10]
    else:
        await ctx.send(f"Found {len(bikes)} motorcycles:")
    
    for bike in bikes:
        await ctx.send(f"{bike['year']} {bike['make']} {bike['model']} - {bike['category']} ({bike['engine']})")

@bot.command(name='makes')
async def list_makes(ctx):
    """List all available motorcycle makes."""
    makes = await bike_helpers['get_bike_makes'](ctx)
    
    # If there are too many makes, we'll paginate
    if len(makes) > 25:
        chunks = [makes[i:i+25] for i in range(0, len(makes), 25)]
        for i, chunk in enumerate(chunks):
            await ctx.send(f"Makes (page {i+1}/{len(chunks)}):\n" + "\n".join(chunk))
    else:
        await ctx.send("Available motorcycle makes:\n" + "\n".join(makes))

@bot.command(name='models')
async def list_models(ctx, *, make):
    """List all models for a specific make."""
    models = await bike_helpers['get_bike_models'](ctx, make)
    
    if not models:
        await ctx.send(f"No models found for make: {make}")
        return
    
    # If there are too many models, we'll paginate
    if len(models) > 25:
        chunks = [models[i:i+25] for i in range(0, len(models), 25)]
        for i, chunk in enumerate(chunks):
            await ctx.send(f"Models for {make} (page {i+1}/{len(chunks)}):\n" + "\n".join(chunk))
    else:
        await ctx.send(f"Models for {make}:\n" + "\n".join(models))

@bot.command(name='years')
async def list_years(ctx, make, *, model):
    """List all years for a specific make and model."""
    years = await bike_helpers['get_bike_years'](ctx, make, model)
    
    if not years:
        await ctx.send(f"No years found for {make} {model}")
        return
        
    await ctx.send(f"Years available for {make} {model}:\n" + ", ".join(years))

@bot.command(name='addbike')
async def add_bike_role(ctx, make, model, year=None):
    """Add a role for a specific bike to the user."""
    role_name = await bike_helpers['fetch_bike_role'](ctx, make, model, year)
    
    if not role_name:
        await ctx.send(f"Couldn't find a motorcycle matching {make} {model} {year if year else ''}")
        return
    
    # Check if role exists, create it if it doesn't
    role = discord.utils.get(ctx.guild.roles, name=role_name)
    if role is None:
        role = await ctx.guild.create_role(name=role_name)
    
    # Add the role to the user
    await ctx.author.add_roles(role)
    await ctx.send(f"Added the {role_name} role to {ctx.author.mention}")

@bot.command(name='removebike')
async def remove_bike_role(ctx, make, model, year=None):
    """Remove a bike role from the user."""
    role_name = await bike_helpers['fetch_bike_role'](ctx, make, model, year)
    
    if not role_name:
        await ctx.send(f"Couldn't find a motorcycle matching {make} {model} {year if year else ''}")
        return
    
    role = discord.utils.get(ctx.guild.roles, name=role_name)
    if role is None:
        await ctx.send(f"No role found for {role_name}")
        return
    
    await ctx.author.remove_roles(role)
    await ctx.send(f"Removed the {role_name} role from {ctx.author.mention}")

@bot.command(name='mybikes')
async def list_user_bikes(ctx, member: discord.Member = None):
    """List all bike roles a user has."""
    if member is None:
        member = ctx.author
    
    # Get all roles that could be bikes (this is a simple approach)
    bike_roles = []
    for role in member.roles:
        # Check if role name has year-like format (4 digits)
        if any(part.isdigit() and len(part) == 4 for part in role.name.split()):
            bike_roles.append(role.name)
    
    if not bike_roles:
        await ctx.send(f"{member.display_name} doesn't have any bike roles.")
        return
    
    await ctx.send(f"{member.display_name}'s bikes:\n" + "\n".join(bike_roles))

# Run the bot (replace TOKEN with your actual Discord bot token)
if __name__ == "__main__":
    token = os.environ.get("DISCORD_BOT_TOKEN")
    if token:
        bot.run(token)
    else:
        print("Please set the DISCORD_BOT_TOKEN environment variable.")
