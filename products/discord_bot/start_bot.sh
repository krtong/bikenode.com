#!/bin/bash

echo "=== BikeNode Discord Bot Runner ==="

# Make sure SSL is configured
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Running on macOS, configuring SSL..."
    
    # Check if fix_ssl.py exists and run it if needed
    if [ -f "fix_ssl.py" ]; then
        # Run fix_ssl.py and source the environment variables it creates
        python fix_ssl.py
        if [ -f "set_ssl_env.sh" ]; then
            source set_ssl_env.sh
        fi
    else
        # Manual SSL setup if fix_ssl.py isn't available
        CERT_PATH=$(python -c "import certifi; print(certifi.where())")
        export SSL_CERT_FILE=$CERT_PATH
        export REQUESTS_CA_BUNDLE=$CERT_PATH
        export NODE_EXTRA_CA_CERTS=$CERT_PATH
        echo "SSL_CERT_FILE=$SSL_CERT_FILE"
    fi
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Run the bot with error handling
echo "Starting bot..."
python bot.py

# If the bot exits with an error code
if [ $? -ne 0 ]; then
    echo "Bot exited with an error. Check the logs for details."
    echo "If you're having SSL certificate issues, run: python fix_ssl.py"
    echo "If you're having CSV parsing issues, run: python fix_csv.py"
fi
