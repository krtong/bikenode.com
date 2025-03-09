import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Discord Bot Token (obtain from Discord Developer Portal)
# Set this in environment variable or .env file
DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")

# Discord Bot Prefix for commands
BOT_PREFIX = os.getenv("BOT_PREFIX", "!bike ")

# Path to motorcycles data
MOTORCYCLES_CSV_PATH = os.path.join(os.path.dirname(__file__), "data/bikedata/motorcycles.csv")

# Styling for embeds
EMBED_COLOR = 0x3498db  # Blue color for embeds

# Error messages
ERROR_MESSAGES = {
    "not_found": "Sorry, I couldn't find any motorcycles matching that query.",
    "invalid_input": "Please provide a valid search term.",
    "no_data": "I couldn't access the motorcycle database. Please try again later.",
}

# Bot status/activity message
BOT_STATUS = "Vrooom! 🏍️"

# Maximum results to show in search
MAX_SEARCH_RESULTS = 15
