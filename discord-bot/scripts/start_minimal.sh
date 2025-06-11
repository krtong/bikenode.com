#!/bin/bash
# Minimal bot startup script

echo "🚀 Starting Minimal Discord Bot (Claude only)..."
echo "Press Ctrl+C to stop the bot"
echo "=================================="

cd "$(dirname "$0")"
/usr/bin/python3 bot_minimal.py