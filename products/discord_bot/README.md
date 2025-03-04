# BikeNode Discord Bot

## Setup and Local Testing

1. Install the required dependencies:
```bash
pip install discord.py python-dotenv
```

2. Create a `.env` file in the project root with your Discord bot token:
```
DISCORD_BOT_TOKEN=your_discord_bot_token
BIKENODE_API_KEY=your_bikenode_api_key
```

3. Run the bot:
```bash
python bot.py
```

## Getting a Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" tab and click "Add Bot"
4. Copy the token and add it to your `.env` file
5. Under the "OAuth2" tab, generate an invite URL with the "bot" scope and required permissions
6. Use the URL to invite your bot to your test server
