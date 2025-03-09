# BikeNode Discord Bot

A powerful Discord bot for motorcycle enthusiasts and communities. This bot provides motorcycle lookup capabilities, server management, and integration with the BikeNode platform.

## Features

- **Motorcycle Database**: Search for motorcycles by make, model, and year
- **Role Management**: Automatically assign roles based on users' motorcycles
- **Server Management**: Commands for server administrators
- **BikeNode API Integration**: Connect with the BikeNode platform
- **Webhook Support**: Receive and process external events

## Project Structure

```
discord_bot/
├── api/                # API integration modules
│   ├── bikenode_client.py
│   └── webhook_handler.py
├── commands/           # Bot command modules
│   ├── bike.py         # Motorcycle lookup commands
│   ├── server_management.py
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
├── bot.py              # Main bot initialization
├── .env                # Environment variables
└── README.md           # This file
```

## Setup Instructions

1. **Install Dependencies**

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install required packages
pip install discord.py pyyaml pandas python-dotenv
```

2. **Configuration**

- Copy `.env.example` to `.env` and fill in your Discord Bot Token
- Review and update `config/config.yaml` as needed

3. **Running the Bot**

```bash
python bot.py
```

## Available Commands

### Motorcycle Commands
- `!bike search <query>` - Search the motorcycle database
- `!bike stats` - View statistics about the motorcycle database
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
