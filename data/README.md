# Bikenode Discord Bot Lookup System

This system provides a fast and efficient way to look up motorcycle information from CSV data files and integrate with a Discord bot to enable users to create roles for the bikes they own.

## Files

- `bike_lookup.py` - Core library for parsing and searching motorcycle data
- `discord_bot_example.py` - Example Discord bot implementation using the bike lookup system
- `motorcycles/` - Directory containing motorcycle data CSV files
  - `Motorcycle_Makes_models_1894-1949.csv` - Historic motorcycles data
  - `Motorcycle_Makes_models_1950-2025.csv` - Modern motorcycles data

## Setup

1. Ensure you have Python 3.7+ installed
2. Install required packages:
   ```bash
   pip install discord.py
   ```
3. Set up your Discord bot token:
   ```bash
   export DISCORD_BOT_TOKEN="your_token_here"
   ```
4. Run the Discord bot:
   ```bash
   python discord_bot_example.py
   ```

## Features

- **Fast Lookup**: The system parses CSV files and creates optimized lookup structures
- **Fuzzy Search**: Find motorcycles even with partial or imperfect queries
- **Discord Integration**: Add/remove motorcycle roles, search for bikes, list owned bikes
- **Comprehensive Data**: Covers motorcycles from 1894 to present day

## Discord Bot Commands

- `!bike [query]` - Search for motorcycles matching the query
- `!makes` - List all motorcycle manufacturers
- `!models [make]` - List all models for a specific manufacturer
- `!years [make] [model]` - List all years for a specific make and model
- `!addbike [make] [model] [year]` - Add a motorcycle role to your user (year is optional)
- `!removebike [make] [model] [year]` - Remove a motorcycle role from your user
- `!mybikes` - List all motorcycle roles you currently have

## Examples

```
!bike harley davidson sportster
```
Searches for Harley Davidson Sportster motorcycles.

```
!addbike Honda CBR1000RR 2008
```
Adds the "2008 Honda CBR1000RR" role to your user.

```
!models Ducati
```
Lists all Ducati models in the database.

## Extending the System

To extend this system:

1. Add more data to the CSV files or add new CSV files
2. Update the `BikeDatabase.load_data()` method to handle additional files
3. Add new functions to the `create_discord_bot_role_helper()` function
4. Create additional Discord bot commands in your bot file

## Optimization

The system creates cached JSON files in the `processed/` directory for faster startup on subsequent runs.
