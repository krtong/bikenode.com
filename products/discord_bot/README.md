# BikeNode Discord Bot

A powerful Discord bot for motorcycle enthusiasts and communities. This bot provides motorcycle lookup capabilities, server management, and integration with the BikeNode platform.

## Features

- **Motorcycle Database**: Search for motorcycles by make, model, and year
- **Role Management**: Automatically assign roles based on users' motorcycles
- **Server Management**: Commands for server administrators
- **BikeNode API Integration**: Connect with the BikeNode platform
- **Webhook Support**: Receive and process external events

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

## Commands

### Motorcycle Commands
- `!bike search <query>` - Search the motorcycle database
- `!bike stats` - View statistics about the motorcycle database
- `!bike compare <bike1> <bike2>` - Compare two motorcycles
- `!bike help` - Display motorcycle command help

### Server Management Commands
- `!bike role <role>` - Assign or remove a role
- `!bike rolesetup` - Set up automatic role assignment (admin only)
- `!bike config` - Configure bot settings (admin only)

### Other Commands
- `!bike story` - Generate a random motorcycle story
- `!bike help` - Display general help information

## Environment Variables

The bot uses the following environment variables:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `BIKENODE_API_KEY` - API key for BikeNode platform integration
- `DATABASE_URL` - Database connection string (if applicable)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
