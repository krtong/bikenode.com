#!/usr/bin/env python3
"""
Simple script for Claude to read Discord messages
"""
import json
import sys

def read_queue():
    """Read pending messages from the queue"""
    try:
        with open('claude_queue.json', 'r') as f:
            queue = json.load(f)
        
        pending = [m for m in queue.values() if m.get("status") == "pending"]
        
        if not pending:
            print("No pending messages.")
            return
        
        print(f"=== {len(pending)} Pending Messages ===\n")
        
        for msg in pending:
            print(f"ID: {msg['id']}")
            print(f"From: {msg['user']}")
            print(f"Time: {msg['timestamp']}")
            print(f"Message: {msg['message']}")
            print("-" * 50 + "\n")
            
    except FileNotFoundError:
        print("No messages yet. The queue file doesn't exist.")
    except Exception as e:
        print(f"Error reading messages: {e}")

if __name__ == "__main__":
    read_queue()