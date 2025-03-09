import discord
from discord.ext import commands
from utils.motorcycle_data import MotorcycleData
from typing import List, Dict, Any
import random

class MotorcycleCommands(commands.Cog):
    """
    Discord commands for interacting with motorcycle data
    """
    
    def __init__(self, bot):
        self.bot = bot
        self.motorcycle_data = MotorcycleData()
        print(f"Loaded {len(self.motorcycle_data.motorcycles)} motorcycles into commands")
    
    @commands.command(name="bike")
    async def bike_info(self, ctx, make: str, model: str, year: int = None):
        """
        Get information about a motorcycle
        Usage: !bike [make] [model] [year (optional)]
        Example: !bike Honda CB750 1969
        """
        results = self.motorcycle_data.get_motorcycle_details(make, model, year)
        
        if not results:
            await ctx.send(f"No motorcycles found matching: {make} {model} {year if year else ''}")
            return
            
        if len(results) > 1 and len(results) <= 5:
            await ctx.send(f"Found {len(results)} matching motorcycles:")
            
        elif len(results) > 5:
            await ctx.send(f"Found {len(results)} matching motorcycles. Showing first 5:")
            results = results[:5]
            
        for bike in results:
            embed = discord.Embed(
                title=f"{bike['Year']} {bike['Make']} {bike['Model']}",
                description=f"Category: {bike['Category']}",
                color=discord.Color.blue()
            )
            
            if bike['Package']:
                embed.add_field(name="Package", value=bike['Package'], inline=True)
                
            embed.add_field(name="Engine", value=bike['Engine'], inline=True)
            await ctx.send(embed=embed)
    
    @commands.command(name="randombike")
    async def random_bike(self, ctx, year: int = None, category: str = None):
        """
        Get a random motorcycle
        Usage: !randombike [year (optional)] [category (optional)]
        Example: !randombike 1980 Sport
        """
        filtered_bikes = self.motorcycle_data.motorcycles
        
        if year:
            filtered_bikes = [bike for bike in filtered_bikes if bike['Year'] == year]
            
        if category:
            category = category.lower()
            filtered_bikes = [bike for bike in filtered_bikes 
                             if bike['Category'] and category in bike['Category'].lower()]
        
        if not filtered_bikes:
            await ctx.send(f"No motorcycles found matching your criteria")
            return
            
        bike = random.choice(filtered_bikes)
        
        embed = discord.Embed(
            title=f"🏍️ Random Motorcycle: {bike['Year']} {bike['Make']} {bike['Model']}",
            description=f"Category: {bike['Category']}",
            color=discord.Color.green()
        )
        
        if bike['Package']:
            embed.add_field(name="Package", value=bike['Package'], inline=True)
            
        embed.add_field(name="Engine", value=bike['Engine'], inline=True)
        await ctx.send(embed=embed)
    
    @commands.command(name="categories")
    async def list_categories(self, ctx):
        """List all available motorcycle categories"""
        categories = self.motorcycle_data.get_all_categories()
        
        embed = discord.Embed(
            title="🏍️ Motorcycle Categories",
            description="\n".join(categories),
            color=discord.Color.gold()
        )
        await ctx.send(embed=embed)
    
    @commands.command(name="makes")
    async def list_makes(self, ctx):
        """List all available motorcycle manufacturers"""
        makes = self.motorcycle_data.get_all_makes()
        
        # Split into pages if there are too many
        if len(makes) > 30:
            chunks = [makes[i:i + 30] for i in range(0, len(makes), 30)]
            for i, chunk in enumerate(chunks):
                embed = discord.Embed(
                    title=f"🏍️ Motorcycle Manufacturers (Page {i+1}/{len(chunks)})",
                    description="\n".join(chunk),
                    color=discord.Color.gold()
                )
                await ctx.send(embed=embed)
        else:
            embed = discord.Embed(
                title="🏍️ Motorcycle Manufacturers",
                description="\n".join(makes),
                color=discord.Color.gold()
            )
            await ctx.send(embed=embed)
    
    @commands.command(name="yearrange")
    async def year_range(self, ctx):
        """Show the range of years covered in the motorcycle database"""
        min_year, max_year = self.motorcycle_data.get_year_range()
        
        embed = discord.Embed(
            title="🏍️ Motorcycle Database Coverage",
            description=f"The database contains motorcycles from {min_year} to {max_year}",
            color=discord.Color.gold()
        )
        await ctx.send(embed=embed)

def setup(bot):
    bot.add_cog(MotorcycleCommands(bot))
