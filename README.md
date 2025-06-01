# BikeNode.com

A comprehensive bike data platform with web application, Discord bot, data scrapers, and browser extensions.

## 🏗️ Repository Structure

```
bikenode.com/
├── website/              # Go web application
├── discord-bot/          # Python Discord bot
├── scrapers/             # 99spokes data scrapers
├── browser-extension/    # Chrome/Firefox extensions
├── database/             # Database files and migrations
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── deprecated/           # Legacy/test files
```

## 🚀 Components

### **Website** (`/website/`)
Go-based web application with PostgreSQL backend
- **Stack**: Go, PostgreSQL, HTML templates
- **Features**: User auth, bike search, profiles
- **Run**: `cd website && go run main.go`

### **Discord Bot** (`/discord-bot/`)
Python Discord bot for bike data queries
- **Stack**: Python, discord.py
- **Features**: Bike commands, stats, comparisons
- **Run**: `cd discord-bot && python bot.py`

### **Scrapers** (`/scrapers/`)
4-stage pipeline for scraping 99spokes.com bike data
- **Stages**: Brands → Years → URLs → Data
- **Output**: PostgreSQL database with 69k+ bike variants
- **Run**: `cd scrapers && node pipeline_runner.js`

### **Browser Extension** (`/browser-extension/`)
Chrome extension for bike data detection
- **Features**: Page parsing, data extraction
- **Install**: Load unpacked extension in Chrome

### **Database** (`/database/`)
Centralized database files and schemas
- **Migrations**: SQL schema files
- **Backups**: PostgreSQL dumps
- **Data**: CSV files, SQLite databases

## 📊 Current Status

- **Website**: ✅ Functional with auth and search
- **Discord Bot**: ✅ Active with bike commands
- **Scrapers**: 🔄 ~20k/69k variants scraped (57% complete)
- **Browser Extension**: ✅ Chrome extension working
- **Database**: ✅ PostgreSQL with relational schema

## 🗄️ Database Schema

**Relational Structure:**
- `bikes_catalog` - Make/model/year/variant (19k+ entries)
- `bikes_data` - Comprehensive JSONB data (573MB)

## 🚀 Quick Start

1. **Setup Database**: PostgreSQL running locally
2. **Run Migrations**: `psql bikenode < database/migrations/*.sql`
3. **Start Website**: `cd website && go run main.go`
4. **Start Bot**: `cd discord-bot && python bot.py`
5. **Continue Scraping**: `cd scrapers && node 04_data_scraper.js`

## 📚 Documentation

- **Website**: [`docs/WEBSITE.md`](docs/WEBSITE.md)
- **Discord Bot**: [`docs/DISCORD_BOT.md`](docs/DISCORD_BOT.md)
- **Scrapers**: [`docs/SCRAPERS.md`](docs/SCRAPERS.md)
- **Setup**: [`docs/SCRAPER_SETUP.md`](docs/SCRAPER_SETUP.md)

## 🗂️ Legacy Files

Deprecated and test files are preserved in [`/deprecated/`](deprecated/) with the same organizational structure.