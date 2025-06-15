# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Website Development
```bash
# Start development servers (both API and frontend)
npm run dev                # Runs ./run-dev.sh - starts Go API (8080) + Eleventy (8081)

# Individual servers
npm run dev-api           # Go API server only on port 8080
npm run dev-frontend      # Eleventy frontend only on port 8081

# Build commands
npm run build             # Build static site to _site/
npm run build-api         # Build Go binary to ./bikenode-api
npm run clean             # Clean _site/ directory
npm run clean-all         # Clean _site/ and bikenode-api binary
```

### Discord Bot
```bash
cd discord-bot/
python bot.py            # Start Discord bot
python claude_server.py  # Start Claude integration server
```

### Scraping Pipeline
```bash
cd scrapers/crawl-scrape-pipeline/
python -m pip install -r requirements.txt
python orchestration/run_pipeline.py    # Run complete 14-step pipeline
```

### Database Operations
```bash
cd database/
# Database migrations are in migrations/ directory
# Check existing schema with migration files 000001-000004
```

## Architecture Overview

### Multi-Service Architecture
Bikenode is a **multi-language, multi-service platform**:

1. **Website Frontend**: Eleventy (11ty) static site generator with self-contained architecture
2. **API Backend**: Go server with PostgreSQL database
3. **Discord Bot**: Python bot with Claude Code integration
4. **Scraping Pipeline**: Python-based 14-step data collection system
5. **Database Layer**: PostgreSQL with structured migrations

### Core Technologies
- **Frontend**: Eleventy 11ty + Nunjucks templates + self-contained CSS/JS
- **Backend**: Go 1.21 + Gorilla Mux + PostgreSQL + Redis
- **Bot**: Python 3.x + discord.py + aiohttp
- **Scraping**: Python + Scrapy + BeautifulSoup + pandas
- **Database**: PostgreSQL with UUID primary keys + JSONB fields

## Critical Architecture Patterns

### Website: Self-Contained Architecture
**MANDATORY READING**: Always read `website/src/README_BEFORE_MAKING_ANY_PAGE.md` and `website/src/SELF_CONTAINED_ARCHITECTURE.md` before creating any pages.

**Core Rules**:
- Every page lives in its own folder: `/category/category-page-name/`
- All CSS, JS, and assets stay within the page folder
- Use hyperspecific naming: `profile-my-page-header.css` not `header.css`
- No shared components - copy and rename everything
- Two main layouts: `bikenode-main-layout-01` and `documentation-page-layout`

```
src/profile/profile-my-page/
├── index.njk                           # Main page file
├── profile-my-page.css                 # Page-specific styles
├── profile-my-page.js                  # Page-specific scripts
└── profile-my-page-component-*.njk     # Page-specific components
```

### Database Schema Structure
Main entities and their relationships:

```sql
users (id, discord_id, username, email)
  ↓
ownerships (user_id → users.id, motorcycle_id → motorcycles.id)
  ↓
timeline_events (ownership_id → ownerships.id)

motorcycles (id, year, make, model, category, engine)
servers (discord_id, name, owner_id)
server_configs (server_id → servers.id)
```

### Go API Server Architecture
Located in `website/api-server/`:
- **Entry Point**: `main.go` - HTTP server with CORS, routing, PostgreSQL connection
- **Dependencies**: Gorilla Mux (routing), lib/pq (PostgreSQL), go-redis (caching)
- **Database**: Connection string from environment variables
- **Ports**: API runs on 8080, frontend dev server on 8081

### Discord Bot Integration
Located in `discord-bot/`:
- **Main Bot**: `bot.py` - Discord command handling and server management
- **Claude Integration**: `claude_server.py` - HTTP server for Claude Code communication
- **Data Storage**: JSON files in `data/claude/` for message passing
- **Commands**: Modular command system in `commands/` directory

### Scraping Pipeline (14 Steps)
Located in `scrapers/crawl-scrape-pipeline/`:
1. **Map** (01_map): Discover URLs via sitemaps/crawling
2. **Filter** (02_filter): Remove unwanted URLs
3. **Group** (03_group): Categorize URLs by patterns
4. **Probe** (04_probe): Analyze page structures
5. **Decide** (05_decide): Choose scraping strategy
6. **Plan** (06_plan): Define CSS selectors and endpoints
7. **Sample** (07_sample): Test scraping on small dataset
8. **Fetch** (08_fetch): Download all target pages
9. **Scrape** (09_scrape): Extract structured data
10. **Dedupe** (10_dedupe): Remove duplicates
11. **Clean** (11_clean): Standardize and validate data
12. **Load** (12_load): Import to database
13. **QC** (13_qc): Quality control and validation
14. **Refresh** (14_refresh): Incremental updates

## Database Schema Key Points

### Primary Tables
- **users**: Discord-based authentication (discord_id as unique identifier)
- **motorcycles**: Vehicle catalog (year, make, model, category, engine)
- **ownerships**: User-motorcycle relationships with timeline
- **timeline_events**: Activity feed (rides, maintenance, modifications)
- **servers**: Discord server integration and configuration

### Data Patterns
- **UUIDs**: All primary keys use UUID type
- **Timestamps**: All tables have created_at/updated_at with timezone
- **JSONB**: Flexible data storage for specifications and metadata
- **References**: Foreign keys maintain data integrity

## Development Workflow

### Adding New Website Pages
1. Read the mandatory architecture documentation first
2. Create folder structure: `src/category/category-page-name/`
3. Use hyperspecific naming for all files and CSS classes
4. Copy (don't reference) any needed components
5. Test in isolation to ensure self-containment

### Working with Database
1. Check existing schema in `database/migrations/`
2. Use existing tables/fields when possible
3. Create migrations following numbered pattern: `00000X_description.up/down.sql`
4. Test migrations on development database first

### Discord Bot Development
1. Commands go in `discord-bot/commands/` directory
2. Use existing data manager patterns from `utils/`
3. Test with development Discord server before production
4. Claude integration uses JSON file message passing

### Scraping New Data Sources
1. Follow the 14-step pipeline in `scrapers/crawl-scrape-pipeline/`
2. Test individual steps before running full pipeline
3. Validate data quality before database import
4. Update documentation with new data sources

## Data Storage Patterns

### PostgreSQL Usage
- Primary database for structured data (users, motorcycles, timeline events)
- JSONB fields for flexible specifications and metadata
- UUID primary keys with proper foreign key relationships
- Timezone-aware timestamps for all date/time data

### File-Based Storage
- JSON files for Discord bot message passing (`discord-bot/data/claude/`)
- CSV/JSON files for scraping pipeline outputs
- Static assets in website `src/` folders (self-contained)

### Redis Caching
- Available for API response caching
- Session storage and rate limiting
- Real-time features (when implemented)

## Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/bikenode

# Discord Bot
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# API Configuration
PORT=8080
CORS_ORIGINS=http://localhost:8081
```

### Development Dependencies
- **Go 1.21+** for API server
- **Node.js** for Eleventy frontend
- **Python 3.x** for Discord bot and scrapers
- **PostgreSQL** for database
- **Redis** (optional, for caching)

## Code Quality Standards

### Website Pages
- Follow self-contained architecture strictly
- Use hyperspecific naming for all CSS/JS/IDs
- No placeholders or Lorem ipsum content
- Verify all links and check for existing files before creating

### Go Code
- Follow standard Go conventions
- Use structured logging
- Handle errors explicitly
- Use context for database operations

### Python Code
- Follow PEP 8 style guidelines
- Use type hints where possible
- Async/await for I/O operations
- Proper error handling and logging

## Testing Approaches

### Website Testing
```bash
npm run build              # Verify build completes without errors
```

### API Testing
```bash
cd website/api-server
go run main.go            # Start server and verify endpoints
```

### Discord Bot Testing
```bash
cd discord-bot
python -m pytest tests/  # Run bot test suite
```

### Pipeline Testing
```bash
cd scrapers/crawl-scrape-pipeline
python test_crawler.py   # Test individual components
```

## Common Integration Points

### Website ↔ API
- Frontend builds static files, API serves dynamic data
- CORS configured for localhost development
- API endpoints follow RESTful conventions

### Discord Bot ↔ Database
- Bot reads/writes user and motorcycle data
- Server configurations stored in database
- Timeline events can be shared to Discord servers

### Scraping ↔ Database
- Pipeline outputs feed motorcycle and specification tables
- Quality control validates data before import
- Incremental updates maintain data freshness

### Claude Code Integration
- Discord bot uses file-based message passing with Claude
- JSON files in `discord-bot/data/claude/` for communication
- HTTP server in `claude_server.py` for webhook integration

## Security Considerations

- **No API keys in code**: Use environment variables
- **Database credentials**: Environment variables only
- **Discord tokens**: Environment variables only
- **User data**: Respect privacy settings and permissions
- **Input validation**: Sanitize all user inputs

## Deployment Architecture

### Development
- Go API server on port 8080
- Eleventy dev server on port 8081 with hot reload
- PostgreSQL local instance
- Discord bot connects to development server

### Production Considerations
- Static site deployment (Netlify/Vercel compatible)
- Go binary deployment for API
- PostgreSQL instance with proper backup strategy
- Discord bot deployment with uptime monitoring