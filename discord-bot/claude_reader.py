#!/usr/bin/env python3
"""
Claude Message Reader
This script allows Claude to read messages from Discord users and add responses.
"""
import json
import os
import sys
from datetime import datetime

MESSAGES_FILE = "data/claude_messages.json"

def load_messages():
    """Load messages from file"""
    if not os.path.exists(MESSAGES_FILE):
        return []
    with open(MESSAGES_FILE, 'r') as f:
        return json.load(f)

def save_messages(messages):
    """Save messages to file"""
    os.makedirs("data", exist_ok=True)
    with open(MESSAGES_FILE, 'w') as f:
        json.dump(messages, f, indent=2)

def show_pending():
    """Show all pending messages"""
    messages = load_messages()
    pending = [m for m in messages if not m['responded']]
    
    if not pending:
        print("✅ No pending messages!")
        return
    
    print(f"\n📨 {len(pending)} pending message(s):\n")
    for msg in pending:
        print(f"Message #{msg['id']}")
        print(f"From: {msg['user']}")
        print(f"Time: {msg['timestamp']}")
        print(f"Message: {msg['message']}")
        print("-" * 50)

def add_response(message_id, response):
    """Add a response to a message"""
    messages = load_messages()
    
    for msg in messages:
        if msg['id'] == message_id:
            msg['responded'] = True
            msg['response'] = response
            msg['response_time'] = datetime.now().isoformat()
            save_messages(messages)
            print(f"✅ Response added to message #{message_id}")
            return True
    
    print(f"❌ Message #{message_id} not found!")
    return False

def main():
    if len(sys.argv) == 1:
        # No arguments - show pending messages
        show_pending()
    elif len(sys.argv) == 2 and sys.argv[1] == "pending":
        show_pending()
    elif len(sys.argv) >= 3 and sys.argv[1] == "respond":
        # respond <id> <response>
        try:
            msg_id = int(sys.argv[2])
            response = " ".join(sys.argv[3:])
            add_response(msg_id, response)
        except ValueError:
            print("❌ Invalid message ID!")
    else:
        print("Usage:")
        print("  python claude_reader.py              - Show pending messages")
        print("  python claude_reader.py pending      - Show pending messages")
        print("  python claude_reader.py respond <id> <response> - Add response")

if __name__ == "__main__":
    main()