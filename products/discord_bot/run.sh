#!/bin/bash

echo "=== BikeNode Discord Bot Runner ==="

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Set SSL environment variables if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Setting SSL environment variables for macOS..."
    # Use certifi's certificate path
    CERT_PATH=$(python -c "import certifi; print(certifi.where())")
    export SSL_CERT_FILE=$CERT_PATH
    export REQUESTS_CA_BUNDLE=$CERT_PATH
    export NODE_EXTRA_CA_CERTS=$CERT_PATH
    
    echo "SSL_CERT_FILE=$SSL_CERT_FILE"
fi

# Run the bot
echo "Starting bot..."
python bot.py
