#!/usr/bin/env python3
"""
Simple script to read Discord messages for Claude
"""
import os

def read_messages():
    """Read messages from the queue"""
    if not os.path.exists('claude_messages.txt'):
        print("No messages yet.")
        return
    
    with open('claude_messages.txt', 'r') as f:
        lines = f.readlines()
    
    if not lines:
        print("No messages.")
        return
    
    print(f"=== {len(lines)} Messages ===\n")
    
    for i, line in enumerate(lines, 1):
        try:
            parts = line.strip().split('|', 4)
            if len(parts) >= 5:
                timestamp, channel_id, user_id, username, message = parts
                print(f"Message #{i}")
                print(f"From: {username}")
                print(f"Time: {timestamp}")
                print(f"Channel: {channel_id}")
                print(f"Message: {message}")
                print("-" * 50)
        except:
            print(f"Error parsing line: {line}")

if __name__ == "__main__":
    read_messages()