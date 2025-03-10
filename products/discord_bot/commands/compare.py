import discord
from discord.ext import commands
import pandas as pd
import matplotlib.pyplot as plt
import io
import os
from pathlib import Path
import logging
import asyncio
from utils.helpers import create_embed, paginate_content

logger = logging.getLogger('BikeRoleBot')

class CompareCommands(commands.Cog):
    """Commands for comparing motorcycles"""
    
    def __init__(self, bot):
        self.bot = bot
        self.data_path = Path(os.path.dirname(os.path.abspath(__file__))) / '../data/bikedata/motorcycles.csv'
        self.bike_data = None
        self.load_bike_data()
    
    def load_bike_data(self):
        """Load motorcycle data from CSV file"""
        try:
            self.bike_data = pd.read_csv(self.data_path)
            logger.info(f"Loaded {len(self.bike_data)} motorcycle records for comparison")
        except Exception as e:
            logger.error(f"Error loading motorcycle data: {e}")
            self.bike_data = pd.DataFrame()
    
    @commands.command(name="compare")
    async def compare_bikes(self, ctx, *, query: str = None):
        """Compare two motorcycles side by side
        
        Usage: !bike compare <bike1> vs <bike2>
        Example: !bike compare 2023 Honda CBR1000RR vs 2023 Kawasaki Ninja ZX-10R
        """
        if not query:
            await ctx.send("Please provide two motorcycles to compare using the format: `!bike compare <bike1> vs <bike2>`")
            return
        
        if self.bike_data.empty:
            await ctx.send("❌ No motorcycle data available.")
            return
        
        # Split the query by "vs" or "VS" or "versus"
        parts = None
        for separator in [" vs ", " VS ", " versus "]:
            if separator in query:
                parts = query.split(separator, 1)
                break
        
        if not parts or len(parts) != 2:
            await ctx.send("Please use the format: `!bike compare <bike1> vs <bike2>`")
            return
        
        bike1_query = parts[0].strip()
        bike2_query = parts[1].strip()
        
        # Find the motorcycles in the database
        bike1_matches = self._search_bike(bike1_query)
        bike2_matches = self._search_bike(bike2_query)
        
        if not bike1_matches:
            await ctx.send(f"❌ Could not find any motorcycle matching '{bike1_query}'")
            return
        
        if not bike2_matches:
            await ctx.send(f"❌ Could not find any motorcycle matching '{bike2_query}'")
            return
        
        # If multiple matches, let the user select
        bike1 = await self._handle_multiple_matches(ctx, bike1_matches, bike1_query)
        if not bike1:
            return  # User canceled or timed out
        
        bike2 = await self._handle_multiple_matches(ctx, bike2_matches, bike2_query)
        if not bike2:
            return  # User canceled or timed out
        
        # Compare the selected motorcycles
        await self._display_comparison(ctx, bike1, bike2)
    
    def _search_bike(self, query):
        """Search for a motorcycle in the database"""
        query = query.lower()
        matches = []
        
        # Try to parse year, make, model
        parts = query.split()
        if len(parts) >= 2:
            # Check if first part is a year
            potential_year = parts[0]
            if potential_year.isdigit() and 1900 <= int(potential_year) <= 2030:
                year = int(potential_year)
                make_model = ' '.join(parts[1:])
                
                # Search by year and make/model
                for _, row in self.bike_data.iterrows():
                    if row['year'] == year and make_model.lower() in f"{row['make']} {row['model']}".lower():
                        matches.append(row)
            
            # If no matches with year, try more general search
            if not matches:
                for _, row in self.bike_data.iterrows():
                    bike_str = f"{row['year']} {row['make']} {row['model']}".lower()
                    if query in bike_str:
                        matches.append(row)
        
        return matches
    
    async def _handle_multiple_matches(self, ctx, matches, query):
        """Handle multiple motorcycle matches"""
        if len(matches) == 1:
            return matches[0]
        
        # Create an embed with the matches
        embed = create_embed(
            title=f"Multiple matches found for '{query}'",
            description="Please select a motorcycle by typing the number:"
        )
        
        for i, bike in enumerate(matches[:10], 1):  # Limit to 10 matches
            package_str = f" ({bike['package']})" if pd.notna(bike['package']) else ""
            embed.add_field(
                name=f"{i}. {bike['year']} {bike['make']} {bike['model']}{package_str}",
                value=f"Category: {bike['category']}, Engine: {bike['engine']}",
                inline=False
            )
        
        if len(matches) > 10:
            embed.set_footer(text=f"Showing 10 of {len(matches)} matches. Please refine your search for more specific results.")
        
        await ctx.send(embed=embed)
        
        def check(m):
            return m.author == ctx.author and m.channel == ctx.channel and m.content.isdigit()
        
        try:
            msg = await self.bot.wait_for('message', check=check, timeout=30.0)
            selection = int(msg.content)
            
            if 1 <= selection <= len(matches[:10]):
                return matches[selection-1]
            else:
                await ctx.send("Invalid selection. Please try the command again.")
                return None
        except asyncio.TimeoutError:
            await ctx.send("Selection timed out. Please try the command again.")
            return None
        except Exception as e:
            logger.error(f"Error in bike selection: {e}")
            await ctx.send("An error occurred during selection. Please try again.")
            return None
    
    async def _display_comparison(self, ctx, bike1, bike2):
        """Display a comparison between two motorcycles"""
        try:
            # Create a comparison embed
            embed = discord.Embed(
                title="Motorcycle Comparison",
                description=f"Comparing two motorcycles side by side",
                color=discord.Color.blue()
            )
            
            # Format bike names
            bike1_package = f" ({bike1['package']})" if pd.notna(bike1['package']) else ""
            bike2_package = f" ({bike2['package']})" if pd.notna(bike2['package']) else ""
            
            bike1_name = f"{bike1['year']} {bike1['make']} {bike1['model']}{bike1_package}"
            bike2_name = f"{bike2['year']} {bike2['make']} {bike2['model']}{bike2_package}"
            
            # Add bike names to embed
            embed.add_field(name="Motorcycle 1", value=bike1_name, inline=True)
            embed.add_field(name="Motorcycle 2", value=bike2_name, inline=True)
            embed.add_field(name="\u200b", value="\u200b", inline=True)  # Empty field for spacing
            
            # Compare basic specs
            embed.add_field(name="Year", value=str(bike1['year']), inline=True)
            embed.add_field(name="Year", value=str(bike2['year']), inline=True)
            embed.add_field(name="\u200b", value="\u200b", inline=True)  # Empty field for spacing
            
            embed.add_field(name="Make", value=bike1['make'], inline=True)
            embed.add_field(name="Make", value=bike2['make'], inline=True)
            embed.add_field(name="\u200b", value="\u200b", inline=True)  # Empty field for spacing
            
            embed.add_field(name="Model", value=bike1['model'], inline=True)
            embed.add_field(name="Model", value=bike2['model'], inline=True)
            embed.add_field(name="\u200b", value="\u200b", inline=True)  # Empty field for spacing
            
            embed.add_field(name="Category", value=bike1['category'] if pd.notna(bike1['category']) else "N/A", inline=True)
            embed.add_field(name="Category", value=bike2['category'] if pd.notna(bike2['category']) else "N/A", inline=True)
            embed.add_field(name="\u200b", value="\u200b", inline=True)  # Empty field for spacing
            
            embed.add_field(name="Engine", value=bike1['engine'] if pd.notna(bike1['engine']) else "N/A", inline=True)
            embed.add_field(name="Engine", value=bike2['engine'] if pd.notna(bike2['engine']) else "N/A", inline=True)
            embed.add_field(name="\u200b", value="\u200b", inline=True)  # Empty field for spacing
            
            # Create a visual comparison chart
            fig, ax = plt.subplots(figsize=(10, 6))
            
            # Extract engine sizes for comparison (if available)
            engine1_cc = self._extract_engine_cc(bike1['engine']) if pd.notna(bike1['engine']) else 0
            engine2_cc = self._extract_engine_cc(bike2['engine']) if pd.notna(bike2['engine']) else 0
            
            # Create bar chart comparing engine sizes
            if engine1_cc > 0 and engine2_cc > 0:
                bikes = [bike1_name, bike2_name]
                engine_sizes = [engine1_cc, engine2_cc]
                
                ax.bar(bikes, engine_sizes, color=['steelblue', 'firebrick'])
                ax.set_ylabel('Engine Size (cc)')
                ax.set_title('Engine Size Comparison')
                
                # Add the values on top of the bars
                for i, v in enumerate(engine_sizes):
                    ax.text(i, v + 50, str(v) + "cc", ha='center')
                
                plt.tight_layout()
                
                # Save the plot to a buffer
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                buf.seek(0)
                
                # Add the chart as an attachment
                file = discord.File(buf, filename="comparison.png")
                embed.set_image(url="attachment://comparison.png")
                
                await ctx.send(embed=embed, file=file)
                plt.close()
            else:
                # If engine sizes can't be compared, just send the embed without a chart
                embed.add_field(
                    name="Note", 
                    value="Engine size comparison not available for these motorcycles.", 
                    inline=False
                )
                await ctx.send(embed=embed)
        
        except Exception as e:
            logger.error(f"Error displaying comparison: {e}")
            await ctx.send("An error occurred while creating the comparison. Please try again.")
    
    def _extract_engine_cc(self, engine_str):
        """Extract engine size in cc from engine string"""
        if not engine_str:
            return 0
            
        engine_str = str(engine_str).lower()
        
        # Try to extract cc value
        if 'cc' in engine_str:
            try:
                # Extract digits before 'cc'
                import re
                match = re.search(r'(\d+)cc', engine_str.replace(' ', ''))
                if match:
                    return int(match.group(1))
            except:
                pass
        
        return 0