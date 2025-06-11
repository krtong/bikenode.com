#!/bin/bash
# Simple bot startup script

echo "🚀 Starting Discord Bot..."
echo "Press Ctrl+C to stop the bot"
echo "Bot will show connection status below:"
echo "=================================="

cd "$(dirname "$0")"
/usr/bin/python3 launch.py