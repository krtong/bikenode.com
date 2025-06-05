#!/bin/bash
echo "🚀 Starting Claude Chatbot System..."
echo "This will start both the Claude server and Discord bot"
echo "===================================="

# Start Claude server in background
echo "Starting Claude server..."
/usr/bin/python3 claude_server.py &
SERVER_PID=$!
echo "Claude server started (PID: $SERVER_PID)"

# Wait a moment for server to start
sleep 2

# Start Discord bot
echo "Starting Discord bot..."
./start_bot.sh

# When bot exits, kill the server
echo "Shutting down Claude server..."
kill $SERVER_PID