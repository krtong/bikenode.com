# This file contains commands for bike-related operations (e.g., searching and adding bikes).
# Update this file to modify or add bike-related commands.
# Do not create new files for bike commands; update this one or add new functions here.

import discord
from discord.ext import commands
import json
from pathlib import Path
import logging
import asyncio
import shlex
from datetime import datetime
from utils.helpers import parse_bike_string, format_bike_name
from utils.db_manager import BikeDatabase
from discord import ui
import math
import pandas as pd
import os
import re
from utils.data_manager import BikeDataManager
from typing import Dict, Any, List, Optional

logger = logging.getLogger('BikeRoleBot')

# Get the absolute path to the CSV file
DATA_PATH = Path(os.path.dirname(os.path.abspath(__file__))) / '../data/bikedata/motorcycles.csv'

class BikeCommands(commands.Cog):
    """Commands for bike information and management"""
    def __init__(self, bot):
        self.bot = bot
        self.api = bot.bikenode_api
        # Initialize the bike database connection
        self.db = BikeDatabase()
        self.bike_data = None
        self.load_bike_data()

    def load_bike_data(self):
        """Load motorcycle data from CSV file"""
        try:
            from utils.data_manager import BikeDataManager
            bikes = BikeDataManager.load_csv_data()
            if bikes:
                # Convert to DataFrame if needed
                self.bike_data = pd.DataFrame(bikes)
                print(f"Loaded {len(self.bike_data)} motorcycle records")
            else:
                print("No motorcycle data loaded")
                self.bike_data = pd.DataFrame()
        except Exception as e:
            print(f"Error loading motorcycle data: {e}")
            self.bike_data = pd.DataFrame()

    @commands.command(name="bike")
    async def bike_info(self, ctx, *, search_term: str = None):
        """Get information about a specific bike by name"""
        if not self.db.connect():
            await ctx.send("❌ Failed to connect to the motorcycle database.")
            return
        try:
            cursor = self.db.connection.cursor()
            # Use wildcards for flexible matching
            cursor.execute("""
                SELECT year, make, model, package, category, engine
                FROM motorcycles 
                WHERE make || ' ' || model LIKE ? 
                ORDER BY year DESC LIMIT 5
            """, (f"%{search_term}%",))
            results = cursor.fetchall()
            if not results:
                await ctx.send(f"No motorcycle found matching '{search_term}'")
                return
            embed = discord.Embed(
                title=f"Motorcycle Search Results for '{search_term}'",
                color=discord.Color.blue()
            )
            for bike in results:
                bike_title = f"{bike['year']} {bike['make']} {bike['model']}" + (f" ({bike['package']})" if bike['package'] else "")
                details = []
                if bike['category']:
                    details.append(f"Category: {bike['category']}")
                if bike['engine']:
                    details.append(f"Engine: {bike['engine']}")
                embed.add_field(
                    name=bike_title,
                    value="\n".join(details) if details else "No additional details available",
                    inline=False
                )
            embed.set_footer(text="Data from BikeRole motorcycle database")
            await ctx.send(embed=embed)
        except Exception as e:
            logger.exception("Database error in bike_info command")
            await ctx.send("An error occurred while retrieving motorcycle info. Please try again later.")
        finally:
            self.db.close()

    @commands.command(name="link")
    async def link_account(self, ctx):
        """Link your Discord account to BikeNode"""
        try:
            # Check if already linked
            user_id = await self.api.get_user_id(str(ctx.author.id))
            if user_id:
                await ctx.send("Your account is already linked to BikeNode!")
                return
                
            # Request linking code
            result = await self.api.request_link(str(ctx.author.id))
            if not result or "code" not in result:
                await ctx.send("Failed to generate linking code. Please try again later.")
                return
                
            # Send linking instructions via DM
            try:
                dm_embed = discord.Embed(
                    title="Link Your BikeNode Account",
                    description=f"Visit https://bikenode.com/link and enter this code: `{result['code']}`\n\nThis code will expire in 10 minutes.",
                    color=discord.Color.blue()
                )
                await ctx.author.send(embed=dm_embed)
                await ctx.send("Check your DMs for linking instructions!")
            except discord.Forbidden:
                await ctx.send(f"I couldn't send you a DM. Please enable DMs from server members and try again.")
                
        except Exception as e:
            logger.error(f"Error in link_account: {e}")
            await ctx.send("An error occurred while generating your linking code. Please try again later.")

    @commands.command(name="addbike")
    async def add_bike(self, ctx, *, bike_string: str = None):
        """Add a motorcycle to your BikeNode profile
        
        Usage: !addbike 2020 Honda CBR1000RR [SP]
        """
        if not bike_string:
            await ctx.send("Please provide motorcycle details: `!addbike YEAR MAKE MODEL [PACKAGE]`\nExample: `!addbike 2020 Honda CBR1000RR` or `!addbike 2022 Ducati Panigale V4 (S)`")
            return
            
        # Check if account is linked
        user_id = await self.api.get_user_id(str(ctx.author.id))
        if not user_id:
            await ctx.send("Your Discord account is not linked to BikeNode! Use `!link` to link your account first.")
            return
            
        # Parse bike details
        try:
            # Try to handle quoted arguments
            try:
                parts = shlex.split(bike_string)
                year = parts[0]
                make = parts[1]
                if len(parts) < 3:
                    await ctx.send("Please provide at least YEAR, MAKE, and MODEL.")
                    return
                
                if len(parts) > 3 and parts[3].startswith("(") and parts[3].endswith(")"):
                    model = parts[2]
                    package = parts[3][1:-1]  # Remove parentheses
                else:
                    model = " ".join(parts[2:])
                    package = None
            except ValueError:
                # Fallback to simpler parsing if quotes cause issues
                bike_data = parse_bike_string(bike_string)
                if not bike_data:
                    await ctx.send("Invalid format. Please use: `!addbike YEAR MAKE MODEL [PACKAGE]`")
                    return
                year = bike_data["year"]
                make = bike_data["make"]
                model = bike_data["model"]
                package = bike_data["package"]
                
            # Validate year
            if not year.isdigit() or int(year) < 1885 or int(year) > 2030:
                await ctx.send("Invalid year. Please provide a year between 1885 and 2030.")
                return
                
            # Ask for purchase date
            await ctx.send("When did you purchase this motorcycle? (format: YYYY-MM-DD, or type 'today')")
            
            def check_author(m):
                return m.author == ctx.author and m.channel == ctx.channel
                
            try:
                msg = await self.bot.wait_for('message', check=check_author, timeout=60.0)
                purchase_date = msg.content.strip()
                
                if purchase_date.lower() == 'today':
                    purchase_date = datetime.now().strftime("%Y-%m-%d")
                else:
                    # Validate date format
                    try:
                        datetime.strptime(purchase_date, "%Y-%m-%d")
                    except ValueError:
                        await ctx.send("Invalid date format. Please use YYYY-MM-DD.")
                        return
                
                # Send data to API
                bike_data = {
                    "year": year,
                    "make": make,
                    "model": model,
                    "package": package,
                    "purchase_date": purchase_date
                }
                
                result = await self.api.add_bike(user_id, bike_data)
                
                if result and not result.get("error"):
                    await ctx.send(f"🏍️ Added to your BikeNode profile: {year} {make} {model} {f'({package})' if package else ''}")
                    
                    # Trigger role update in all servers
                    await self.update_user_roles(ctx.author)
                else:
                    error_msg = result.get("message", "Unknown error")
                    await ctx.send(f"Failed to add motorcycle: {error_msg}")
            
            except asyncio.TimeoutError:
                await ctx.send("Timed out waiting for a response.")
                
        except Exception as e:
            logger.error(f"Error adding bike: {e}")
            await ctx.send("An error occurred while processing your request.")
    
    @commands.command(name="removebike")
    async def remove_bike(self, ctx):
        """Remove a motorcycle from your BikeNode profile"""
        # Check if account is linked
        user_id = await self.api.get_user_id(str(ctx.author.id))
        if not user_id:
            await ctx.send("Your Discord account is not linked to BikeNode! Use `!link` to link your account first.")
            return
            
        # Get user's bikes
        bikes = await self.api.get_user_bikes(user_id)
        if not bikes:
            await ctx.send("You don't have any motorcycles in your BikeNode profile.")
            return
            
        # Create list of bikes for selection
        bike_list = ""
        for i, bike in enumerate(bikes, 1):
            bike_list += f"{i}. {format_bike_name(bike)}\n"
            
        embed = discord.Embed(
            title="Your Motorcycles",
            description="Reply with the number of the motorcycle you want to remove:",
            color=discord.Color.blue()
        )
        embed.add_field(name="Motorcycles", value=bike_list)
        await ctx.send(embed=embed)
        
        def check_author(m):
            return m.author == ctx.author and m.channel == ctx.channel
            
        try:
            # Wait for selection
            msg = await self.bot.wait_for('message', check=check_author, timeout=60.0)
            try:
                selection = int(msg.content.strip())
                if selection < 1 or selection > len(bikes):
                    await ctx.send("Invalid selection. Please run the command again.")
                    return
                    
                selected_bike = bikes[selection-1]
                
                # Ask for removal reason
                reasons_embed = discord.Embed(
                    title=f"Why are you removing this motorcycle?",
                    description=f"Selected: {format_bike_name(selected_bike)}\n\nReply with one of the following:\n1. Sold\n2. Stolen\n3. Totaled\n4. Other",
                    color=discord.Color.blue()
                )
                await ctx.send(embed=reasons_embed)
                
                msg = await self.bot.wait_for('message', check=check_author, timeout=60.0)
                reason_num = msg.content.strip()
                
                reasons = {
                    "1": "sold",
                    "2": "stolen", 
                    "3": "totaled",
                    "4": "other"
                }
                
                if reason_num not in reasons:
                    await ctx.send("Invalid reason. Please run the command again.")
                    return
                    
                reason = reasons[reason_num]
                
                # Ask for date
                await ctx.send("When was this motorcycle removed? (format: YYYY-MM-DD, or type 'today')")
                msg = await self.bot.wait_for('message', check=check_author, timeout=60.0)
                removal_date = msg.content.strip()
                
                if removal_date.lower() == 'today':
                    removal_date = datetime.now().strftime("%Y-%m-%d")
                else:
                    # Validate date format
                    try:
                        datetime.strptime(removal_date, "%Y-%m-%d")
                    except ValueError:
                        await ctx.send("Invalid date format. Please use YYYY-MM-DD.")
                        return
                
                # Send data to API
                result = await self.api.remove_bike(user_id, selected_bike["id"], reason, removal_date)
                
                if result and not result.get("error"):
                    await ctx.send(f"🏍️ Removed from your BikeNode profile: {format_bike_name(selected_bike)}")
                    
                    # Trigger role update in all servers
                    await self.update_user_roles(ctx.author)
                else:
                    error_msg = result.get("message", "Unknown error")
                    await ctx.send(f"Failed to remove motorcycle: {error_msg}")
            
            except asyncio.TimeoutError:
                await ctx.send("Timed out waiting for a response.")
                
        except Exception as e:
            logger.error(f"Error removing bike: {e}")
            await ctx.send("An error occurred while processing your request.")

    @commands.command(name="findmoto")
    async def interactive_bike_search(self, ctx):
        """Search for a motorcycle using interactive menus"""
        try:
            # Connect to the database
            if not self.db.connect():
                await ctx.send("❌ Failed to connect to the motorcycle database.")
                return
                
            # Get distinct years available in the database
            years = await self.get_years_from_db()
            if not years:
                await ctx.send("❌ No motorcycle data found in the database.")
                return
            
            # Create the year selection menu
            view = YearSelectionView(self, ctx)
            await ctx.send("Select a motorcycle year:", view=view)
            
        except Exception as e:
            logger.error(f"Error in interactive bike search: {e}")
            await ctx.send("An error occurred while setting up the motorcycle selection menu.")
            if self.db.connection:
                self.db.close()

    async def get_years_from_db(self):
        """Get list of years from database"""
        try:
            cursor = self.db.connection.cursor()
            cursor.execute("SELECT DISTINCT year FROM motorcycles ORDER BY year DESC")
            results = cursor.fetchall()
            return [row['year'] for row in results]
        except Exception as e:
            logger.exception("Database error in get_years_from_db")
            return []

    async def get_models_by_year_make(self, year, make):
        """Get models for a specific year and make"""
        try:
            cursor = self.db.connection.cursor()
            cursor.execute(
                "SELECT DISTINCT model FROM motorcycles WHERE year = ? AND make = ? ORDER BY model",
                (year, make)
            )
            results = cursor.fetchall()
            return [row['model'] for row in results]
        except Exception as e:
            logger.exception("Database error in get_models_by_year_make")
            return []

    async def get_bikes_by_year_make_model(self, year, make, model):
        """Get specific motorcycles for a year, make, and model"""
        try:
            cursor = self.db.connection.cursor()
            cursor.execute(
                """SELECT id, year, make, model, package, category, engine 
                   FROM motorcycles WHERE year = ? AND make = ? AND model = ? 
                   ORDER BY package""",
                (year, make, model)
            )
            results = cursor.fetchall()
            return [dict(row) for row in results]
        except Exception as e:
            logger.exception("Database error in get_bikes_by_year_make_model")
            return []

    async def update_user_roles(self, user):
        """Update roles for a user across all servers"""
        if hasattr(self.bot, 'role_manager'):
            for guild in self.bot.guilds:
                member = guild.get_member(user.id)
                if member:
                    await self.bot.role_manager.update_user_roles(member)
        else:
            logger.warning("Role manager not initialized, can't update user roles")

    @commands.command(name="bikeyear")
    async def bike_year(self, ctx, year=None):
        """Show motorcycles from a specific year"""
        if not year or not year.isdigit():
            await ctx.send("Please specify a valid year. Example: `!bikeyear 1995`")
            return
            
        year = int(year)
        if not self.bike_data.empty:
            year_df = self.bike_data[self.bike_data['Year'] == year]
            if not year_df.empty:
                count = len(year_df)
                makes_count = len(year_df['Make'].unique())
                await ctx.send(f"**Year {year}**: Found {count} motorcycles from {makes_count} manufacturers.")
                
                # Show some examples
                if count > 10:
                    sample = year_df.sample(10)
                    results = format_bike_results(sample, is_sample=True)
                    await ctx.send(f"Sample of motorcycles from {year}:\n{results}")
                else:
                    results = format_bike_results(year_df)
                    await ctx.send(f"All motorcycles from {year}:\n{results}")
            else:
                await ctx.send(f"No motorcycles found for year {year}.")
        else:
            await ctx.send("Motorcycle data is not available. Please notify an administrator.")

    @commands.command(name="searchbike")
    async def search_bike(self, ctx, *, query):
        """Search for motorcycle by make, model, or year"""
        bikes = BikeDataManager.search_bikes(query)
        
        if not bikes:
            await ctx.send(f"No motorcycles found matching '{query}'")
            return
            
        embed = discord.Embed(
            title=f"Motorcycle Search Results for '{query}'",
            color=discord.Color.blue()
        )
        
        for bike in bikes:
            embed.add_field(
                name=f"{bike['Year']} {bike['Make']} {bike['Model']}",
                value=f"Category: {bike['Category']}\nEngine: {bike['Engine']}",
                inline=False
            )
            
        await ctx.send(embed=embed)
    
    @commands.command(name="bikestats")
    async def bike_stats(self, ctx):
        """Show statistics about the motorcycle database"""
        try:
            bikes = BikeDataManager.load_csv_data()
            total_bikes = len(bikes)
            makes = set(bike['Make'] for bike in bikes)
            years = set(bike['Year'] for bike in bikes)
            
            embed = discord.Embed(
                title="Motorcycle Database Statistics",
                description=f"Total motorcycles: {total_bikes}",
                color=discord.Color.green()
            )
            
            embed.add_field(name="Number of Makes", value=str(len(makes)), inline=True)
            embed.add_field(name="Year Range", value=f"{min(years)} - {max(years)}", inline=True)
            
            await ctx.send(embed=embed)
        except Exception as e:
            await ctx.send(f"Error retrieving bike statistics: {str(e)}")

def format_bike_results(df, is_sample=False):
    """Format motorcycle results for display in Discord"""
    results = []
    
    for _, row in df.iterrows():
        package = f" {row['Package']}" if pd.notna(row['Package']) and row['Package'] else ""
        engine = f" - {row['Engine']}" if pd.notna(row['Engine']) else ""
        category = f" ({row['Category']})" if pd.notna(row['Category']) else ""
        
        bike_str = f"**{row['Year']} {row['Make']} {row['Model']}{package}**{category}{engine}"
        results.append(bike_str)
    
    output = "\n".join(results)
    if is_sample:
        output += "\n\n*This is a sample of results. Please refine your search for more specific results.*"
    
    return output

# Year Selection View
class YearSelectionView(ui.View):
    def __init__(self, bike_commands, ctx):
        super().__init__(timeout=120)
        self.bike_commands = bike_commands
        self.ctx = ctx
        self.page = 0
        self.add_item(YearSelect(bike_commands, self))
        
    async def on_timeout(self):
        try:
            # Disable all items when view times out
            for child in self.children:
                child.disabled = True
            await self.message.edit(content="Selection menu timed out.", view=self)
            # Close the database connection
            self.bike_commands.db.close()
        except Exception as e:
            logger.error(f"Error on timeout: {e}")

class YearSelect(ui.Select):
    def __init__(self, bike_commands, parent_view):
        self.bike_commands = bike_commands
        self.parent_view = parent_view
        
        # Get years from database
        self.years = asyncio.run_coroutine_threadsafe(
            bike_commands.get_years_from_db(), 
            bike_commands.bot.loop
        ).result()
        
        # Handle pagination
        items_per_page = 25  # Discord's max options in a dropdown
        self.total_pages = math.ceil(len(self.years) / items_per_page)
        start_idx = parent_view.page * items_per_page
        end_idx = min(start_idx + items_per_page, len(self.years))
        
        # Create the dropdown options
        options = [
            discord.SelectOption(
                label=str(self.years[i]),
                value=str(self.years[i])
            )
            for i in range(start_idx, end_idx)
        ]
        
        placeholder = f"Select Year (Page {parent_view.page + 1}/{self.total_pages})"
        super().__init__(placeholder=placeholder, min_values=1, max_values=1, options=options)
        
        # Add pagination buttons if needed
        if self.total_pages > 1:
            parent_view.add_item(PaginationButton("Previous", parent_view, -1, parent_view.page <= 0))
            parent_view.add_item(PaginationButton("Next", parent_view, 1, parent_view.page >= self.total_pages - 1))

    async def callback(self, interaction):
        if interaction.user.id != self.parent_view.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Get selected year
        selected_year = int(self.values[0])
        
        # Get makes for the selected year
        makes = self.bike_commands.db.get_makes_by_year(selected_year)
        
        # Create and show make selection view
        make_view = MakeSelectionView(self.bike_commands, self.parent_view.ctx, selected_year)
        await interaction.response.edit_message(
            content=f"Selected Year: {selected_year}\nNow select a manufacturer:",
            view=make_view
        )
        
        # Update the view's message reference
        make_view.message = await interaction.original_response()

# Pagination Button
class PaginationButton(ui.Button):
    def __init__(self, label, view, direction, disabled=False):
        super().__init__(
            style=discord.ButtonStyle.secondary,
            label=label,
            disabled=disabled
        )
        self.view = view
        self.direction = direction  # 1 for next, -1 for previous
    
    async def callback(self, interaction):
        if interaction.user.id != self.view.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Update page
        self.view.page += self.direction
        
        # Create new view with updated page
        new_view = YearSelectionView(self.view.bike_commands, self.view.ctx)
        new_view.page = self.view.page
        
        await interaction.response.edit_message(
            content=f"Select a motorcycle year (Page {new_view.page + 1}):",
            view=new_view
        )
        
        # Update the view's message reference
        new_view.message = await interaction.original_response()

# Make Selection View
class MakeSelectionView(ui.View):
    def __init__(self, bike_commands, ctx, year):
        super().__init__(timeout=120)
        self.bike_commands = bike_commands
        self.ctx = ctx
        self.year = year
        self.page = 0
        self.message = None
        self.add_item(MakeSelect(bike_commands, self))
    
    async def on_timeout(self):
        try:
            for child in self.children:
                child.disabled = True
            await self.message.edit(content="Selection menu timed out.", view=self)
            self.bike_commands.db.close()
        except Exception as e:
            logger.error(f"Error on timeout: {e}")

class MakeSelect(ui.Select):
    def __init__(self, bike_commands, parent_view):
        self.bike_commands = bike_commands
        self.parent_view = parent_view
        
        # Get makes from database for selected year
        self.makes = bike_commands.db.get_makes_by_year(parent_view.year)
        
        # Handle pagination
        items_per_page = 25
        self.total_pages = math.ceil(len(self.makes) / items_per_page)
        start_idx = parent_view.page * items_per_page
        end_idx = min(start_idx + items_per_page, len(self.makes))
        
        # Create options
        options = [
            discord.SelectOption(
                label=self.makes[i],
                value=self.makes[i]
            )
            for i in range(start_idx, end_idx)
        ]
        
        placeholder = f"Select Make (Page {parent_view.page + 1}/{self.total_pages})"
        super().__init__(placeholder=placeholder, min_values=1, max_values=1, options=options)
        
        # Add pagination if needed
        if self.total_pages > 1:
            parent_view.add_item(MakePaginationButton("Previous", parent_view, -1, parent_view.page <= 0))
            parent_view.add_item(MakePaginationButton("Next", parent_view, 1, parent_view.page >= self.total_pages - 1))
        
        # Add back button
        parent_view.add_item(BackToYearsButton(bike_commands, parent_view.ctx))

    async def callback(self, interaction):
        if interaction.user.id != self.parent_view.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Get selected make
        selected_make = self.values[0]
        
        # Get models for the selected year and make
        models = await self.bike_commands.get_models_by_year_make(self.parent_view.year, selected_make)
        
        # Create and show model selection view
        model_view = ModelSelectionView(
            self.bike_commands,
            self.parent_view.ctx,
            self.parent_view.year,
            selected_make
        )
        
        await interaction.response.edit_message(
            content=f"Selected: {self.parent_view.year} {selected_make}\nNow select a model:",
            view=model_view
        )
        
        # Update message reference
        model_view.message = await interaction.original_response()

# Make Pagination Button
class MakePaginationButton(ui.Button):
    def __init__(self, label, view, direction, disabled=False):
        super().__init__(
            style=discord.ButtonStyle.secondary,
            label=label,
            disabled=disabled
        )
        self.view = view
        self.direction = direction
    
    async def callback(self, interaction):
        if interaction.user.id != self.view.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Update page
        self.view.page += self.direction
        
        # Create new view with updated page
        new_view = MakeSelectionView(
            self.view.bike_commands,
            self.view.ctx,
            self.view.year
        )
        new_view.page = self.view.page
        
        await interaction.response.edit_message(
            content=f"Selected Year: {self.view.year}\nNow select a manufacturer (Page {new_view.page + 1}):",
            view=new_view
        )
        
        # Update message reference
        new_view.message = await interaction.original_response()

# Back Button to Years
class BackToYearsButton(ui.Button):
    def __init__(self, bike_commands, ctx):
        super().__init__(
            style=discord.ButtonStyle.primary,
            label="Back to Years"
        )
        self.bike_commands = bike_commands
        self.ctx = ctx
    
    async def callback(self, interaction):
        if interaction.user.id != self.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Create new year selection view
        new_view = YearSelectionView(self.bike_commands, self.ctx)
        
        await interaction.response.edit_message(
            content="Select a motorcycle year:",
            view=new_view
        )
        
        # Update message reference
        new_view.message = await interaction.original_response()

# Model Selection View
class ModelSelectionView(ui.View):
    def __init__(self, bike_commands, ctx, year, make):
        super().__init__(timeout=120)
        self.bike_commands = bike_commands
        self.ctx = ctx
        self.year = year
        self.make = make
        self.page = 0
        self.message = None
        self.add_item(ModelSelect(bike_commands, self))
    
    async def on_timeout(self):
        try:
            for child in self.children:
                child.disabled = True
            await self.message.edit(content="Selection menu timed out.", view=self)
            self.bike_commands.db.close()
        except Exception as e:
            logger.error(f"Error on timeout: {e}")

class ModelSelect(ui.Select):
    def __init__(self, bike_commands, parent_view):
        self.bike_commands = bike_commands
        self.parent_view = parent_view
        
        # Get models from database
        self.models = asyncio.run_coroutine_threadsafe(
            bike_commands.get_models_by_year_make(parent_view.year, parent_view.make),
            bike_commands.bot.loop
        ).result()
        
        # Handle pagination
        items_per_page = 25
        self.total_pages = math.ceil(len(self.models) / items_per_page)
        start_idx = parent_view.page * items_per_page
        end_idx = min(start_idx + items_per_page, len(self.models))
        
        # Create options
        options = [
            discord.SelectOption(
                label=self.models[i][:100],  # Discord limits option labels to 100 chars
                value=str(i)
            )
            for i in range(start_idx, end_idx)
        ]
        
        placeholder = f"Select Model (Page {parent_view.page + 1}/{self.total_pages})"
        super().__init__(placeholder=placeholder, min_values=1, max_values=1, options=options)
        
        # Add pagination if needed
        if self.total_pages > 1:
            parent_view.add_item(ModelPaginationButton("Previous", parent_view, -1, parent_view.page <= 0))
            parent_view.add_item(ModelPaginationButton("Next", parent_view, 1, parent_view.page >= self.total_pages - 1))
        
        # Add back button
        parent_view.add_item(BackToMakesButton(bike_commands, parent_view.ctx, parent_view.year))

    async def callback(self, interaction):
        if interaction.user.id != self.parent_view.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Get selected model index and value
        selected_idx = int(self.values[0])
        model_idx = selected_idx + (self.parent_view.page * 25)
        selected_model = self.models[model_idx]
        
        # Get specific bikes for the selection
        bikes = await self.bike_commands.get_bikes_by_year_make_model(
            self.parent_view.year,
            self.parent_view.make,
            selected_model
        )
        
        if len(bikes) == 1:
            # Only one bike matches this criteria, show its details directly
            bike = bikes[0]
            await self.show_bike_details(interaction, bike)
        else:
            # Multiple variants exist (different packages), let user choose
            final_view = FinalBikeSelectionView(
                self.bike_commands,
                self.parent_view.ctx,
                self.parent_view.year,
                self.parent_view.make,
                selected_model,
                bikes
            )
            
            await interaction.response.edit_message(
                content=f"Selected: {self.parent_view.year} {self.parent_view.make} {selected_model}\nSelect a specific variant:",
                view=final_view
            )
            
            final_view.message = await interaction.original_response()

    async def show_bike_details(self, interaction, bike):
        # Create an embed with bike details
        embed = discord.Embed(
            title=f"{bike['year']} {bike['make']} {bike['model']}",
            description=f"Details for this motorcycle:",
            color=discord.Color.blue()
        )
        
        if bike.get('package'):
            embed.add_field(name="Package", value=bike['package'], inline=True)
        if bike.get('category'):
            embed.add_field(name="Category", value=bike['category'], inline=True)
        if bike.get('engine'):
            embed.add_field(name="Engine", value=bike['engine'], inline=True)
        
        embed.set_footer(text="Data from BikeRole motorcycle database")
        
        # Create a view with an "Add to Profile" button if applicable
        view = BikeDetailsView(self.bike_commands, self.parent_view.ctx, bike)
        
        await interaction.response.edit_message(
            content=None,
            embed=embed,
            view=view
        )
        
        # Close database connection since we're done with queries
        self.bike_commands.db.close()
        
        # Update message reference
        view.message = await interaction.original_response()

# Model Pagination Button
class ModelPaginationButton(ui.Button):
    def __init__(self, label, view, direction, disabled=False):
        super().__init__(
            style=discord.ButtonStyle.secondary,
            label=label,
            disabled=disabled
        )
        self.view = view
        self.direction = direction
    
    async def callback(self, interaction):
        if interaction.user.id != self.view.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Update page
        self.view.page += self.direction
        
        # Create new view with updated page
        new_view = ModelSelectionView(
            self.view.bike_commands,
            self.view.ctx,
            self.view.year,
            self.view.make
        )
        new_view.page = self.view.page
        
        await interaction.response.edit_message(
            content=f"Selected: {self.view.year} {self.view.make}\nNow select a model (Page {new_view.page + 1}):",
            view=new_view
        )
        
        # Update message reference
        new_view.message = await interaction.original_response()

# Back Button to Makes
class BackToMakesButton(ui.Button):
    def __init__(self, bike_commands, ctx, year):
        super().__init__(
            style=discord.ButtonStyle.primary,
            label="Back to Makes"
        )
        self.bike_commands = bike_commands
        self.ctx = ctx
        self.year = year
    
    async def callback(self, interaction):
        if interaction.user.id != self.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Create new make selection view
        new_view = MakeSelectionView(self.bike_commands, self.ctx, self.year)
        
        await interaction.response.edit_message(
            content=f"Selected Year: {self.year}\nNow select a manufacturer:",
            view=new_view
        )
        
        # Update message reference
        new_view.message = await interaction.original_response()

# Final Bike Selection View (for models with multiple packages)
class FinalBikeSelectionView(ui.View):
    def __init__(self, bike_commands, ctx, year, make, model, bikes):
        super().__init__(timeout=120)
        self.bike_commands = bike_commands
        self.ctx = ctx
        self.year = year
        self.make = make
        self.model = model
        self.bikes = bikes
        self.page = 0
        self.message = None
        self.add_item(FinalBikeSelect(bike_commands, self))
    
    async def on_timeout(self):
        try:
            for child in self.children:
                child.disabled = True
            await self.message.edit(content="Selection menu timed out.", view=self)
            self.bike_commands.db.close()
        except Exception as e:
            logger.error(f"Error on timeout: {e}")

class FinalBikeSelect(ui.Select):
    def __init__(self, bike_commands, parent_view):
        self.bike_commands = bike_commands
        self.parent_view = parent_view
        
        # Handle pagination if needed
        items_per_page = 25
        self.total_pages = math.ceil(len(parent_view.bikes) / items_per_page)
        start_idx = parent_view.page * items_per_page
        end_idx = min(start_idx + items_per_page, len(parent_view.bikes))
        
        # Create options - specially format for variants/packages
        options = []
        for i in range(start_idx, end_idx):
            bike = parent_view.bikes[i]
            package_text = f" ({bike['package']})" if bike.get('package') else ""
            category_text = f" - {bike['category']}" if bike.get('category') else ""
            
            label = f"{package_text}{category_text}"
            if not label:
                label = "Standard"
                
            options.append(
                discord.SelectOption(
                    label=label[:100],
                    description=bike.get('engine', '')[:100],
                    value=str(i)
                )
            )
        
        placeholder = "Select Specific Variant"
        super().__init__(placeholder=placeholder, min_values=1, max_values=1, options=options)
        
        # Add back button
        parent_view.add_item(BackToModelsButton(
            bike_commands, 
            parent_view.ctx, 
            parent_view.year,
            parent_view.make
        ))

    async def callback(self, interaction):
        if interaction.user.id != self.parent_view.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Get selected bike
        selected_idx = int(self.values[0])
        bike = self.parent_view.bikes[selected_idx]
        
        # Create an embed with bike details
        embed = discord.Embed(
            title=f"{bike['year']} {bike['make']} {bike['model']}",
            description=f"Details for this motorcycle:",
            color=discord.Color.blue()
        )
        
        if bike.get('package'):
            embed.add_field(name="Package", value=bike['package'], inline=True)
        if bike.get('category'):
            embed.add_field(name="Category", value=bike['category'], inline=True)
        if bike.get('engine'):
            embed.add_field(name="Engine", value=bike['engine'], inline=True)
        
        embed.set_footer(text="Data from BikeRole motorcycle database")
        
        # Create a view with an "Add to Profile" button if applicable
        view = BikeDetailsView(self.bike_commands, self.parent_view.ctx, bike)
        
        await interaction.response.edit_message(
            content=None,
            embed=embed,
            view=view
        )
        
        # Close database connection since we're done with queries
        self.bike_commands.db.close()
        
        # Update message reference
        view.message = await interaction.original_response()

# Back Button to Models
class BackToModelsButton(ui.Button):
    def __init__(self, bike_commands, ctx, year, make):
        super().__init__(
            style=discord.ButtonStyle.primary,
            label="Back to Models"
        )
        self.bike_commands = bike_commands
        self.ctx = ctx
        self.year = year
        self.make = make
    
    async def callback(self, interaction):
        if interaction.user.id != self.ctx.author.id:
            await interaction.response.send_message("This menu isn't for you!", ephemeral=True)
            return
            
        # Create new model selection view
        new_view = ModelSelectionView(self.bike_commands, self.ctx, self.year, self.make)
        
        await interaction.response.edit_message(
            content=f"Selected: {self.year} {self.make}\nNow select a model:",
            view=new_view
        )
        
        # Update message reference
        new_view.message = await interaction.original_response()

# Bike Details View (with "Add to Profile" button)
class BikeDetailsView(ui.View):
    def __init__(self, bike_commands, ctx, bike):
        super().__init__(timeout=120)
        self.bike_commands = bike_commands
        self.ctx = ctx
        self.bike = bike
        self.message = None
        self.add_item(AddToProfileButton(bike_commands, ctx, bike))
    
    async def on_timeout(self):
        try:
            for child in self.children:
                child.disabled = True
            await self.message.edit(content="Selection menu timed out.", view=self)
        except Exception as e:
            logger.error(f"Error on timeout: {e}")

class AddToProfileButton(ui.Button):
    def __init__(self, bike_commands, ctx, bike):
        super().__init__(
            style=discord.ButtonStyle.success,
            label="Add to Profile"
        )
        self.bike_commands = bike_commands
        self.ctx = ctx
        self.bike = bike
    
    async def callback(self, interaction):
        if interaction.user.id != self.ctx.author.id:
            await interaction.response.send_message("This button isn't for you!", ephemeral=True)
            return
            
        # Check if account is linked
        user_id = await self.bike_commands.api.get_user_id(str(self.ctx.author.id))
        if not user_id:
            await interaction.response.send_message("Your Discord account is not linked to BikeNode! Use `!link` to link your account first.", ephemeral=True)
            return
        
        # Send data to API
        bike_data = {
            "year": self.bike['year'],
            "make": self.bike['make'],
            "model": self.bike['model'],
            "package": self.bike.get('package'),
            "category": self.bike.get('category'),
            "engine": self.bike.get('engine')
        }
        
        result = await self.bike_commands.api.add_bike(user_id, bike_data)
        
        if result and not result.get("error"):
            package_str = f" ({self.bike.get('package')})" if self.bike.get('package') else ""
            await interaction.response.send_message(
                f"🏍️ Added to your BikeNode profile: {self.bike['year']} {self.bike['make']} {self.bike['model']}{package_str}",
                ephemeral=True
            )
            
            # Trigger role update in all servers
            await self.bike_commands.update_user_roles(self.ctx.author)
        else:
            error_msg = result.get("message", "Unknown error")
            await interaction.response.send_message(f"Failed to add motorcycle: {error_msg}", ephemeral=True)

async def setup(bot):
    # Register this cog with the bot
    await bot.add_cog(BikeCommands(bot))
