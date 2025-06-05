#!/usr/bin/env python3
"""
JSON-based script to read Discord messages for Claude
Handles all special characters properly
"""
import json
import os
from datetime import datetime

def read_messages():
    """Read messages from JSON file"""
    if not os.path.exists('claude_messages.json'):
        print("No messages file found.")
        return
    
    try:
        with open('claude_messages.json', 'r') as f:
            messages = json.load(f)
    except json.JSONDecodeError:
        print("Error reading messages file (invalid JSON)")
        return
    except Exception as e:
        print(f"Error: {e}")
        return
    
    if not messages:
        print("No messages.")
        return
    
    # Filter for pending messages
    pending = [m for m in messages if not m.get('responded', False)]
    
    if pending:
        print(f"=== {len(pending)} Pending Messages ===\n")
        for msg in pending:
            print(f"Message ID: {msg['id']}")
            print(f"From: {msg['username']} (ID: {msg['user_id']})")
            print(f"Time: {msg['timestamp']}")
            print(f"Channel: {msg['channel_id']}")
            print(f"Message: {msg['message']}")
            print("-" * 50)
    else:
        print("No pending messages.")
    
    # Show summary
    print(f"\nTotal messages: {len(messages)}")
    print(f"Pending: {len(pending)}")
    print(f"Responded: {len(messages) - len(pending)}")

def read_all_messages():
    """Read all messages regardless of status"""
    if not os.path.exists('claude_messages.json'):
        print("No messages file found.")
        return
    
    with open('claude_messages.json', 'r') as f:
        messages = json.load(f)
    
    print(f"=== All {len(messages)} Messages ===\n")
    for msg in messages:
        status = "✅" if msg.get('responded', False) else "⏳"
        print(f"{status} Message ID: {msg['id']}")
        print(f"   From: {msg['username']}")
        print(f"   Time: {msg['timestamp']}")
        print(f"   Message: {msg['message'][:100]}{'...' if len(msg['message']) > 100 else ''}")
        print()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        read_all_messages()
    else:
        read_messages()