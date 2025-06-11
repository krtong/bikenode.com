# Discord Bot Data Directory

This directory contains data files used by the Discord bot.

## Structure

- `bikedata/` - Motorcycle data files
  - `motorcycles.csv` - Main motorcycle database
- `claude/` - Claude integration data files (JSON format)
  - `claude_messages.json` - Message queue
  - `claude_responses.json` - Response queue
  - `messages.json` - Message history
  - `responses.json` - Response history
- `motorcycle_database.csv` - Legacy motorcycle data (consider removing)
- `motorcycle_specs.db` - SQLite database for motorcycle specifications
- `bikes.db` - Symlink to main bikes database

## Notes

- All Claude integration now uses JSON format (text files have been removed)
- The bot uses `claude_messages.json` and `claude_responses.json` in the root directory for active operations
- Files in the `claude/` subdirectory are for archival/backup purposes