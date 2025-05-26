#!/bin/bash

echo "Setting up BikeNode Discord Bot environment..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
echo "Installing requirements..."
pip install -r requirements.txt

# Fix SSL certificates (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Running SSL fix for macOS..."
    python fix_ssl.py
    
    # Source the SSL environment variables
    source ./set_ssl_env.sh
fi

# Create necessary directories
mkdir -p data/bikedata

echo ""
echo "Setup complete! To start the bot:"
echo "1. Make sure your .env file contains DISCORD_BOT_TOKEN"
echo "2. Activate the virtual environment: source venv/bin/activate"
echo "3. Run the bot: python bot.py"
