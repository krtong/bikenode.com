import discord
from discord.ext import commands
import pandas as pd
import matplotlib.pyplot as plt
import io
import os
from pathlib import Path
import logging

logger = logging.getLogger('BikeRoleBot')

class StatsCommands(commands.Cog):
    """Commands for motorcycle statistics"""
    
    def __init__(self, bot):
        self.bot = bot
        self.data_path = Path(os.path.dirname(os.path.abspath(__file__))) / '../data/bikedata/motorcycles.csv'
        self.bike_data = None
        self.load_bike_data()
    
    def load_bike_data(self):
        """Load motorcycle data from CSV file"""
        try:
            self.bike_data = pd.read_csv(self.data_path)
            logger.info(f"Loaded {len(self.bike_data)} motorcycle records for stats")
        except Exception as e:
            logger.error(f"Error loading motorcycle data: {e}")
            self.bike_data = pd.DataFrame()
    
    @commands.command(name="stats")
    async def bike_stats(self, ctx, stat_type: str = "brands"):
        """Display motorcycle statistics
        
        Usage: !bike stats [brands|categories|years]
        """
        if self.bike_data.empty:
            await ctx.send("❌ No motorcycle data available.")
            return
        
        if stat_type.lower() in ["brand", "brands", "make", "makes"]:
            await self.show_brand_stats(ctx)
        elif stat_type.lower() in ["category", "categories", "type", "types"]:
            await self.show_category_stats(ctx)
        elif stat_type.lower() in ["year", "years"]:
            await self.show_year_stats(ctx)
        else:
            await ctx.send("📊 Available statistics: `brands`, `categories`, `years`")
    
    async def show_brand_stats(self, ctx):
        """Show statistics about motorcycle brands"""
        try:
            # Count motorcycles by brand
            brand_counts = self.bike_data['make'].value_counts().head(10)
            
            # Create a bar chart
            plt.figure(figsize=(10, 6))
            brand_counts.plot(kind='bar', color='steelblue')
            plt.title('Top 10 Motorcycle Brands by Count')
            plt.xlabel('Brand')
            plt.ylabel('Number of Models')
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Save the plot to a buffer
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            
            # Create an embed with the chart
            embed = discord.Embed(
                title="Motorcycle Brand Statistics",
                description=f"Total brands: {self.bike_data['make'].nunique()}",
                color=discord.Color.blue()
            )
            
            # Add the chart as an attachment
            file = discord.File(buf, filename="brand_stats.png")
            embed.set_image(url="attachment://brand_stats.png")
            
            # Add top brands as fields
            for brand, count in brand_counts.items():
                embed.add_field(
                    name=brand,
                    value=f"{count} models",
                    inline=True
                )
            
            embed.set_footer(text="Data from BikeNode motorcycle database")
            
            await ctx.send(embed=embed, file=file)
            plt.close()
            
        except Exception as e:
            logger.error(f"Error generating brand stats: {e}")
            await ctx.send("❌ An error occurred while generating brand statistics.")
    
    async def show_category_stats(self, ctx):
        """Show statistics about motorcycle categories"""
        try:
            # Count motorcycles by category
            category_counts = self.bike_data['category'].value_counts().head(10)
            
            # Create a pie chart
            plt.figure(figsize=(10, 6))
            plt.pie(category_counts, labels=category_counts.index, autopct='%1.1f%%', 
                   shadow=True, startangle=90)
            plt.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle
            plt.title('Motorcycle Categories Distribution')
            plt.tight_layout()
            
            # Save the plot to a buffer
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            
            # Create an embed with the chart
            embed = discord.Embed(
                title="Motorcycle Category Statistics",
                description=f"Total categories: {self.bike_data['category'].nunique()}",
                color=discord.Color.green()
            )
            
            # Add the chart as an attachment
            file = discord.File(buf, filename="category_stats.png")
            embed.set_image(url="attachment://category_stats.png")
            
            # Add top categories as fields
            for category, count in category_counts.items():
                if pd.notna(category):  # Skip NaN categories
                    embed.add_field(
                        name=category,
                        value=f"{count} models ({count/len(self.bike_data)*100:.1f}%)",
                        inline=True
                    )
            
            embed.set_footer(text="Data from BikeNode motorcycle database")
            
            await ctx.send(embed=embed, file=file)
            plt.close()
            
        except Exception as e:
            logger.error(f"Error generating category stats: {e}")
            await ctx.send("❌ An error occurred while generating category statistics.")
    
    async def show_year_stats(self, ctx):
        """Show statistics about motorcycle years"""
        try:
            # Count motorcycles by year
            year_counts = self.bike_data['year'].value_counts().sort_index().tail(15)
            
            # Create a line chart
            plt.figure(figsize=(10, 6))
            year_counts.plot(kind='line', marker='o', color='darkred')
            plt.title('Motorcycle Models by Year (Last 15 Years)')
            plt.xlabel('Year')
            plt.ylabel('Number of Models')
            plt.grid(True, linestyle='--', alpha=0.7)
            plt.tight_layout()
            
            # Save the plot to a buffer
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            
            # Create an embed with the chart
            embed = discord.Embed(
                title="Motorcycle Year Statistics",
                description=f"Year range: {self.bike_data['year'].min()} - {self.bike_data['year'].max()}",
                color=discord.Color.gold()
            )
            
            # Add the chart as an attachment
            file = discord.File(buf, filename="year_stats.png")
            embed.set_image(url="attachment://year_stats.png")
            
            # Add summary statistics
            oldest_bike = self.bike_data.loc[self.bike_data['year'].idxmin()]
            newest_bike = self.bike_data.loc[self.bike_data['year'].idxmax()]
            
            embed.add_field(
                name="Oldest Model",
                value=f"{oldest_bike['year']} {oldest_bike['make']} {oldest_bike['model']}",
                inline=False
            )
            
            embed.add_field(
                name="Newest Model",
                value=f"{newest_bike['year']} {newest_bike['make']} {newest_bike['model']}",
                inline=False
            )
            
            embed.set_footer(text="Data from BikeNode motorcycle database")
            
            await ctx.send(embed=embed, file=file)
            plt.close()
            
        except Exception as e:
            logger.error(f"Error generating year stats: {e}")
            await ctx.send("❌ An error occurred while generating year statistics.")