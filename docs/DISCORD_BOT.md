# BikeNode Discord Bot

A comprehensive Discord bot designed for bike enthusiasts that bridges Discord servers with the BikeNode platform. Transform your Discord server into a cycling and motorcycle hub with profile management, extensive database lookup, and automated community features covering motorcycles, bicycles, and e-bikes.

## Overview

The BikeNode Discord Bot serves as the central hub for bike enthusiasts across all categories, providing:
- **Community Management**: Automatic role assignment based on bike ownership (motorcycles, bicycles, e-bikes)
- **Comprehensive Database**: Access to extensive bike specifications and data across all categories
- **Profile Integration**: Seamless connection between Discord and BikeNode accounts
- **Data Visualization**: Interactive charts and bike comparisons
- **Story Sharing**: Community storytelling with image support for all bike types

## Core Features

### 🚴 Bike Management (All Categories)
- **Multi-Category Database**: Search motorcycles, bicycles, and e-bikes by make, model, year
- **Profile Management**: Add/remove bikes from your BikeNode profile across all categories
- **Account Linking**: Secure connection between Discord and BikeNode accounts
- **Interactive UI**: Dropdown menus and pagination for easy navigation

### 📊 Data & Analytics
- **Statistics Dashboard**: Visual charts for brands, categories, and year distributions across all bike types
- **Bike Comparisons**: Side-by-side specification comparisons with charts (motorcycles, bicycles, e-bikes)
- **Data Visualization**: Matplotlib-powered charts and graphs
- **Advanced Search**: Fuzzy matching and intelligent query parsing across all bike categories
- **Category-Specific Metrics**: Specialized analytics for each bike type

### 👥 Community Features
- **Automatic Roles**: Role assignment based on bike ownership (by brand, category, or bike type)
- **Story Sharing**: Share bike stories with image attachments (any bike type)
- **Premium Recognition**: Special roles for BikeNode premium users
- **Cross-Server Sync**: Synchronize roles across multiple servers
- **Multi-Community Support**: Motorcycle clubs, cycling groups, e-bike enthusiasts

### ⚙️ Administration Tools
- **Flexible Configuration**: Choose role assignment mode (brand, category, or disabled)
- **Bulk Operations**: Sync all users' roles at once
- **Channel Management**: Configure story posting channels
- **Server Setup**: Automated initial configuration

## Setup

1. **Install Dependencies**

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

2. **Configuration**

- Copy `.env.example` to `.env` and fill in your Discord Bot Token
- Review and update `config/config.yaml` as needed

3. **Running the Bot**

```bash
# Recommended: Use the launcher (handles SSL issues automatically)
python launch.py

# Alternative: Run the bot directly
python bot.py
```

## Troubleshooting

### SSL Certificate Errors

If you encounter SSL certificate verification errors (particularly common on macOS):

1. The launcher script (`launch.py`) should handle these automatically
2. If you still have issues, run the SSL fix script:
   ```bash
   python fix_ssl.py
   ```
   
3. Or install Python certificates manually:
   ```bash
   /Applications/Python\ 3.13/Install\ Certificates.command
   ```

### CSV Data Loading Errors

If you see errors related to malformed CSV data, the bot will attempt to load the data by skipping bad rows, but this may result in missing motorcycles.

## Project Structure

```
discord_bot/
├── api/                # API integration modules
│   ├── bikenode_client.py
│   └── webhook_handler.py
├── commands/           # Bot command modules
│   ├── bike.py         # Motorcycle lookup commands
│   ├── server_management.py
│   ├── stats.py
│   ├── compare.py
│   └── story.py
├── config/             # Configuration files
│   └── config.yaml
├── data/               # Data files
│   └── bikedata/       
│       └── motorcycles.csv
├── events/             # Event handler modules
│   └── message.py
├── utils/              # Utility functions and classes
│   ├── db_manager.py
│   ├── helpers.py
│   └── role_manager.py
├── bot.py              # Main bot implementation
├── launch.py           # Bot launcher script (recommended)
├── fix_ssl.py          # Helper script for SSL issues
├── .env                # Environment variables
└── README.md           # This file
```

## Commands Reference

### 🔍 Bike Lookup Commands
- `!bike search <query>` - Search all bike databases (motorcycles, bicycles, e-bikes) by make/model/year
- `!searchbike <query>` - Alternative search command with enhanced results across all categories
- `!bikeyear <year>` - Show all bikes from a specific year (all types)
- `!findmoto` - Interactive motorcycle finder with dropdown menus
- `!findbike` - Interactive bicycle/e-bike finder (coming soon)

### 👤 Profile Management Commands  
- `!addbike <year make model [package]>` - Add any bike type to your BikeNode profile
- `!removebike` - Remove a bike from your profile (interactive selection, all types)
- `!link` - Link your Discord account to BikeNode platform

### 📊 Statistics & Analysis Commands
- `!bike stats` - Overview of all bike database statistics
- `!bike stats brands` - Brand distribution with bar chart (all bike types)
- `!bike stats categories` - Category breakdown with pie chart (motorcycles, bicycles, e-bikes)
- `!bike stats years` - Year distribution with line chart (all types)
- `!bike compare <bike1> vs <bike2>` - Side-by-side bike comparison (cross-category supported)

### 📖 Story & Social Commands
- `!story <content>` - Create a new bike story (supports image attachments, any bike type)
- `!recent` - Share your most recent BikeNode story
- `!setstorychannel [channel]` - Set channel for story posting (admin only)

### ⚙️ Server Management Commands (Admin Only)
- `!bikerole-setup` - Initial bot setup and configuration
- `!setrolecreation [brand|category|biketype|none]` - Configure automatic role creation mode
- `!bikerole-settings` - View current server configuration
- `!sync` - Synchronize all users' roles with BikeNode data
- `!setrole <category> <role_name>` - Map bike categories to Discord roles

### ❓ Help Commands
- `!bike help` - Display comprehensive command help
- `!help <command>` - Get detailed help for specific commands

## Environment Variables

The bot uses the following environment variables:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `BIKENODE_API_KEY` - API key for BikeNode platform integration
- `DATABASE_URL` - Database connection string (if applicable)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
